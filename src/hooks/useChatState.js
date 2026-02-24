/**
 * Chat State Management Hook
 *
 * Manages all chat UI state including messages, thinking status,
 * active tool executions, and streaming text.
 */

import { useReducer } from "react";

// Initial state
const initialState = {
  messages: [], // Array of message objects
  isThinking: false, // Is LLM currently thinking?
  thinkingStartTime: null, // When thinking started (for duration)
  activeTool: null, // Currently executing tool { name, args, startTime }
  toolExecutions: [], // Completed tool executions
  runProgress: null, // Current simulation progress { stage, percentage, etc }
  error: null, // Current error message
};

// Action types
export const ACTIONS = {
  THINKING_START: "THINKING_START",
  THINKING_END: "THINKING_END",
  TOOL_START: "TOOL_START",
  TOOL_END: "TOOL_END",
  RUN_PROGRESS: "RUN_PROGRESS",
  APP_ERROR: "APP_ERROR",
  ADD_MESSAGE: "ADD_MESSAGE",
  ADD_USER_MESSAGE: "ADD_USER_MESSAGE",
  LOAD_MESSAGES: "LOAD_MESSAGES",
  RESET: "RESET",
  RESET_RESPONSE: "RESET_RESPONSE",
  SET_THINKING: "SET_THINKING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  CANCEL_REQUEST: "CANCEL_REQUEST",
};

// Reducer function
function chatReducer(state, action) {
  switch (action.type) {
    case ACTIONS.THINKING_START:
      console.log("[Reducer] THINKING_START");
      return {
        ...state,
        isThinking: true,
        thinkingStartTime: Date.now(),
        error: null,
      };

    case ACTIONS.THINKING_END:
      console.log("[Reducer] THINKING_END (from SSE)");
      return {
        ...state,
        isThinking: false,
        thinkingStartTime: null,
        activeTool: null, // Safety: clear orphan spinner if tool_end was missed
      };

    case ACTIONS.TOOL_START:
      console.log("[Reducer] TOOL_START:", action.payload.tool_name);
      return {
        ...state,
        activeTool: {
          name: action.payload.tool_name,
          args: action.payload.arguments,
          startTime: Date.now(),
          estimatedDuration: action.payload.estimated_duration_ms,
        },
      };

    case ACTIONS.TOOL_END:
      console.log(
        "[Reducer] TOOL_END:",
        action.payload.tool_name,
        action.payload.status,
        `toolExecutions count: ${state.toolExecutions.length + 1}`,
      );
      return {
        ...state,
        activeTool: null,
        toolExecutions: [
          ...state.toolExecutions,
          {
            name: action.payload.tool_name,
            status: action.payload.status,
            duration: action.payload.duration_ms,
            summary: action.payload.summary,
            error: action.payload.error_message,
            // Carry over arguments from the activeTool (set by TOOL_START)
            // so they survive into the message's toolExecutions array.
            args: state.activeTool?.args || null,
            timestamp: Date.now(),
          },
        ],
      };

    case ACTIONS.RUN_PROGRESS:
      return {
        ...state,
        runProgress: {
          stage: action.payload.stage,
          percentage: action.payload.percentage,
          message: action.payload.message,
          currentBlock: action.payload.current_block,
          totalBlocks: action.payload.total_blocks,
        },
      };

    case ACTIONS.APP_ERROR:
      return {
        ...state,
        error: {
          type: action.payload.error_type,
          message: action.payload.error_message,
          details: action.payload.details,
          recoverable: action.payload.recoverable,
        },
        isThinking: false,
        activeTool: null,
      };

    case ACTIONS.ADD_MESSAGE: {
      const incomingToolExecs = action.payload.tool_executions || [];
      // Build a lookup from the live SSE tool executions so we can merge
      // fields that the HTTP response doesn't carry (e.g. arguments).
      const sseByIndex = state.toolExecutions; // array in execution order
      console.log(
        "[Reducer] ADD_MESSAGE:",
        action.payload.role,
        `httpTools=${incomingToolExecs.length}`,
        `sseTools=${sseByIndex.length}`,
        `isThinking=${state.isThinking}`,
      );

      let toolExecsForMessage;
      if (incomingToolExecs.length > 0) {
        // HTTP response has tool_executions — use them as base but enrich
        // with any extra fields from the SSE-captured data.
        toolExecsForMessage = incomingToolExecs.map((t, i) => {
          const sseTool = sseByIndex[i]; // match by position
          return {
            tool_name: t.tool_name || t.name,
            status: t.status,
            duration_ms: t.duration_ms || t.duration,
            summary: t.summary || t.result_summary,
            error: t.error,
            // Merge arguments from SSE if the HTTP response didn't include them
            arguments: t.arguments || (sseTool ? sseTool.args : undefined),
          };
        });
      } else {
        // No HTTP tool_executions — adopt the live SSE cards entirely.
        toolExecsForMessage = sseByIndex.map((t) => ({
          tool_name: t.name,
          status: t.status,
          duration_ms: t.duration,
          summary: t.summary,
          error: t.error,
          arguments: t.args,
        }));
      }
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: action.payload.role,
            content: action.payload.content,
            timestamp: action.payload.timestamp || new Date().toISOString(),
            metadata: action.payload.metadata,
            run_ids: action.payload.run_ids,
            // Normalised array used by MessageList for inline rendering
            toolExecutions: toolExecsForMessage,
          },
        ],
        // Clear the global live list — ownership moves to the message
        toolExecutions: [],
        error: null,
      };
    }

    case ACTIONS.ADD_USER_MESSAGE:
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: "user",
            content: action.payload.message,
            timestamp: new Date().toISOString(),
          },
        ],
        error: null,
      };

    case ACTIONS.LOAD_MESSAGES:
      // Step 4.2: Load historical messages with proper formatting
      // Convert backend message format to frontend format
      const loadedMessages = action.payload.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
        metadata: msg.metadata,
        // Tool executions are stored per-message for historical display
        toolExecutions:
          msg.toolExecutions ||
          msg.tool_executions ||
          msg.metadata?.tool_executions ||
          [],
      }));

      return {
        ...state,
        messages: loadedMessages,
        // Clear state when loading historical messages
        isThinking: false,
        activeTool: null,
        toolExecutions: [],
        runProgress: null,
      };

    case ACTIONS.RESET:
      return {
        ...initialState,
      };

    case ACTIONS.RESET_RESPONSE:
      console.log(
        "[Reducer] RESET_RESPONSE (clearing live state for new turn)",
      );
      return {
        ...state,
        activeTool: null,
        toolExecutions: [], // Clear tool executions when starting new response
        runProgress: null,
        error: null,
      };

    case ACTIONS.SET_THINKING:
      console.log(
        "[Reducer] SET_THINKING:",
        action.payload,
        `toolExecutions=${state.toolExecutions.length}`,
        `activeTool=${state.activeTool?.name || "null"}`,
      );
      return {
        ...state,
        isThinking: action.payload,
        thinkingStartTime: action.payload ? Date.now() : null,
        // Only clear activeTool and runProgress when thinking stops.
        // toolExecutions is intentionally kept alive so ADD_MESSAGE can adopt
        // the live SSE cards onto the message before clearing them.
        activeTool: action.payload ? state.activeTool : null,
        runProgress: action.payload ? state.runProgress : null,
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: {
          type: "client_error",
          message: action.payload,
          recoverable: true,
        },
        isThinking: false,
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ACTIONS.CANCEL_REQUEST:
      return {
        ...state,
        isThinking: false,
        activeTool: null,
        runProgress: null,
      };

    default:
      return state;
  }
}

/**
 * Hook to manage chat state
 * @returns {[state, dispatch]} State and dispatch function
 */
export function useChatState() {
  return useReducer(chatReducer, initialState);
}
