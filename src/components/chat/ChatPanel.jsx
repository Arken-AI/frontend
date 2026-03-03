/**
 * ChatPanel Component
 *
 * A self-contained chat panel for use in the Results page right sidebar.
 * Reuses existing chat components (MessageList, MessageInput, etc.)
 * with a custom header for the panel context.
 *
 * Features:
 * - Full chat functionality with markdown support
 * - Connection status indicator
 * - New Chat button
 * - Close button
 * - Continues existing conversation from ChatContext
 */

import { useCallback, useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  X,
  Plus,
  History,
  MessageSquare,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useChatContext } from "../../context/ChatContext";
import { useChatState } from "../../hooks/useChatState";
import { handleSSEEvent } from "../../utils/eventHandlers";
import { sendMessage, getStreamUrl } from "../../api/client";
import SSEClient from "../../utils/sseClient";

import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import WelcomeScreen from "./WelcomeScreen";

const ChatPanel = forwardRef(function ChatPanel({
  onClose,
  title = "MCP Chat",
  placeholder = "Ask about process simulations...",
  showHeader = true,
}, ref) {
  const {
    conversationId,
    setConversationId,
    refreshConversations,
    currentContext,
    createNewConversation,
    conversations,
    conversationsLoading,
    updateLatestRunId,
    username,
  } = useChatContext();

  // Dropdown state for conversation history
  const [showConversationList, setShowConversationList] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowConversationList(false);
      }
    }

    if (showConversationList) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showConversationList]);

  // Toggle conversation list dropdown
  const handleToggleHistory = useCallback(() => {
    setShowConversationList((prev) => !prev);
  }, []);

  // Switch to a different conversation
  const handleSwitchConversation = useCallback(
    (convId) => {
      setConversationId(convId);
      setShowConversationList(false);
    },
    [setConversationId],
  );

  const [state, dispatch] = useChatState();
  const previousConversationIdRef = useRef(conversationId);

  // Holds the active SSEClient for the current in-flight request.
  const sseClientRef = useRef(null);

  // Tracks the highest event sequence number seen for this conversation.
  // Passed to each new SSEClient so the stream resumes after the last seen
  // event and never replays events from previous turns.
  const lastSequenceRef = useRef(0);

  // Handle SSE events (tool progress only)
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
        ].includes(event.event_type)
      ) {
        handleSSEEvent(event, dispatch);
      }
    },
    [dispatch],
  );

  // Expose imperative API for ResultsPage re-simulation flow.
  // Allows the parent to send a message through ChatPanel's own SSE pipeline
  // so live tool_start/tool_end events appear in the chat panel.
  useImperativeHandle(ref, () => ({
    async sendSimulationMessage(messageText, extraMetadata = {}) {
      if (state.isThinking) {
        throw new Error("A request is already in progress");
      }
      if (!conversationId) {
        throw new Error("No active conversation — cannot send simulation message");
      }

      // Clear any stale tool state from a previous error path where
      // ADD_MESSAGE never fired to adopt toolExecutions.
      dispatch({ type: "RESET_RESPONSE" });

      const userMessage = {
        role: "user",
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });
      dispatch({ type: "SET_THINKING", payload: true });

      // Open SSE BEFORE the POST so fast tool events are captured.
      const sseUrl = getStreamUrl(conversationId, lastSequenceRef.current);
      const sseClient = new SSEClient(sseUrl, onSSEEvent);
      sseClientRef.current = sseClient;
      await sseClient.ready;

      try {
        const response = await sendMessage({
          message: messageText.trim(),
          conversation_id: conversationId,
          username,
          extra_metadata: extraMetadata,
        });

        await sseClient.waitForCompletion();

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

          if (response.run_ids && response.run_ids.length > 0) {
            updateLatestRunId(response.run_ids);
          }
        } else if (response.status === "error") {
          dispatch({
            type: "SET_ERROR",
            payload: response.message || "An error occurred",
          });
        }

        dispatch({ type: "SET_THINKING", payload: false });
        sseClient.close();
        sseClientRef.current = null;

        await refreshConversations();
        return response;
      } catch (error) {
        sseClientRef.current?.close();
        sseClientRef.current = null;
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to send message",
        });
        dispatch({ type: "SET_THINKING", payload: false });
        throw error;
      }
    },
  }), [state.isThinking, conversationId, username, onSSEEvent, dispatch, refreshConversations, updateLatestRunId]);

  // Send message handler
  const handleSendMessage = useCallback(
    async (content) => {
      if (!content.trim() || state.isThinking) return;

      // For new conversations, pre-generate the ID before isThinking so
      // SSEClient can open the stream before the POST fires.
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const hex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        activeConversationId = `conv_${hex}`;
        setConversationId(activeConversationId, { skipContextFetch: true });
      }

      // Clear any leftover tool state from the previous turn FIRST,
      // before the user message is added and before SSE events start arriving.
      dispatch({ type: "RESET_RESPONSE" });

      const userMessage = {
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });
      dispatch({ type: "SET_THINKING", payload: true });

      // Open SSE BEFORE the POST to catch fast tool_start/tool_end events.
      // Start after the last sequence we saw so old events are never replayed.
      const sseUrl = getStreamUrl(activeConversationId, lastSequenceRef.current);
      const sseClient = new SSEClient(sseUrl, onSSEEvent);
      sseClientRef.current = sseClient;
      await sseClient.ready;

      try {
        const response = await sendMessage({
          message: content.trim(),
          conversation_id: activeConversationId,
          username,
        });

        // Wait for SSE stream to finish delivering all tool events before
        // dispatching ADD_MESSAGE (which adopts them) and SET_THINKING(false)
        // (which hides the live block). See sseClient.js for details.
        await sseClient.waitForCompletion();

        if (response.status === "completed" && response.message) {
          // ADD_MESSAGE fires first while toolExecutions[] still has the live
          // SSE cards, so they get adopted onto the message. SET_THINKING false
          // (and its activeTool/runProgress cleanup) fires after.
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
          dispatch({ type: "SET_THINKING", payload: false });

          // Update latest run ID for "View Flowsheet" button
          if (response.run_ids && response.run_ids.length > 0) {
            updateLatestRunId(response.run_ids);
          }
        } else if (response.status === "error") {
          dispatch({ type: "SET_THINKING", payload: false });
          dispatch({
            type: "SET_ERROR",
            payload: response.message || "An error occurred",
          });
        } else {
          dispatch({ type: "SET_THINKING", payload: false });
        }

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

  // Reset state when conversation changes
  useEffect(() => {
    const previousId = previousConversationIdRef.current;

    if (conversationId !== previousId && previousId !== null) {
      dispatch({ type: "RESET" });
      lastSequenceRef.current = 0;
    }

    previousConversationIdRef.current = conversationId;
  }, [conversationId, dispatch]);

  // Load messages from context
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

  // Cancel handler
  const handleCancelRequest = useCallback(() => {
    sseClientRef.current?.close();
    sseClientRef.current = null;
    dispatch({ type: "CANCEL_REQUEST" });
  }, [dispatch]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    createNewConversation();
    dispatch({ type: "RESET" });
  }, [createNewConversation, dispatch]);

  const showWelcome = state.messages.length === 0 && !state.isThinking;
  const isProcessing = state.isThinking;

  // Get conversation title from context
  const conversationTitle =
    currentContext?.title || (conversationId ? "Conversation" : "New Chat");

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-content truncate">
                {title}
              </span>
              {conversationId && (
                <span className="text-xs text-content-secondary truncate">
                  {conversationTitle}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                state.isThinking
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  state.isThinking ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {state.isThinking ? "Connected" : "Offline"}
            </div>

            {/* Conversation History Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleToggleHistory}
                className="p-2 hover:bg-surface-secondary rounded-md transition-colors relative"
                title="show chats"
              >
                <History className="w-4 h-4 text-content-secondary" />
                {conversations.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>

              {/* Dropdown Menu */}
              {showConversationList && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border-2 border-gray-300 rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
                  {/* Conversation List */}
                  <div className="flex-1 overflow-y-auto bg-white">
                    {conversationsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2
                          className="animate-spin text-blue-500"
                          size={20}
                        />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-600">
                        <p className="text-sm font-medium">
                          No conversations yet
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Start a new chat to begin
                        </p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {conversations.slice(0, 10).map((conv) => (
                          <button
                            key={conv.conversation_id}
                            onClick={() =>
                              handleSwitchConversation(conv.conversation_id)
                            }
                            className={`w-full px-4 py-2.5 text-left transition-all border-l-3 ${
                              conv.conversation_id === conversationId
                                ? "bg-blue-50 border-blue-500"
                                : "border-transparent hover:bg-gray-50"
                            }`}
                          >
                            <p
                              className={`text-sm truncate ${
                                conv.conversation_id === conversationId
                                  ? "text-blue-700 font-semibold"
                                  : "text-gray-800"
                              }`}
                            >
                              {conv.title || "Untitled Chat"}
                            </p>
                          </button>
                        ))}
                        {conversations.length > 10 && (
                          <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200 bg-gray-50">
                            +{conversations.length - 10} more conversations
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-surface-secondary rounded-md transition-colors"
              title="New Chat"
            >
              <Plus className="w-4 h-4 text-content-secondary" />
            </button>

            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-secondary rounded-md transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4 text-content-secondary" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error display */}
      {state.error && (
        <div
          className={`text-xs px-3 py-2 text-center border-b flex items-center justify-center gap-2 ${
            state.error.type === "rate_limit_error"
              ? "bg-yellow-50 text-yellow-900 border-yellow-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span>{state.error.message}</span>
          <button
            onClick={() => dispatch({ type: "CLEAR_ERROR" })}
            className="text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome ? (
          <WelcomeScreen onSend={handleSendMessage} compact />
        ) : (
          <MessageList
            messages={state.messages}
            isThinking={state.isThinking}
            activeTool={state.activeTool}
            toolExecutions={state.toolExecutions}
            runProgress={state.runProgress}
            error={state.error}
          />
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        onSend={handleSendMessage}
        onCancel={handleCancelRequest}
        isProcessing={isProcessing}
        placeholder={placeholder}
        compact
      />
    </div>
  );
});

export default ChatPanel;
