/**
 * Chat Context Provider
 *
 * Global state management for conversations and chat.
 * Provides conversation data and actions to all child components.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getConversations,
  getContext,
  deleteConversation as apiDeleteConversation,
} from "../api/client";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useAuth } from "./AuthContext";

// Create the context
const ChatContext = createContext(null);

/**
 * Chat Context Provider Component
 */
export function ChatProvider({ children }) {
  // Get username from auth context
  const { username } = useAuth();

  // Current conversation ID (persisted in localStorage)
  const [conversationId, setConversationId] = useLocalStorage(
    "currentConversationId",
    null,
  );

  // Conversation list
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);

  // Current conversation context (messages, state)
  const [currentContext, setCurrentContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Track latest run_id from context (for "View Flowsheet" button)
  const [latestRunId, setLatestRunId] = useState(null);

  // Ref to track if context was loaded via loadConversation (skip useEffect fetch)
  const skipNextContextFetchRef = useRef(false);

  /**
   * Load conversation list from backend
   */
  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const data = await getConversations(50, 0, username);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversationsError(error.message);
    } finally {
      setConversationsLoading(false);
    }
  }, [username]);

  /**
   * Load context for a specific conversation
   */
  const loadConversationContext = useCallback(
    async (convId) => {
      if (!convId) {
        setCurrentContext(null);
        return;
      }

      setContextLoading(true);

      try {
        const context = await getContext(convId);
        setCurrentContext(context);
      } catch (error) {
        console.error("Failed to load conversation context:", error);
        // If conversation not found, clear it
        if (error.message === "Conversation not found") {
          setConversationId(null);
        }
        setCurrentContext(null);
      } finally {
        setContextLoading(false);
      }
    },
    [setConversationId],
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(
    async (convId) => {
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
        console.error("Failed to delete conversation:", error);
        return false;
      }
    },
    [conversationId, setConversationId, refreshConversations],
  );

  /**
   * Start a new conversation
   */
  const createNewConversation = useCallback(() => {
    setConversationId(null);
    setCurrentContext(null);
    setLatestRunId(null);
  }, [setConversationId]);

  /**
   * Update latest run ID (called after simulation completes)
   * Takes the first run_id from the array (most recent)
   */
  const updateLatestRunId = useCallback((runIds) => {
    if (runIds && runIds.length > 0) {
      setLatestRunId(runIds[0]);
    }
  }, []);

  /**
   * Load a conversation by ID (used when navigating to ResultsPage)
   * This loads the conversation context and sets it as active
   * Skips the automatic useEffect fetch by using a ref flag
   */
  const loadConversation = useCallback(
    async (convId) => {
      if (!convId) return;

      try {
        const context = await getContext(convId);

        // Set context FIRST
        setCurrentContext(context);

        // Extract latest run_id
        const runIds = context?.run_ids || [];
        setLatestRunId(runIds.length > 0 ? runIds[0] : null);

        // Mark that we should skip the next useEffect fetch
        skipNextContextFetchRef.current = true;

        // Set as active conversation (triggers useEffect but it will skip)
        setConversationId(convId);
      } catch (error) {
        console.error("Failed to load conversation:", error);
        throw error; // Re-throw so ResultsPage can handle redirect
      }
    },
    [setConversationId],
  );

  /**
   * Switch to a different conversation
   */
  const switchConversation = useCallback(
    (convId) => {
      setConversationId(convId);
    },
    [setConversationId],
  );

  // Load conversations on mount
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load context when conversation changes (skip if loadConversation was just called)
  useEffect(() => {
    let isMounted = true;

    const loadContext = async () => {
      if (!conversationId) {
        setCurrentContext(null);
        return;
      }

      // Skip if loadConversation was just called (it already loaded the context)
      if (skipNextContextFetchRef.current) {
        skipNextContextFetchRef.current = false;
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
        console.error("Failed to load conversation context:", error);
        if (isMounted) {
          // If conversation not found, clear it
          if (error.message === "Conversation not found") {
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
  }, [conversationId]); // Only depend on conversationId

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
    loadConversation,
    latestRunId,
    updateLatestRunId,

    // Auth
    username,

    // Actions
    deleteConversation,
    createNewConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to use chat context
 */
export function useChatContext() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }

  return context;
}

export default ChatContext;
