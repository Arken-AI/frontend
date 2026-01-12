/**
 * SSE Event Handlers
 *
 * Maps SSE event types to chat state actions.
 */

import { ACTIONS } from "../hooks/useChatState";

/**
 * Handle incoming SSE event and dispatch appropriate action
 * @param {Object} event - SSE event object
 * @param {function} dispatch - Dispatch function from useChatState
 */
export function handleSSEEvent(event, dispatch) {
  console.log("[Event]", event.event_type, event);

  switch (event.event_type) {
    case "thinking_start":
      dispatch({ type: ACTIONS.THINKING_START });
      break;

    case "thinking_end":
      dispatch({
        type: ACTIONS.THINKING_END,
        payload: { duration_ms: event.duration_ms },
      });
      break;

    case "tool_start":
      dispatch({
        type: ACTIONS.TOOL_START,
        payload: {
          tool_name: event.tool_name,
          arguments: event.arguments,
          estimated_duration_ms: event.estimated_duration_ms,
        },
      });
      break;

    case "tool_end":
      dispatch({
        type: ACTIONS.TOOL_END,
        payload: {
          tool_name: event.tool_name,
          status: event.status,
          duration_ms: event.duration_ms,
          summary: event.summary,
          error_message: event.error_message,
          result_id: event.result_id,
        },
      });
      break;

    case "run_progress":
      dispatch({
        type: ACTIONS.RUN_PROGRESS,
        payload: {
          stage: event.stage,
          percentage: event.percentage,
          message: event.message,
          current_block: event.current_block,
          total_blocks: event.total_blocks,
        },
      });
      break;

    case "message_delta":
      dispatch({
        type: ACTIONS.MESSAGE_DELTA,
        payload: {
          delta: event.delta,
          accumulated_length: event.accumulated_length,
        },
      });
      break;

    case "message_final":
      dispatch({
        type: ACTIONS.MESSAGE_FINAL,
        payload: {
          content: event.content,
          role: event.role,
          metadata: event.metadata,
        },
      });
      // Only stop streaming if this is NOT an intermediate message
      // Intermediate messages (before tool calls) have is_intermediate: true
      if (!event.metadata?.is_intermediate) {
        dispatch({ type: ACTIONS.SET_STREAMING, payload: false });
        dispatch({ type: ACTIONS.SET_THINKING, payload: false });
      }
      break;

    case "app_error":
      dispatch({
        type: ACTIONS.APP_ERROR,
        payload: {
          error_type: event.error_type,
          error_message: event.error_message,
          details: event.details,
          recoverable: event.recoverable,
        },
      });
      break;

    default:
      console.warn("[Event] Unknown event type:", event.event_type);
  }
}

/**
 * Create event handlers object for useSSE hook
 * @param {function} dispatch - Dispatch function from useChatState
 * @returns {Object} - Object with event type handlers
 */
export function createEventHandlers(dispatch) {
  return {
    onMessage: (event) => handleSSEEvent(event, dispatch),
    onError: (error) => {
      console.error("[SSE] Error:", error);
      dispatch({
        type: ACTIONS.APP_ERROR,
        payload: {
          error_type: "stream_error",
          error_message: error.message || "Stream connection error",
          recoverable: true,
        },
      });
    },
    onOpen: () => {
      console.log("[SSE] Connection opened");
    },
    onClose: () => {
      console.log("[SSE] Connection closed");
    },
  };
}
