/**
 * useHXStream — manages the HX Engine SSE stream.
 *
 * Returns data in the shape HXPanel expects:
 *   steps[]     { step, name, state, elapsed, data, iteration }
 *   currentStep number | null  (step number currently RUNNING)
 *   isRunning   boolean
 *   designResult object | null
 *   error       string | null
 *
 * Flow (real mode):
 *   1. Caller POSTs to backend → gets { stream_url }
 *   2. Caller passes stream_url to connectStream()
 *   3. Hook opens EventSource, updates steps on each HX event
 *   4. DESIGN_COMPLETE → sets designResult, closes stream
 *
 * Dev / stub mode:
 *   Import mockHXStream from "../utils/mockSSE" and call startMock()
 *   to drive the same state machine with synthetic events.
 */

import { useState, useRef, useCallback } from "react";
import { HX_EVENT_TYPES, eventToStepState } from "../types/hxEvents";
import { STEP_NAMES } from "../components/hx/HXPanel";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

function makeInitialSteps() {
  return STEP_NAMES.map((name, i) => ({
    step:  i + 1,
    name,
    state: "PENDING",
    elapsed:   null,
    data:      null,
    iteration: null,
  }));
}

export function useHXStream() {
  const [steps,        setSteps]        = useState(makeInitialSteps);
  const [isRunning,    setIsRunning]    = useState(false);
  const [currentStep,  setCurrentStep]  = useState(null);
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
      // iteration_progress carries { step_id, current, total, deltaU, converged }
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

    // Terminal state — record elapsed time and payload
    setCurrentStep(prev => (prev === stepId ? null : prev));
    updateStep(stepId, {
      state:   newState,
      elapsed: data.elapsed_s ?? null,
      data:    data,
    });
  }, [updateStep]);

  // ── Connect real EventSource ───────────────────────────────────────────────

  const connectStream = useCallback((streamUrl) => {
    eventSourceRef.current?.close();

    setSteps(makeInitialSteps());
    setIsRunning(true);
    setCurrentStep(null);
    setDesignResult(null);
    setError(null);

    const fullUrl = streamUrl.startsWith("http")
      ? streamUrl
      : `${window.location.origin}${streamUrl}`;

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

  const respondToEscalation = useCallback(async (sessionId, response) => {
    await fetch(`${API_BASE}/v1/hx/design/${sessionId}/respond`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(response),
    });
  }, []);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    eventSourceRef.current?.close();
    setSteps(makeInitialSteps());
    setIsRunning(false);
    setCurrentStep(null);
    setDesignResult(null);
    setError(null);
  }, []);

  return {
    steps,
    isRunning,
    currentStep,
    designResult,
    error,
    connectStream,
    reset,
    respondToEscalation,
  };
}
