/**
 * useHXStream — manages the HX Engine SSE stream.
 *
 * Returns data in the shape HXPanel expects:
 *   steps[]       { step, name, state, elapsed, data, iteration }
 *   currentStep   number | null  (step number currently RUNNING)
 *   sessionId     string | null  (HX Engine session identifier)
 *   isRunning     boolean
 *   designResult  object | null
 *   error         string | null
 *
 * Flow (real mode):
 *   1. Backend emits hx_design_started SSE event with { session_id, stream_url }
 *   2. ChatContainer calls connectStream(streamUrl, sessionId)
 *   3. Hook opens EventSource to HX Engine, updates steps on each event
 *   4. DESIGN_COMPLETE → sets designResult, closes stream
 */

import { useState, useRef, useCallback } from "react";
import { HX_EVENT_TYPES, eventToStepState } from "../types/hxEvents";
import { STEP_NAMES } from "../components/hx/HXPanel";

// Direct HX Engine URL for dev (EventSource must go straight to the engine,
// not through the backend). Empty in prod → nginx routes /api/v1/hx/... correctly.
const HX_ENGINE_BASE = import.meta.env.VITE_HX_ENGINE_URL || "";

// Backend API base for escalation responses
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

function makeInitialSteps() {
  return STEP_NAMES.map((name, i) => ({
    step:      i + 1,
    name,
    state:     "PENDING",
    elapsed:   null,
    data:      null,
    iteration: null,
  }));
}

export function useHXStream() {
  const [steps,        setSteps]        = useState(makeInitialSteps);
  const [isRunning,    setIsRunning]    = useState(false);
  const [currentStep,  setCurrentStep]  = useState(null);
  const [sessionId,    setSessionId]    = useState(null);
  const [designResult, setDesignResult] = useState(null);
  const [error,        setError]        = useState(null);
  const eventSourceRef = useRef(null);

  // ── Internal step updater ──────────────────────────────────────────────────

  const updateStep = useCallback((stepId, patch) => {
    setSteps(prev =>
      prev.map(s => s.step === stepId ? { ...s, ...patch } : s)
    );
  }, []);

  // ── Event handler ──────────────────────────────────────────────────────────

  const handleEvent = useCallback((eventType, data) => {
    if (eventType === HX_EVENT_TYPES.DESIGN_COMPLETE) {
      setDesignResult(data);
      setIsRunning(false);
      setCurrentStep(null);
      eventSourceRef.current?.close();
      return;
    }

    if (eventType === HX_EVENT_TYPES.ITERATION_PROGRESS) {
      if (data.step_id) {
        updateStep(data.step_id, {
          iteration: {
            current:   data.current,
            total:     data.total,
            deltaU:    data.delta_u,
            converged: data.converged,
          },
        });
      }
      return;
    }

    const stepId = data.step_id;
    if (!stepId) return;

    const newState = eventToStepState(eventType);

    if (newState === "RUNNING") {
      setCurrentStep(stepId);
      updateStep(stepId, { state: "RUNNING", elapsed: null, data: null });
      return;
    }

    // Terminal state — record elapsed time and payload.
    // For ESCALATED: HX Engine emits { message, ... }; StepCard reads data.question.
    // Map message → question here so StepCard gets the right field.
    const patchData =
      newState === "ESCALATED" && data.message && !data.question
        ? { ...data, question: data.message }
        : data;

    setCurrentStep(prev => (prev === stepId ? null : prev));
    updateStep(stepId, {
      state:   newState,
      elapsed: data.elapsed_s ?? null,
      data:    patchData,
    });
  }, [updateStep]);

  // ── Connect real EventSource ───────────────────────────────────────────────

  const connectStream = useCallback((streamUrl, newSessionId) => {
    eventSourceRef.current?.close();

    setSteps(makeInitialSteps());
    setIsRunning(true);
    setCurrentStep(null);
    setSessionId(newSessionId ?? null);
    setDesignResult(null);
    setError(null);

    // URL resolution:
    // - absolute URL (starts with http/https) → use as-is
    // - relative URL → prepend VITE_HX_ENGINE_URL (dev) or leave relative (prod/nginx)
    const fullUrl = streamUrl.startsWith("http")
      ? streamUrl
      : `${HX_ENGINE_BASE}${streamUrl}`;

    const es = new EventSource(fullUrl);
    eventSourceRef.current = es;

    Object.values(HX_EVENT_TYPES).forEach(eventType => {
      es.addEventListener(eventType, e => {
        try {
          handleEvent(eventType, JSON.parse(e.data));
        } catch (err) {
          console.error("[useHXStream] Failed to parse SSE event:", err);
        }
      });
    });

    es.onerror = () => {
      console.error("[useHXStream] SSE connection error");
      setError("Connection lost. Please refresh.");
      setIsRunning(false);
      es.close();
    };
  }, [handleEvent]);

  // ── Respond to an ESCALATED step ──────────────────────────────────────────

  const respondToEscalation = useCallback(async (sid, response) => {
    const id = sid ?? sessionId;
    if (!id) {
      console.error("[useHXStream] respondToEscalation called with no sessionId");
      return;
    }
    await fetch(`${API_BASE}/v1/hx/design/${id}/respond`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      // HX Engine UserResponse schema: { type, values: { user_input } }
      body: JSON.stringify({ type: "override", values: { user_input: response } }),
    });
  }, [sessionId]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    eventSourceRef.current?.close();
    setSteps(makeInitialSteps());
    setIsRunning(false);
    setCurrentStep(null);
    setSessionId(null);
    setDesignResult(null);
    setError(null);
  }, []);

  return {
    steps,
    isRunning,
    currentStep,
    sessionId,
    designResult,
    error,
    connectStream,
    reset,
    respondToEscalation,
  };
}
