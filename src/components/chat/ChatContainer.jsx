/**
 * ChatContainer Component
 * 
 * Main container orchestrating the full chat interface.
 * Handles message sending and optional SSE for tool progress updates.
 * 
 * Architecture (Simplified):
 * - Messages are sent via POST /chat and response is returned directly
 * - SSE is optional - only used to show real-time tool progress (tool_start, tool_end)
 * - No fallback timers needed - response is guaranteed via HTTP
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { useChatState } from '../../hooks/useChatState';
import { useSSE } from '../../hooks/useSSE';
import { handleSSEEvent } from '../../utils/eventHandlers';
import { sendMessage } from '../../api/client';

import MessageList from './MessageList';
import MessageInput from './MessageInput';
import WelcomeScreen from './WelcomeScreen';

function ChatContainer() {
  const { conversationId, setConversationId, refreshConversations, currentContext, contextLoading } = useChatContext();
  const [state, dispatch] = useChatState();
  const [inputDisabled, setInputDisabled] = useState(false);
  const previousConversationIdRef = useRef(conversationId);
  const lastSequenceRef = useRef(0);
  
  // Update lastSequence when context loads (for existing conversations)
  useEffect(() => {
    if (currentContext && currentContext.last_event_sequence) {
      lastSequenceRef.current = currentContext.last_event_sequence;
      console.log(`[ChatContainer] Loaded context, last_event_sequence: ${currentContext.last_event_sequence}`);
    }
  }, [currentContext]);
  
  // Calculate the highest sequence number from loaded context
  const getInitialSequence = useCallback(() => {
    return lastSequenceRef.current;
  }, []);
  
  // Handle SSE events (for tool progress updates only)
  const onSSEEvent = useCallback((event) => {
    if (event.sequence && event.sequence > lastSequenceRef.current) {
      lastSequenceRef.current = event.sequence;
    }
    // Only handle tool progress events from SSE
    // message_final is now handled via HTTP response
    if (['thinking_start', 'thinking_end', 'tool_start', 'tool_end', 'run_progress', 'app_error'].includes(event.event_type)) {
      handleSSEEvent(event, dispatch);
    }
  }, [dispatch]);
  
  // SSE connection for tool progress updates (only when actively thinking)
  // This prevents unnecessary long-lived connections when just viewing history
  const { isConnected, error: sseError } = useSSE(
    conversationId,
    onSSEEvent,
    !!conversationId && state.isThinking,  // Only connect during active message processing
    null,
    getInitialSequence()
  );

  // Send message handler - now synchronous with direct response
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || inputDisabled) return;
    
    // Disable input while processing
    setInputDisabled(true);
    
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
    
    try {
      // Send message to backend - waits for complete response
      const response = await sendMessage({
        message: content.trim(),
        conversation_id: conversationId,
      });
      
      // Update conversation ID if new
      if (response.conversation_id && response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }
      
      // Stop thinking state
      dispatch({ type: 'SET_THINKING', payload: false });
      
      // Handle response
      if (response.status === 'completed' && response.message) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString(),
            run_ids: response.run_ids,
            tool_executions: response.tool_executions,
            token_usage: response.token_usage,
          },
        });
      } else if (response.status === 'error') {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: response.message || 'An error occurred while processing your request' 
        });
      }
      
      setInputDisabled(false);
      await refreshConversations();
      
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to send message' });
      dispatch({ type: 'SET_THINKING', payload: false });
      setInputDisabled(false);
    }
  }, [
    conversationId,
    inputDisabled,
    dispatch,
    refreshConversations,
    setConversationId,
  ]);

  // Reset state when conversation changes
  useEffect(() => {
    const previousId = previousConversationIdRef.current;
    
    if (conversationId !== previousId && previousId !== null) {
      console.log('[ChatContainer] Switching conversations, resetting state');
      dispatch({ type: 'RESET' });
      setInputDisabled(false);
      lastSequenceRef.current = 0;
    }
    
    previousConversationIdRef.current = conversationId;
  }, [conversationId, dispatch]);

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
    dispatch({ type: 'CANCEL_REQUEST' });
    setInputDisabled(false);
  }, [dispatch]);

  // Show welcome screen if no messages
  const showWelcome = state.messages.length === 0 && !state.isThinking;
  
  // Is request currently processing?
  const isProcessing = state.isThinking || inputDisabled;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* SSE Error indicator */}
      {sseError && (
        <div className="bg-yellow-50 text-yellow-700 text-sm px-4 py-2 text-center border-b border-yellow-200">
          Progress stream unavailable (response will still be delivered)
        </div>
      )}
      
      {/* Error display */}
      {state.error && (
        <div className={`text-sm px-4 py-3 text-center border-b flex items-center justify-center gap-3 ${
          state.error.type === 'rate_limit_error' 
            ? 'bg-yellow-50 text-yellow-900 border-yellow-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex-1 flex items-center justify-center gap-2">
            {state.error.type === 'rate_limit_error' ? (
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="text-left">
              <div className="font-medium">{state.error.message}</div>
              {state.error.details?.suggestion && (
                <div className="text-xs mt-1 opacity-75">{state.error.details.suggestion}</div>
              )}
            </div>
          </div>
          <button 
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              state.error.type === 'rate_limit_error'
                ? 'text-yellow-700 hover:bg-yellow-100'
                : 'text-red-700 hover:bg-red-100'
            }`}
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
            runProgress={state.runProgress}
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
        {state.isThinking && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            Thinking
          </span>
        )}
      </div>
    </div>
  );
}

export default ChatContainer;
