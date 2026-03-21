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
import { sendMessage, retryMessage, cancelMessage, getStreamUrl } from "../../api/client";
import SSEClient from "../../utils/sseClient";
import { useAutoScroll } from "../../hooks/useAutoScroll";

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
  const { scrollRef, bottomRef, showScrollButton, scrollToBottom } = useAutoScroll([
    state.messages,
    state.streamingMessage,
    state.isThinking,
    state.agentSteps,
  ]);
  const previousConversationIdRef = useRef(conversationId);

  // Flag to signal that the conversationId change was initiated by
  // handleSendMessage (pre-generating an ID for a new conversation).
  // This prevents the conversation-switch reset effect from wiping state.
  const newConvFromSendRef = useRef(false);

  // Tracks which conversation is currently displayed. Updated synchronously
  // on every conversation switch. handleSendMessage checks this to avoid
  // dispatching a stale response into the wrong conversation (Claude Desktop
  // pattern: backend finishes in background, UI ignores if user navigated away).
  const activeConvRef = useRef(conversationId);

  // Holds the active SSEClient instance for the current in-flight request.
  // Stored in a ref so it's accessible from the cancel handler.
  const sseClientRef = useRef(null);

  // AbortController for the in-flight sendMessage fetch.
  // Calling abort() immediately drops the HTTP connection so the backend
  // cancel flag (set via POST /cancel) can stop the stream.
  const abortControllerRef = useRef(null);

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
          "message_delta",
          "message_final",
          "app_error",
        ].includes(event.event_type)
      ) {
        handleSSEEvent(event, dispatch);
      }
    },
    [dispatch],
  );

  // Send message handler - now synchronous with direct response
  const handleSendMessage = useCallback(
    async (content, attachments = null) => {
      if ((!content.trim() && (!attachments || attachments.length === 0)) || state.isThinking) return;

      // Clear any leftover tool state from the previous turn FIRST,
      // before the user message is added and before SSE events start arriving.
      dispatch({ type: "RESET_RESPONSE" });

      // Add user message immediately
      const userMessage = {
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
        // Store attachments on the message for preview in MessageBubble
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
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

      // Create a fresh AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Send message to backend - waits for complete response
        const response = await sendMessage({
          message: content.trim(),
          conversation_id: activeConversationId,
          username,
          attachments: attachments || null,
          signal: abortController.signal,
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

        // ── Guard: did the user switch away while we were waiting? ───
        // If so, the backend already saved the response to MongoDB.
        // Just clean up the SSE and refresh the sidebar so the
        // conversation preview updates — don't touch the UI state.
        const userSwitchedAway = activeConvRef.current !== activeConversationId;

        if (userSwitchedAway) {
          sseClient.close();
          sseClientRef.current = null;
          // Refresh sidebar so the completed conversation shows latest preview
          await refreshConversations();
          return;
        }

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
          // Add the error as an assistant message so it persists in the
          // conversation and survives page reloads (saved by the backend).
          dispatch({
            type: "ADD_MESSAGE",
            payload: {
              role: "assistant",
              content: response.message || "An error occurred while processing your request",
              timestamp: new Date().toISOString(),
              status: "error",
            },
          });
        }

        // Stop thinking AFTER ADD_MESSAGE so the reducer can adopt the live
        // SSE toolExecutions (with arguments) onto the message before clearing.
        dispatch({ type: "SET_THINKING", payload: false });

        sseClient.close();
        sseClientRef.current = null;

        await refreshConversations();
      } catch (error) {
        sseClientRef.current?.close();
        sseClientRef.current = null;
        abortControllerRef.current = null;
        // AbortError is the expected path when the user clicks Stop — not an error
        if (error.name === "AbortError") {
          dispatch({ type: "SET_THINKING", payload: false });
          return;
        }
        console.error("Error sending message:", error);
        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            role: "assistant",
            content: error.message || "Failed to send message",
            timestamp: new Date().toISOString(),
            status: "error",
          },
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
      username,
    ],
  );

  // Reset state when conversation changes (user switching conversations).
  // Skip when the change was initiated by handleSendMessage creating a new ID.
  useEffect(() => {
    const previousId = previousConversationIdRef.current;

    // Always keep activeConvRef in sync so in-flight requests know
    // the user navigated away (Claude Desktop pattern).
    activeConvRef.current = conversationId;

    if (newConvFromSendRef.current) {
      // This change came from handleSendMessage — don't reset.
      newConvFromSendRef.current = false;
      previousConversationIdRef.current = conversationId;
      return;
    }

    if (conversationId !== previousId && previousId !== null) {
      // User switched conversations. Close the SSE client for the old
      // conversation so it stops dispatching stale events. The backend
      // keeps processing — the response is saved to DB and will be
      // available when the user switches back (loaded via getContext).
      if (sseClientRef.current) {
        sseClientRef.current.close();
        sseClientRef.current = null;
      }

      dispatch({ type: "RESET" });
      lastSequenceRef.current = 0;
    }

    previousConversationIdRef.current = conversationId;
  }, [conversationId, dispatch]);

  // Load messages from context when conversation changes.
  // IMPORTANT: Skip if a request is in-flight (isThinking). The backend saves
  // the user message to MongoDB BEFORE Claude responds, so mid-request the DB
  // history ends with the old assistant message. If LOAD_MESSAGES fires now,
  // it replaces the live messages array with stale DB data — making the old
  // assistant response appear as the "new" response. When the real response
  // arrives via HTTP, it "replaces" the stale one. Skipping here avoids that.
  const isThinkingRef = useRef(false);
  isThinkingRef.current = state.isThinking;

  useEffect(() => {
    if (isThinkingRef.current) {
      // Request in-flight — don't overwrite live state with stale DB history.
      return;
    }
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
    // 1. Tell the backend to stop streaming — include the partial text the
    //    frontend has accumulated so the backend can persist it to MongoDB.
    //    This ensures the cancelled partial response survives page reloads.
    if (conversationId) {
      cancelMessage(conversationId, state.streamingMessage || "");
    }
    // 2. Abort the in-flight HTTP fetch so the frontend doesn't process the response
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    // 3. Close the SSE connection
    sseClientRef.current?.close();
    sseClientRef.current = null;
    // 4. Reset UI state — this saves the partial text as a local message
    dispatch({ type: "CANCEL_REQUEST" });
  }, [conversationId, dispatch, state.streamingMessage]);

  // Retry: ask the backend to delete the stale tail messages from DB,
  // then re-run the same user message through Claude from scratch.
  const handleRetry = useCallback(async () => {
    if (!conversationId || state.isThinking) return;

    // Find the last user message (for optimistic UI)
    const lastUserMsg = [...state.messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;

    // ── Optimistic UI: strip the bad assistant response ─────────────
    // Use POP_LAST_ASSISTANT instead of LOAD_MESSAGES — it does NOT
    // reset isThinking, so the thinking indicator stays visible.
    dispatch({ type: "POP_LAST_ASSISTANT" });
    dispatch({ type: "CLEAR_ERROR" });
    dispatch({ type: "RESET_RESPONSE" });
    dispatch({ type: "SET_THINKING", payload: true });

    // ── Open SSE before the retry POST ──────────────────────────────
    const sseUrl = getStreamUrl(conversationId, lastSequenceRef.current);
    const sseClient = new SSEClient(sseUrl, onSSEEvent);
    sseClientRef.current = sseClient;
    await sseClient.ready;

    const retryAbortController = new AbortController();
    abortControllerRef.current = retryAbortController;

    try {
      // Call the dedicated retry endpoint — it deletes stale DB messages
      // and re-processes the same user text through Claude.
      const response = await retryMessage(conversationId, retryAbortController.signal);

      await sseClient.waitForCompletion();

      // Guard: user might have switched away while waiting
      if (activeConvRef.current !== conversationId) {
        sseClient.close();
        sseClientRef.current = null;
        await refreshConversations();
        return;
      }

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
      } else if (response.status === "error") {
        dispatch({
          type: "SET_ERROR",
          payload: response.message || "Retry failed",
        });
      }

      dispatch({ type: "SET_THINKING", payload: false });
      sseClient.close();
      sseClientRef.current = null;
      await refreshConversations();
    } catch (error) {
      sseClientRef.current?.close();
      sseClientRef.current = null;
      abortControllerRef.current = null;
      if (error.name === "AbortError") {
        dispatch({ type: "SET_THINKING", payload: false });
        return;
      }
      console.error("Error retrying message:", error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to retry" });
      dispatch({ type: "SET_THINKING", payload: false });
    }
  }, [conversationId, state.messages, state.isThinking, dispatch, onSSEEvent, refreshConversations]);

  // Show welcome screen if no messages
  const showWelcome = state.messages.length === 0 && !state.isThinking;

  // Is request currently processing?
  const isProcessing = state.isThinking;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Main content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative" style={{ scrollbarGutter: 'stable' }}>
        {showWelcome ? (
          <WelcomeScreen onSend={handleSendMessage} />
        ) : (
          <MessageList
            messages={state.messages}
            isThinking={state.isThinking}
            thinkingStartTime={state.thinkingStartTime}
            activeTool={state.activeTool}
            toolExecutions={state.toolExecutions}
            runProgress={state.runProgress}
            agentSteps={state.agentSteps}
            streamingMessage={state.streamingMessage}
            onRetry={handleRetry}
            bottomRef={bottomRef}
          />
        )}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 border text-xs transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor:     'var(--color-border)',
              color:           'var(--color-text-muted)',
              fontFamily:      'var(--font-mono)',
              borderRadius:    '2px',
            }}
          >
            ↓ latest
          </button>
        )}
      </div>

      {/* Input area - always show */}
      <MessageInput
        onSend={handleSendMessage}
        onCancel={handleCancelRequest}
        disabled={false}
        isProcessing={isProcessing}
        placeholder="Describe your heat exchanger problem…"
      />

    </div>
  );
}

export default ChatContainer;
