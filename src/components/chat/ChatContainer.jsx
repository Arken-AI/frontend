/**
 * ChatContainer Component
 * 
 * Main container orchestrating the full chat interface.
 * Handles message sending, SSE streaming, and state management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useChatState } from '../../hooks/useChatState';
import { useSSE } from '../../hooks/useSSE';
import { handleSSEEvent } from '../../utils/eventHandlers';
import { sendMessage, getTestStreamUrl } from '../../api/client';

import MessageList from './MessageList';
import MessageInput from './MessageInput';
import WelcomeScreen from './WelcomeScreen';

// Toggle for testing: set to true to use mock stream instead of real LLM
const USE_TEST_STREAM = false;

// Fallback timer duration (ms) - if SSE doesn't receive message_final
const FALLBACK_TIMEOUT = 30000;

function ChatContainer() {
  const { conversationId, setConversationId, refreshConversations, currentContext, contextLoading } = useChatContext();
  const [state, dispatch] = useChatState();
  const [inputDisabled, setInputDisabled] = useState(false);
  const fallbackTimerRef = useRef(null);
  const pendingMessageRef = useRef(null);
  const previousConversationIdRef = useRef(conversationId); // Track previous conversation ID
  const lastSequenceRef = useRef(0); // Track last sequence number for this conversation
  
  // Update lastSequence when context loads (for existing conversations)
  useEffect(() => {
    if (currentContext && currentContext.last_event_sequence) {
      lastSequenceRef.current = currentContext.last_event_sequence;
      console.log(`[ChatContainer] Loaded context, last_event_sequence: ${currentContext.last_event_sequence}`);
    }
  }, [currentContext]);
  
  // Calculate the highest sequence number from loaded context
  // This ensures SSE starts from the right point for existing conversations  
  const getInitialSequence = useCallback(() => {
    // Return the last sequence we tracked for this conversation
    return lastSequenceRef.current;
  }, []);
  
  // Track sequence numbers from SSE events
  const onSSEEvent = useCallback((event) => {
    // Update last sequence if present
    if (event.sequence && event.sequence > lastSequenceRef.current) {
      lastSequenceRef.current = event.sequence;
    }
    handleSSEEvent(event, dispatch);
  }, [dispatch]);
  
  // SSE connection for streaming events
  const { isConnected, error: sseError } = useSSE(
    conversationId,
    onSSEEvent,
    !!conversationId && state.isStreaming,
    USE_TEST_STREAM ? getTestStreamUrl() : null,
    getInitialSequence() // Pass the initial sequence
  );

  // Clear fallback timer
  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // Handle message_final received - clear timer and enable input
  useEffect(() => {
    if (!state.isStreaming && !state.isThinking) {
      clearFallbackTimer();
      setInputDisabled(false);
      pendingMessageRef.current = null;
    }
  }, [state.isStreaming, state.isThinking, clearFallbackTimer]);

  // Handle fallback when SSE doesn't deliver message_final
  const handleFallback = useCallback(async () => {
    console.warn('Fallback triggered - SSE did not deliver message_final');
    
    // Reset streaming state
    dispatch({ type: 'SET_STREAMING', payload: false });
    dispatch({ type: 'SET_THINKING', payload: false });
    
    // If we have a pending message, try to show it was sent
    if (pendingMessageRef.current) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: '_Response received but streaming interrupted. Please check the conversation history._',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    setInputDisabled(false);
    await refreshConversations();
  }, [dispatch, refreshConversations]);

  // Send message handler
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || inputDisabled) return;
    
    // Disable input while processing
    setInputDisabled(true);
    clearFallbackTimer();
    
    // Add user message immediately
    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    
    // Reset state for new response
    dispatch({ type: 'RESET_RESPONSE' });
    dispatch({ type: 'SET_THINKING', payload: true });
    dispatch({ type: 'SET_STREAMING', payload: true });
    
    // Store pending message for fallback
    pendingMessageRef.current = content.trim();
    
    try {
      // In test mode, skip backend call and use fake conversation ID
      if (USE_TEST_STREAM) {
        const fakeConversationId = conversationId || `test_conv_${Date.now()}`;
        if (!conversationId) {
          setConversationId(fakeConversationId);
        }
        
        // Start fallback timer for streaming
        fallbackTimerRef.current = setTimeout(handleFallback, FALLBACK_TIMEOUT);
        return;
      }
      
      // Send message to backend
      const response = await sendMessage({
        message: content.trim(),
        conversation_id: conversationId,
        stream: true,
      });
      
      // Update conversation ID if new
      if (response.conversation_id && response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }
      
      // If we got a synchronous response (non-streaming fallback)
      if (response.response && !response.stream_started) {
        dispatch({ type: 'SET_THINKING', payload: false });
        dispatch({ type: 'SET_STREAMING', payload: false });
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: response.response,
            timestamp: new Date().toISOString(),
            run_ids: response.run_ids,
            tool_executions: response.tool_executions,
          },
        });
        setInputDisabled(false);
        pendingMessageRef.current = null;
        await refreshConversations();
        return;
      }
      
      // Start fallback timer for streaming
      fallbackTimerRef.current = setTimeout(handleFallback, FALLBACK_TIMEOUT);
      
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to send message' });
      dispatch({ type: 'SET_THINKING', payload: false });
      dispatch({ type: 'SET_STREAMING', payload: false });
      setInputDisabled(false);
      pendingMessageRef.current = null;
    }
  }, [
    conversationId,
    inputDisabled,
    clearFallbackTimer,
    dispatch,
    handleFallback,
    refreshConversations,
    setConversationId,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFallbackTimer();
    };
  }, [clearFallbackTimer]);

  // Reset state when conversation changes (but not when creating new conversation)
  useEffect(() => {
    const previousId = previousConversationIdRef.current;
    
    // Only reset if switching between different existing conversations
    // Don't reset when going from null -> new conv (that's creation, not switching)
    if (conversationId !== previousId && previousId !== null && conversationId !== null) {
      console.log('[ChatContainer] Switching conversations, resetting state');
      dispatch({ type: 'RESET' });
      setInputDisabled(false);
      clearFallbackTimer();
      lastSequenceRef.current = 0; // Reset sequence tracking for new conversation
    }
    
    // Update the ref for next comparison
    previousConversationIdRef.current = conversationId;
  }, [conversationId, dispatch, clearFallbackTimer]);

  // Load messages from context when conversation changes
  useEffect(() => {
    if (currentContext && currentContext.messages) {
      dispatch({ 
        type: 'LOAD_MESSAGES', 
        payload: { messages: currentContext.messages } 
      });
    }
  }, [currentContext, dispatch]);

  // Cancel/stop request handler
  const handleCancelRequest = useCallback(() => {
    console.log('Request cancelled by user');
    clearFallbackTimer();
    dispatch({ type: 'CANCEL_REQUEST' });
    setInputDisabled(false);
    pendingMessageRef.current = null;
  }, [clearFallbackTimer, dispatch]);

  // Show welcome screen if no messages
  const showWelcome = state.messages.length === 0 && !state.isThinking;
  
  // Is request currently processing?
  const isProcessing = state.isThinking || state.isStreaming || inputDisabled;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Test mode indicator */}
      {USE_TEST_STREAM && (
        <div className="bg-blue-50 text-blue-800 text-sm px-4 py-2 text-center border-b border-blue-200 font-medium">
          🧪 Test Mode: Using mock stream (no LLM calls)
        </div>
      )}
      
      {/* Connection indicator */}
      {state.isStreaming && !isConnected && (
        <div className="bg-yellow-50 text-yellow-800 text-sm px-4 py-2 text-center border-b border-yellow-200">
          Connecting to stream...
        </div>
      )}
      
      {/* SSE Error indicator */}
      {sseError && (
        <div className="bg-red-50 text-red-800 text-sm px-4 py-2 text-center border-b border-red-200">
          Stream error: {sseError}
        </div>
      )}
      
      {/* Error display */}
      {state.error && (
        <div className="bg-red-50 text-red-800 text-sm px-4 py-2 text-center border-b border-red-200 flex items-center justify-center gap-2">
          <span>Error: {state.error.message}</span>
          <button 
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
            className="text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome ? (
          <WelcomeScreen onSend={handleSendMessage} />
        ) : (
          <MessageList
            messages={state.messages}
            isThinking={state.isThinking}
            activeTool={state.activeTool}
            toolExecutions={state.toolExecutions}
            progress={state.runProgress}
            streamingText={state.streamingText}
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
        placeholder={
          isProcessing
            ? 'Waiting for response...'
            : 'Ask about sugar processing calculations...'
        }
      />
      
      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-400 border-t border-gray-100">
        {state.isStreaming && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Streaming
          </span>
        )}
        {state.isThinking && !state.isStreaming && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            Thinking
          </span>
        )}
        {conversationId && (
          <span>
            ID: {conversationId.slice(0, 8)}...
          </span>
        )}
      </div>
    </div>
  );
}

export default ChatContainer;
