/**
 * ChatContainer Component
 *
 * Main container orchestrating the full chat interface.
 * Handles message sending with an imperative SSEClient that opens BEFORE
 * the HTTP POST fires, guaranteeing real-time tool progress updates even
 * for fast (<100 ms) tool calls.
 *
 * Architecture:
 * - Messages are sent via POST /chat; the full response is returned directly.
 * - SSEClient (imperative class, not a hook) is created in handleSendMessage
 *   before the POST so tool_start / tool_end events are never missed.
 * - No fallback timers needed — response is guaranteed via HTTP.
 */

import { useCallback, useRef, useEffect } from "react";
import { useChatContext } from "../../context/ChatContext";
import { useChatState } from "../../hooks/useChatState";
import { handleSSEEvent } from "../../utils/eventHandlers";
import { sendMessage, getStreamUrl } from "../../api/client";
import SSEClient from "../../utils/sseClient";

import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import WelcomeScreen from "./WelcomeScreen";

/** Generate a conversation ID with the same format as the backend. */
function generateConversationId() {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `conv_${hex}`;
}

function ChatContainer() {
  const {
    conversationId,
    setConversationId,
    refreshConversations,
    currentContext,
    updateLatestRunId,
    username,
  } = useChatContext();
  const [state, dispatch] = useChatState();
  const previousConversationIdRef = useRef(conversationId);

  // Flag to signal that the conversationId change was initiated by
  // handleSendMessage (pre-generating an ID for a new conversation).
  // This prevents the conversation-switch reset effect from wiping state.
  const newConvFromSendRef = useRef(false);

  // Holds the active SSEClient instance for the current in-flight request.
  // Stored in a ref so it's accessible from the cancel handler.
  const sseClientRef = useRef(null);

  // Tracks the highest event sequence number seen so far for this conversation.
  // Passed to each new SSEClient so the stream resumes after the last seen
  // event and never replays events from previous turns.
  const lastSequenceRef = useRef(0);

  // Handle SSE events (for tool progress updates only)
  const onSSEEvent = useCallback(
    (event) => {
      // Always advance the sequence cursor so the next SSEClient opens
      // with ?after_sequence=N and never replays already-seen events.
      if (event.sequence) {
        lastSequenceRef.current = event.sequence;
      }
      if (
        [
          "thinking_start",
          "thinking_end",
          "tool_start",
          "tool_end",
          "run_progress",
          "app_error",
          "agent_text",
        ].includes(event.event_type)
      ) {
        handleSSEEvent(event, dispatch);
      }
    },
    [dispatch],
  );

  // Send message handler - now synchronous with direct response
  const handleSendMessage = useCallback(
    async (content) => {
      if (!content.trim() || state.isThinking) return;

      // Clear any leftover tool state from the previous turn FIRST,
      // before the user message is added and before SSE events start arriving.
      dispatch({ type: "RESET_RESPONSE" });

      // Add user message immediately
      const userMessage = {
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });

      // For new conversations, pre-generate the conversation_id and set it
      // NOW — before isThinking becomes true — so the SSE hook can connect
      // immediately and receive tool_start/tool_end events in real time.
      // The same ID is passed to the backend so both sides are in sync.
      const activeConversationId = conversationId || generateConversationId();
      if (!conversationId) {
        // Mark that this conversationId change is from sending a new message,
        // NOT a user switching conversations — so the reset effect skips.
        newConvFromSendRef.current = true;
        // Skip the context fetch — this conversation doesn't exist on the
        // backend yet, fetching it would trigger a "not found" error that
        // resets conversationId back to null.
        setConversationId(activeConversationId, { skipContextFetch: true });
      }

      dispatch({ type: "SET_THINKING", payload: true });

      // Open the SSE connection BEFORE firing the POST so we don't miss
      // any tool_start / tool_end events emitted by fast tool calls.
      // Start after the last sequence we saw so old events are never replayed.
      const sseUrl = getStreamUrl(activeConversationId, lastSequenceRef.current);
      const sseClient = new SSEClient(sseUrl, onSSEEvent);
      sseClientRef.current = sseClient;
      await sseClient.ready; // wait for TCP open (or timeout) before POST

      try {
        // Send message to backend - waits for complete response
        const response = await sendMessage({
          message: content.trim(),
          conversation_id: activeConversationId,
          username,
        });

        // ── Wait for SSE stream to finish ──────────────────────────────
        // The backend emits tool_start/tool_end/thinking_end to Redis
        // BEFORE the HTTP response returns. But the SSE endpoint polls
        // Redis every 100ms, so there's a race: the HTTP response can
        // arrive before the SSE poll picks up the events.
        //
        // waitForCompletion() resolves when:
        //   a) SSEClient receives thinking_end, OR
        //   b) The server closes the stream, OR
        //   c) A 10s safety timeout fires (never blocks forever).
        //
        // This ensures all tool_start/tool_end dispatches have happened
        // BEFORE we fire ADD_MESSAGE (which adopts them onto the message)
        // and SET_THINKING(false) (which hides the live block).
        await sseClient.waitForCompletion();

        // Update conversation ID if backend returned a different one (shouldn't
        // happen since we pre-generated it, but guard anyway)
        if (
          response.conversation_id &&
          response.conversation_id !== activeConversationId
        ) {
          setConversationId(response.conversation_id);
        }

        // Handle response AFTER SSE stream is complete so that
        // state.toolExecutions (populated by SSE tool_end events, including
        // `arguments`) is fully populated when ADD_MESSAGE runs. The reducer
        // adopts the live SSE cards onto the message.
        if (response.status === "completed" && response.message) {
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              role: "assistant",
              content: response.message,
              timestamp: new Date().toISOString(),
              run_ids: response.run_ids,
              tool_executions: response.tool_executions,
              token_usage: response.token_usage,
            },
          });

          // Update latest run ID for "View Flowsheet" button
          if (response.run_ids && response.run_ids.length > 0) {
            updateLatestRunId(response.run_ids);
          }
        } else if (response.status === "error") {
          dispatch({
            type: "SET_ERROR",
            payload:
              response.message ||
              "An error occurred while processing your request",
          });
        }

        // Stop thinking AFTER ADD_MESSAGE so the reducer can adopt the live
        // SSE toolExecutions (with arguments) onto the message before clearing.
        dispatch({ type: "SET_THINKING", payload: false });

        sseClient.close();
        sseClientRef.current = null;

        await refreshConversations();
      } catch (error) {
        console.error("Error sending message:", error);
        sseClientRef.current?.close();
        sseClientRef.current = null;
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to send message",
        });
        dispatch({ type: "SET_THINKING", payload: false });
      }
    },
    [
      conversationId,
      dispatch,
      onSSEEvent,
      refreshConversations,
      setConversationId,
      updateLatestRunId,
    ],
  );

  // Reset state when conversation changes (user switching conversations).
  // Skip when the change was initiated by handleSendMessage creating a new ID.
  useEffect(() => {
    const previousId = previousConversationIdRef.current;

    if (newConvFromSendRef.current) {
      // This change came from handleSendMessage — don't reset.
      newConvFromSendRef.current = false;
      previousConversationIdRef.current = conversationId;
      return;
    }

    if (conversationId !== previousId && previousId !== null) {
      dispatch({ type: "RESET" });
      lastSequenceRef.current = 0;
    }

    previousConversationIdRef.current = conversationId;
  }, [conversationId, dispatch]);

  // Load messages from context when conversation changes
  useEffect(() => {
    if (currentContext && currentContext.messages) {
      dispatch({
        type: "LOAD_MESSAGES",
        payload: { messages: currentContext.messages },
      });
      // Seed the sequence cursor so the next SSEClient skips all historical
      // events already stored in Redis for this conversation.
      if (currentContext.last_event_sequence) {
        lastSequenceRef.current = currentContext.last_event_sequence;
      }
    }
  }, [currentContext, dispatch]);

  // Cancel/stop request handler
  const handleCancelRequest = useCallback(() => {
    sseClientRef.current?.close();
    sseClientRef.current = null;
    dispatch({ type: "CANCEL_REQUEST" });
  }, [dispatch]);

  // Show welcome screen if no messages
  const showWelcome = state.messages.length === 0 && !state.isThinking;

  // Is request currently processing?
  const isProcessing = state.isThinking;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Error display */}
      {state.error && (
        <div
          className={`text-sm px-4 py-3 text-center border-b flex items-center justify-center gap-3 ${
            state.error.type === "rate_limit_error"
              ? "bg-yellow-50 text-yellow-900 border-yellow-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex-1 flex items-center justify-center gap-2">
            {state.error.type === "rate_limit_error" ? (
              <svg
                className="w-5 h-5 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <div className="text-left">
              <div className="font-medium">{state.error.message}</div>
              {state.error.details?.suggestion && (
                <div className="text-xs mt-1 opacity-75">
                  {state.error.details.suggestion}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: "CLEAR_ERROR" })}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              state.error.type === "rate_limit_error"
                ? "text-yellow-700 hover:bg-yellow-100"
                : "text-red-700 hover:bg-red-100"
            }`}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        {showWelcome ? (
          <WelcomeScreen onSend={handleSendMessage} />
        ) : (
          <MessageList
            messages={state.messages}
            isThinking={state.isThinking}
            activeTool={state.activeTool}
            toolExecutions={state.toolExecutions}
            runProgress={state.runProgress}
            agentSteps={state.agentSteps}
            error={state.error}
          />
        )}
      </div>

      {/* Input area - always show */}
      <MessageInput
        onSend={handleSendMessage}
        onCancel={handleCancelRequest}
        disabled={false}
        isProcessing={isProcessing}
        placeholder="Ask about process simulations..."
      />

      {/* Status indicator */}
      {state.isThinking && (
        <div className="px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="flex gap-0.5">
                <span
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
              <span className="text-gray-400 font-medium">Thinking</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatContainer;
