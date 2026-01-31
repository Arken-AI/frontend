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

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Plus, History, MessageSquare, Loader2, ChevronDown } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { useChatState } from '../../hooks/useChatState';
import { useSSE } from '../../hooks/useSSE';
import { handleSSEEvent } from '../../utils/eventHandlers';
import { sendMessage } from '../../api/client';

import MessageList from './MessageList';
import MessageInput from './MessageInput';
import WelcomeScreen from './WelcomeScreen';

export default function ChatPanel({ 
  onClose,
  title = "MCP Chat",
  placeholder = "Ask about sugar processing calculations...",
  showHeader = true,
}) {
  const { 
    conversationId, 
    setConversationId, 
    refreshConversations, 
    currentContext, 
    createNewConversation,
    conversations,
    conversationsLoading,
    updateLatestRunId
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
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showConversationList]);

  // Toggle conversation list dropdown
  const handleToggleHistory = useCallback(() => {
    setShowConversationList(prev => !prev);
  }, []);

  // Switch to a different conversation
  const handleSwitchConversation = useCallback((convId) => {
    setConversationId(convId);
    setShowConversationList(false);
  }, [setConversationId]);
  
  const [state, dispatch] = useChatState();
  const previousConversationIdRef = useRef(conversationId);
  const lastSequenceRef = useRef(0);
  
  // Update lastSequence when context loads
  useEffect(() => {
    if (currentContext && currentContext.last_event_sequence) {
      lastSequenceRef.current = currentContext.last_event_sequence;
    }
  }, [currentContext]);
  
  const getInitialSequence = useCallback(() => {
    return lastSequenceRef.current;
  }, []);
  
  // Handle SSE events
  const onSSEEvent = useCallback((event) => {
    if (event.sequence && event.sequence > lastSequenceRef.current) {
      lastSequenceRef.current = event.sequence;
    }
    if (['thinking_start', 'thinking_end', 'tool_start', 'tool_end', 'run_progress', 'app_error'].includes(event.event_type)) {
      handleSSEEvent(event, dispatch);
    }
  }, [dispatch]);
  
  // SSE connection - always try to connect to show proper status
  const { isConnected, error: sseError } = useSSE(
    conversationId,
    onSSEEvent,
    true, // Always maintain connection to show online/offline status
    null,
    getInitialSequence()
  );

  // Send message handler
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || state.isThinking) return;
    
    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'RESET_RESPONSE' });
    dispatch({ type: 'SET_THINKING', payload: true });
    
    try {
      const response = await sendMessage({
        message: content.trim(),
        conversation_id: conversationId,
      });
      
      if (response.conversation_id && response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }
      
      dispatch({ type: 'SET_THINKING', payload: false });
      
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
        
        // Update latest run ID for "View Flowsheet" button
        if (response.run_ids && response.run_ids.length > 0) {
          updateLatestRunId(response.run_ids);
        }
      } else if (response.status === 'error') {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: response.message || 'An error occurred' 
        });
      }
      
      await refreshConversations();
      
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Failed to send message' });
      dispatch({ type: 'SET_THINKING', payload: false });
    }
  }, [conversationId, dispatch, refreshConversations, setConversationId, updateLatestRunId]);

  // Reset state when conversation changes
  useEffect(() => {
    const previousId = previousConversationIdRef.current;
    
    if (conversationId !== previousId && previousId !== null) {
      dispatch({ type: 'RESET' });
      lastSequenceRef.current = 0;
    }
    
    previousConversationIdRef.current = conversationId;
  }, [conversationId, dispatch]);

  // Load messages from context
  useEffect(() => {
    if (currentContext && currentContext.messages) {
      dispatch({ 
        type: 'LOAD_MESSAGES', 
        payload: { messages: currentContext.messages } 
      });
    }
  }, [currentContext, dispatch]);

  // Cancel handler
  const handleCancelRequest = useCallback(() => {
    dispatch({ type: 'CANCEL_REQUEST' });
  }, [dispatch]);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    createNewConversation();
    dispatch({ type: 'RESET' });
  }, [createNewConversation, dispatch]);

  const showWelcome = state.messages.length === 0 && !state.isThinking;
  const isProcessing = state.isThinking;

  // Get conversation title from context
  const conversationTitle = currentContext?.title || 
    (conversationId ? 'Conversation' : 'New Chat');

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
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
              isConnected 
                ? 'bg-green-50 text-green-700' 
                : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              {isConnected ? 'Connected' : 'Offline'}
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
                        <Loader2 className="animate-spin text-blue-500" size={20} />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-600">
                        <p className="text-sm font-medium">No conversations yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start a new chat to begin</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {conversations.slice(0, 10).map((conv) => (
                          <button
                            key={conv.conversation_id}
                            onClick={() => handleSwitchConversation(conv.conversation_id)}
                            className={`w-full px-4 py-2.5 text-left transition-all border-l-3 ${
                              conv.conversation_id === conversationId 
                                ? 'bg-blue-50 border-blue-500' 
                                : 'border-transparent hover:bg-gray-50'
                            }`}
                          >
                            <p className={`text-sm truncate ${
                              conv.conversation_id === conversationId ? 'text-blue-700 font-semibold' : 'text-gray-800'
                            }`}>
                              {conv.title || 'Untitled Chat'}
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
      
      {/* SSE Error indicator */}
      {sseError && (
        <div className="bg-yellow-50 text-yellow-700 text-xs px-3 py-1.5 text-center border-b border-yellow-200">
          Progress stream unavailable
        </div>
      )}
      
      {/* Error display */}
      {state.error && (
        <div className={`text-xs px-3 py-2 text-center border-b flex items-center justify-center gap-2 ${
          state.error.type === 'rate_limit_error' 
            ? 'bg-yellow-50 text-yellow-900 border-yellow-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <span>{state.error.message}</span>
          <button 
            onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
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
        disabled={false}
        isProcessing={isProcessing}
        placeholder={placeholder}
        compact
      />
    </div>
  );
}
