/**
 * Chat Context Provider
 * 
 * Global state management for conversations and chat.
 * Provides conversation data and actions to all child components.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getConversations, getContext, deleteConversation as apiDeleteConversation } from '../api/client';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Create the context
const ChatContext = createContext(null);

/**
 * Chat Context Provider Component
 */
export function ChatProvider({ children }) {
  // Current conversation ID (persisted in localStorage)
  const [conversationId, setConversationId] = useLocalStorage('currentConversationId', null);
  
  // Conversation list
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);
  
  // Current conversation context (messages, state)
  const [currentContext, setCurrentContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  
  // Track latest run_id from context (for "View Flowsheet" button)
  const [latestRunId, setLatestRunId] = useState(null);

  /**
   * Load conversation list from backend
   */
  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError(null);
    
    try {
      const data = await getConversations(50, 0);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversationsError(error.message);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  /**
   * Load context for a specific conversation
   */
  const loadConversationContext = useCallback(async (convId) => {
    if (!convId) {
      setCurrentContext(null);
      return;
    }
    
    setContextLoading(true);
    
    try {
      const context = await getContext(convId);
      setCurrentContext(context);
    } catch (error) {
      console.error('Failed to load conversation context:', error);
      // If conversation not found, clear it
      if (error.message === 'Conversation not found') {
        setConversationId(null);
      }
      setCurrentContext(null);
    } finally {
      setContextLoading(false);
    }
  }, [setConversationId]);

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (convId) => {
    try {
      await apiDeleteConversation(convId);
      
      // If deleting current conversation, clear it
      if (convId === conversationId) {
        setConversationId(null);
        setCurrentContext(null);
      }
      
      // Refresh list
      await refreshConversations();
      
      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }, [conversationId, setConversationId, refreshConversations]);

  /**
   * Start a new conversation
   */
  const createNewConversation = useCallback(() => {
    setConversationId(null);
    setCurrentContext(null);
    setLatestRunId(null);
  }, [setConversationId]);

  /**
   * Switch to a different conversation
   */
  const switchConversation = useCallback((convId) => {
    setConversationId(convId);
  }, [setConversationId]);

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load context when conversation changes
  useEffect(() => {
    let isMounted = true;
    
    const loadContext = async () => {
      if (!conversationId) {
        setCurrentContext(null);
        return;
      }
      
      setContextLoading(true);
      
      try {
        const context = await getContext(conversationId);
        if (isMounted) {
          setCurrentContext(context);
          // Extract latest run_id (first in run_ids array)
          const runIds = context?.run_ids || [];
          setLatestRunId(runIds.length > 0 ? runIds[0] : null);
        }
      } catch (error) {
        console.error('Failed to load conversation context:', error);
        if (isMounted) {
          // If conversation not found, clear it
          if (error.message === 'Conversation not found') {
            setConversationId(null);
          }
          setCurrentContext(null);
          setLatestRunId(null);
        }
      } finally {
        if (isMounted) {
          setContextLoading(false);
        }
      }
    };
    
    loadContext();
    
    return () => {
      isMounted = false;
    };
  }, [conversationId]); // Only depend on conversationId, not on loadConversationContext

  // Context value
  const value = {
    // Current conversation
    conversationId,
    setConversationId: switchConversation,
    
    // Conversation list
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,
    
    // Current context
    currentContext,
    contextLoading,
    loadConversationContext,
    latestRunId,
    
    // Actions
    deleteConversation,
    createNewConversation,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Hook to use chat context
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
}

export default ChatContext;
