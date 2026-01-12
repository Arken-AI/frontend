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
  streamingText: "", // Accumulating streaming text
  isStreaming: false, // Is currently receiving streaming text?
  error: null, // Current error message
};

// Action types
export const ACTIONS = {
  THINKING_START: "THINKING_START",
  THINKING_END: "THINKING_END",
  TOOL_START: "TOOL_START",
  TOOL_END: "TOOL_END",
  RUN_PROGRESS: "RUN_PROGRESS",
  MESSAGE_DELTA: "MESSAGE_DELTA",
  MESSAGE_FINAL: "MESSAGE_FINAL",
  APP_ERROR: "APP_ERROR",
  ADD_MESSAGE: "ADD_MESSAGE",
  ADD_USER_MESSAGE: "ADD_USER_MESSAGE",
  LOAD_MESSAGES: "LOAD_MESSAGES",
  RESET: "RESET",
  RESET_RESPONSE: "RESET_RESPONSE",
  SET_THINKING: "SET_THINKING",
  SET_STREAMING: "SET_STREAMING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  CANCEL_REQUEST: "CANCEL_REQUEST",
};

// Reducer function
function chatReducer(state, action) {
  switch (action.type) {
    case ACTIONS.THINKING_START:
      return {
        ...state,
        isThinking: true,
        thinkingStartTime: Date.now(),
        error: null,
      };

    case ACTIONS.THINKING_END:
      return {
        ...state,
        isThinking: false,
        thinkingStartTime: null,
      };

    case ACTIONS.TOOL_START:
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

    case ACTIONS.MESSAGE_DELTA:
      return {
        ...state,
        isStreaming: true,
        streamingText: state.streamingText + action.payload.delta,
      };

    case ACTIONS.MESSAGE_FINAL:
      // Check if this is an intermediate message (before tool calls)
      const isIntermediate = action.payload.metadata?.is_intermediate;

      return {
        ...state,
        // Only stop streaming for final messages, not intermediate ones
        isStreaming: isIntermediate ? state.isStreaming : false,
        streamingText: "", // Always clear streaming text (it's now in messages)
        messages: [
          ...state.messages,
          {
            role: action.payload.role,
            content: action.payload.content,
            timestamp: new Date().toISOString(),
            metadata: action.payload.metadata,
            // Only attach tool executions to final message, not intermediate
            toolExecutions: isIntermediate ? [] : state.toolExecutions,
          },
        ],
        // Only clear tool executions for final message
        toolExecutions: isIntermediate ? state.toolExecutions : [],
        // Only clear progress for final message
        runProgress: isIntermediate ? state.runProgress : null,
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
        isStreaming: false,
      };

    case ACTIONS.ADD_MESSAGE:
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
            tool_executions: action.payload.tool_executions,
          },
        ],
        error: null,
      };

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
      return {
        ...state,
        messages: action.payload.messages,
      };

    case ACTIONS.RESET:
      return {
        ...initialState,
      };

    case ACTIONS.RESET_RESPONSE:
      return {
        ...state,
        streamingText: "",
        activeTool: null,
        runProgress: null,
        error: null,
      };

    case ACTIONS.SET_THINKING:
      return {
        ...state,
        isThinking: action.payload,
        thinkingStartTime: action.payload ? Date.now() : null,
      };

    case ACTIONS.SET_STREAMING:
      return {
        ...state,
        isStreaming: action.payload,
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
        isStreaming: false,
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
        isStreaming: false,
        activeTool: null,
        runProgress: null,
        streamingText: "",
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
