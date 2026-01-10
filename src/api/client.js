/**
 * API Client for Backend Communication
 *
 * Provides functions to interact with the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

/**
 * Send a chat message
 * @param {string|null} conversationId - Existing conversation ID or null for new
 * @param {string} message - User message
 * @returns {Promise<Object>} Response with conversation_id, message, run_ids, etc.
 */
export async function sendMessage(conversationId, message) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      message: message.trim(),
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(error.message || error.error || "Failed to send message");
  }

  return response.json();
}

/**
 * Get list of conversations
 * @param {number} limit - Maximum number of conversations
 * @param {number} offset - Number to skip
 * @returns {Promise<Object>} { conversations: [], total: number }
 */
export async function getConversations(limit = 50, offset = 0) {
  const response = await fetch(
    `${API_BASE}/conversations?limit=${limit}&offset=${offset}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }

  return response.json();
}

/**
 * Get conversation context (message history, tools executed, etc.)
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object>} Conversation context with messages, run_ids, etc.
 */
export async function getContext(conversationId) {
  const response = await fetch(`${API_BASE}/chat/${conversationId}/context`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Conversation not found");
    }
    throw new Error("Failed to fetch conversation context");
  }

  return response.json();
}

/**
 * Delete a conversation
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<void>}
 */
export async function deleteConversation(conversationId) {
  const response = await fetch(`${API_BASE}/chat/${conversationId}`, {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error("Failed to delete conversation");
  }
}

/**
 * Check backend health
 * @returns {Promise<Object>} Health status
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error("Backend is unhealthy");
  }

  return response.json();
}

/**
 * Get SSE stream URL for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {number} afterSequence - Resume from this sequence number
 * @returns {string} SSE endpoint URL
 */
export function getStreamUrl(conversationId, afterSequence = 0) {
  return `${API_BASE}/chat/${conversationId}/stream?after_sequence=${afterSequence}`;
}
