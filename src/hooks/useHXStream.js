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

import { useState, useRef, useCallback, useEffect } from "react";
import { HX_EVENT_TYPES, eventToStepState } from "../types/hxEvents";
import { STEP_NAMES } from "../components/hx/HXPanel";

// Direct HX Engine URL for dev (EventSource must go straight to the engine,
// not through the backend). Empty in prod → nginx routes /api/v1/hx/... correctly.
const HX_ENGINE_BASE = import.meta.env.VITE_HX_ENGINE_URL || "";

// Map HX Engine internal enum values (stored in MongoDB) to the display strings
// the frontend uses.  SSE events carry APPROVED/CORRECTED; restored records
// carry PROCEED/CORRECT/WARN/ESCALATE (AIDecisionEnum).
const AI_DECISION_MAP = {
  PROCEED: "APPROVED",
  CORRECT: "CORRECTED",
  WARN: "WARNING",
  ESCALATE: "ESCALATED",
  // Pass-through for values already in display form
  APPROVED: "APPROVED",
  CORRECTED: "CORRECTED",
  WARNING: "WARNING",
  ESCALATED: "ESCALATED",
  ERROR: "ERROR",
};

/**
 * Synthesize a design result from persisted step records.
 * Called when restoring after page refresh — hx_steps are only persisted
 * after is_complete=True, so this always represents a finished pipeline.
 */
function synthesizeDesignResult(hxSteps) {
  // Merge all step outputs into one flat dict (later steps overwrite earlier)
  const outputs = {};
  for (const r of hxSteps) {
    Object.assign(outputs, r.outputs || {});
  }

  // Approximate confidence from step AI decisions
  const weights = {
    PROCEED: 1,
    APPROVED: 1,
    CORRECT: 0.7,
    CORRECTED: 0.7,
    WARN: 0.5,
    WARNING: 0.5,
    ESCALATE: 0.3,
    ESCALATED: 0.3,
    ERROR: 0,
  };
  const scores = hxSteps.map((r) => weights[r.ai_decision] ?? 0.8);
  const confidence =
    scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.8;

  return {
    pipeline_status: "completed",
    confidence,
    U_W_m2K: outputs.U_W_m2K ?? null,
    A_m2: outputs.A_m2 ?? null,
    Q_W: outputs.Q_W ?? null,
    LMTD_K: outputs.LMTD_K ?? null,
    tema_type: outputs.tema_type ?? null,
    overdesign_pct: outputs.overdesign_pct ?? null,
    dP_shell: outputs.dP_shell ?? null,
    dP_tube: outputs.dP_tube ?? null,
    dP_shell_limit: outputs.dP_shell_limit ?? null,
    dP_tube_limit: outputs.dP_tube_limit ?? null,
    cost_usd: outputs.cost_usd ?? null,
    vibration_safe: outputs.vibration_safe ?? null,
  };
}

/**
 * Convert a persisted StepRecord (from MongoDB via /context) into the shape
 * useHXStream uses for each step entry.
 *
 * StepRecord fields: step_id, step_name, duration_s, ai_decision, outputs,
 *   ai_review { reasoning, corrections, warnings, recommendation, options }
 */
function stepRecordToEntry(record, stepNames) {
  const stepId = record.step_id;
  const rawState =
    record.ai_decision || (record.validation_passed ? "PROCEED" : "ERROR");
  const state = AI_DECISION_MAP[rawState] ?? "APPROVED";
  const aiReview = record.ai_review || {};

  // Build the `data` payload that CardBody/OutputsTable/Reasoning use
  const data = {
    outputs: record.outputs || {},
    reasoning: aiReview.reasoning || aiReview.observation || "",
  };

  if (state === "CORRECTED" && aiReview.corrections?.length) {
    const first = aiReview.corrections[0];
    data.from = String(first.old_value ?? "");
    data.to = String(first.new_value ?? "");
    data.why = first.reason || "";
  }

  if (state === "WARNING") {
    // Short one-liner above the KV table; reasoning goes in the collapsible section.
    data.message =
      aiReview.recommendation ||
      aiReview.observation ||
      record.warnings?.[0] ||
      "";
  }

  return {
    step: stepId,
    name: record.step_name ?? stepNames[stepId - 1] ?? `Step ${stepId}`,
    state,
    elapsed: record.duration_s ?? null,
    data,
    iteration: null,
  };
}

function makeInitialSteps() {
  return STEP_NAMES.map((name, i) => ({
    step: i + 1,
    name,
    state: "PENDING",
    elapsed: null,
    data: null,
    iteration: null,
  }));
}

export function useHXStream({ conversationId, currentContext } = {}) {
  const [steps, setSteps] = useState(makeInitialSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [designResult, setDesignResult] = useState(null);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  // Track the hx_session_id we last restored so we don't re-apply on every render
  const restoredSessionRef = useRef(null);

  // ── Internal step updater ──────────────────────────────────────────────────

  const updateStep = useCallback((stepId, patch) => {
    setSteps((prev) =>
      prev.map((s) => (s.step === stepId ? { ...s, ...patch } : s)),
    );
  }, []);

  // ── Event handler ──────────────────────────────────────────────────────────

  const handleEvent = useCallback(
    (eventType, data) => {
      if (eventType === HX_EVENT_TYPES.DESIGN_COMPLETE) {
        setDesignResult(data);
        setIsRunning(false);
        setCurrentStep(null);
        eventSourceRef.current?.close();
        return;
      }

      if (eventType === HX_EVENT_TYPES.ITERATION_PROGRESS) {
        // IterationProgressEvent fields: iteration_number, max_iterations,
        // delta_U_pct, constraints_met — map to StepCard's IterationProgress shape.
        // step_id is optional (Step 12 convergence loop will add it).
        if (data.step_id) {
          updateStep(data.step_id, {
            iteration: {
              current: data.iteration_number ?? 0,
              total: data.max_iterations ?? 20,
              deltaU: data.delta_U_pct ?? null,
              converged: data.constraints_met ?? false,
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

      // Duration: HX Engine emits duration_ms (integer milliseconds).
      // StepCard displays it as seconds with one decimal place.
      const elapsed = data.duration_ms != null ? data.duration_ms / 1000 : null;

      // Build state-specific data payload normalised for StepCard.
      let patchData = { ...data };

      if (newState === "ESCALATED") {
        // StepEscalatedEvent: { message, options }
        // StepCard's EscalatedBody reads data.question (not data.message).
        if (patchData.message && !patchData.question) {
          patchData.question = patchData.message;
        }
      } else if (newState === "CORRECTED") {
        // StepCorrectedEvent.correction is a dict: { fieldName: { old, new }, ... }
        // e.g. { "tube_diameter": { "old": 0.025, "new": 0.020 } }
        // StepCard reads data.from / data.to / data.why.
        const entries = Object.entries(data.correction || {});
        if (entries.length > 0) {
          const [field, vals] = entries[0];
          patchData.from = `${field}: ${vals.old ?? ""}`;
          patchData.to = `${field}: ${vals.new ?? ""}`;
        }
        // why comes from the AI's reasoning
        patchData.why = data.reasoning || "";
      } else if (newState === "WARNING") {
        // StepWarningEvent fields: warning_message (short), reasoning (full AI text),
        // user_summary, outputs.  StepCard reads data.message + data.reasoning.
        patchData.message = data.warning_message || data.user_summary || "";
        patchData.reasoning = data.reasoning || "";
        patchData.outputs = data.outputs || {};
      }

      // Ensure reasoning + outputs are always available for CardBody
      if (!patchData.reasoning && data.reasoning) {
        patchData.reasoning = data.reasoning;
      }
      if (!patchData.outputs && data.outputs) {
        patchData.outputs = data.outputs;
      }

      setCurrentStep((prev) => (prev === stepId ? null : prev));
      updateStep(stepId, {
        state: newState,
        elapsed,
        data: patchData,
      });
    },
    [updateStep],
  );

  // ── Connect real EventSource ───────────────────────────────────────────────

  const connectStream = useCallback(
    (streamUrl, newSessionId) => {
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

      Object.values(HX_EVENT_TYPES).forEach((eventType) => {
        es.addEventListener(eventType, (e) => {
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
    },
    [handleEvent],
  );

  // ── Respond to an ESCALATED step ──────────────────────────────────────────

  const respondToEscalation = useCallback(
    async (sid, response) => {
      const id = sid ?? sessionId;
      if (!id) {
        console.error(
          "[useHXStream] respondToEscalation called with no sessionId",
        );
        return;
      }
      // The respond endpoint lives on the HX Engine, not the backend.
      // Using HX_ENGINE_BASE ensures the request reaches the correct service.
      try {
        const res = await fetch(
          `${HX_ENGINE_BASE}/api/v1/hx/design/${id}/respond`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // HX Engine UserResponse schema: { type, values: { user_input } }
            body: JSON.stringify({
              type: "override",
              values: { user_input: response },
            }),
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => res.status);
          console.error(
            `[useHXStream] respondToEscalation failed (${res.status}):`,
            text,
          );
          setError(
            `Failed to send response (${res.status}). Please try again.`,
          );
        }
      } catch (err) {
        console.error("[useHXStream] respondToEscalation network error:", err);
        setError(
          "Network error sending response. Please check your connection.",
        );
      }
    },
    [sessionId],
  );

  // ── Reset on conversation change ───────────────────────────────────────────
  // Always clear the restore guard so the next context load re-applies the
  // correct session's steps. Without this, switching A→B→A would leave
  // restoredSessionRef pointing at A's session from a previous restore,
  // making the restore effect bail out on the return visit to A.

  useEffect(() => {
    // Clear the restore guard unconditionally so the restore effect always
    // runs fresh for whatever context the new conversation provides.
    restoredSessionRef.current = null;

    if (!conversationId) {
      eventSourceRef.current?.close();
      setSteps(makeInitialSteps());
      setIsRunning(false);
      setCurrentStep(null);
      setSessionId(null);
      setDesignResult(null);
      setError(null);
    } else {
      // Switching to a different conversation: reset steps immediately so the
      // panel shows the pending/loading state while context fetches, rather than
      // showing stale data from the previous conversation's live SSE stream.
      setSteps(makeInitialSteps());
    }
  }, [conversationId]);

  // ── Restore persisted step records after page refresh ─────────────────────
  // Depends on hx_session_id (not just conversationId) so it fires only once
  // the backend has written the session ID into the conversation context.

  useEffect(() => {
    const hxSessionId = currentContext?.hx_session_id;
    const hxSteps = currentContext?.hx_steps;

    // Nothing to restore, or already restored this session
    if (!hxSessionId || !hxSteps?.length) return;
    if (restoredSessionRef.current === hxSessionId) return;
    // Don't overwrite an active live stream
    if (isRunning) return;

    restoredSessionRef.current = hxSessionId;
    setSessionId(hxSessionId);

    setSteps((prev) => {
      const restored = new Map(
        hxSteps.map((r) => [r.step_id, stepRecordToEntry(r, STEP_NAMES)]),
      );
      return prev.map((s) => restored.get(s.step) ?? s);
    });

    // Restore the design summary so DesignSummary renders after page refresh
    setDesignResult(synthesizeDesignResult(hxSteps));
  }, [currentContext?.hx_session_id, currentContext?.hx_steps, isRunning]);

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
