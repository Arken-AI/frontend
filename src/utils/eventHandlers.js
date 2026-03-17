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
  switch (event.event_type) {
    case "thinking_start":
      // Do NOT dispatch THINKING_START from SSE — the HTTP flow controls
      // isThinking via SET_THINKING(true) BEFORE the SSE connection opens.
      // Dispatching it here would be redundant (harmless) but we skip it
      // to keep the lifecycle clear: HTTP owns isThinking, SSE owns tools.
      break;

    case "thinking_end":
      // Do NOT dispatch THINKING_END from SSE — this would set isThinking=false
      // BEFORE the HTTP flow has dispatched ADD_MESSAGE, causing the live block
      // to disappear before tools are adopted onto the message.
      // The SSEClient resolves its `completed` promise on thinking_end instead,
      // and the HTTP flow dispatches SET_THINKING(false) after ADD_MESSAGE.
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
          result: event.result || null,
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

    case "agent_text":
      dispatch({
        type: ACTIONS.AGENT_TEXT,
        payload: { content: event.content, iteration: event.iteration },
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

    // Handle stream timeout gracefully
    case "stream_timeout":
      console.warn("[Event] Stream timeout:", event.message);
      // Just log it - response will come via HTTP
      break;

    // Handle generic errors sent via SSE
    case "error":
      console.error("[Event] Stream error:", event.message);
      dispatch({
        type: ACTIONS.APP_ERROR,
        payload: {
          error_type: "stream_error",
          error_message: event.message || "Stream error occurred",
          recoverable: true,
        },
      });
      break;

    default:
      console.warn("[Event] Unknown event type:", event.event_type);
  }
}
