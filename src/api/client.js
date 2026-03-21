/**
 * API Client for Backend Communication
 *
 * Provides functions to interact with the FastAPI backend.
 *
 * Architecture:
 * - POST /chat: Send message and receive complete response (synchronous)
 * - SSE /chat/{id}/stream: Optional real-time tool progress updates
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

/**
 * Login user with username and shared password
 * @param {Object} params - Login parameters
 * @param {string} params.username - Username
 * @param {string} params.password - Password
 * @returns {Promise<Object>} { success, username, error }
 */
export async function loginUser({ username, password }) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        username: null,
        error: data.detail || "Invalid credentials",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        username: null,
        error: "Unable to connect. Please try again later.",
      };
    }

    const data = await response.json();
    return { success: true, username: data.username, error: null };
  } catch {
    return {
      success: false,
      username: null,
      error: "Unable to connect. Please try again later.",
    };
  }
}

/**
 * Send a chat message and wait for complete response
 * @param {Object} params - Message parameters
 * @param {string} params.message - User message
 * @param {string|null} params.conversation_id - Existing conversation ID or null for new
 * @param {string|null} params.username - Username for user_id metadata
 * @param {Object|null} params.extra_metadata - Additional metadata merged alongside user_id
 * @param {Array|null} params.attachments - Image attachments [{media_type, data, filename}]
 * @returns {Promise<Object>} Response with conversation_id, message, status, run_ids, tool_executions, token_usage
 */
export async function sendMessage({
  message,
  conversation_id = null,
  username = null,
  extra_metadata = null,
  attachments = null,
  signal = null,
}) {
  const body = {
    conversation_id,
    message: message.trim(),
  };

  // Add attachments if present
  if (attachments && attachments.length > 0) {
    body.attachments = attachments.map((att) => ({
      media_type: att.media_type,
      data: att.data,
      filename: att.filename || null,
    }));
  }

  // Merge user_id and any extra_metadata (e.g. re_simulation payload)
  const metadataBase = username ? { user_id: username.toLowerCase() } : {};
  const merged = extra_metadata
    ? { ...metadataBase, ...extra_metadata }
    : metadataBase;
  if (Object.keys(merged).length > 0) {
    body.metadata = merged;
  }

  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
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
 * Cancel an in-flight request for a conversation.
 * Tells the backend to stop streaming Claude's response.
 * Optionally sends the partial streamed text so the backend can persist it.
 * @param {string} conversationId
 * @param {string} [partialMessage] - Partial response text captured by the frontend
 */
export async function cancelMessage(conversationId, partialMessage = "") {
  try {
    await fetch(`${API_BASE}/chat/${conversationId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partial_message: partialMessage || "" }),
    });
  } catch {
    // Best-effort — ignore network errors on cancel
  }
}

/**
 * Retry the last user message in a conversation.
 *
 * Tells the backend to delete the stale assistant response (and user msg)
 * from the DB, then re-process the same user message through Claude.
 *
 * @param {string} conversationId - Conversation to retry in
 * @returns {Promise<Object>} Same shape as sendMessage response
 */
export async function retryMessage(conversationId, signal = null) {
  const response = await fetch(`${API_BASE}/chat/${conversationId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(error.message || error.error || "Failed to retry message");
  }

  return response.json();
}

/**
 * Get list of conversations
 * @param {number} limit - Maximum number of conversations
 * @param {number} offset - Number to skip
 * @returns {Promise<Object>} { conversations: [], total: number }
 */
export async function getConversations(
  limit = 50,
  offset = 0,
  username = null,
) {
  let url = `${API_BASE}/conversations?limit=${limit}&offset=${offset}`;
  if (username) {
    url += `&username=${encodeURIComponent(username.toLowerCase())}`;
  }
  const response = await fetch(url);

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
 * Get SSE stream URL for a conversation (used for tool progress updates)
 * @param {string} conversationId - Conversation ID
 * @param {number} afterSequence - Resume from this sequence number
 * @returns {string} SSE endpoint URL
 */
export function getStreamUrl(conversationId, afterSequence = 0) {
  return `${API_BASE}/chat/${conversationId}/stream?after_sequence=${afterSequence}`;
}
