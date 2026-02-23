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
 * @returns {Promise<Object>} Response with conversation_id, message, status, run_ids, tool_executions, token_usage
 */
export async function sendMessage({
  message,
  conversation_id = null,
  username = null,
  extra_metadata = null,
}) {
  const body = {
    conversation_id,
    message: message.trim(),
  };

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

/**
 * Get simulation run results by ID
 * @param {string} runId - Unique run identifier
 * @returns {Promise<Object>} Run result with data field containing full simulation response
 * @throws {Error} "Run not found" for 404, or other error messages
 */
export async function getRunResults(runId) {
  const response = await fetch(`${API_BASE}/runs/${runId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Run not found");
    }
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch run results" }));
    throw new Error(error.detail || "Failed to fetch run results");
  }

  return response.json();
}

/**
 * Get unified flowsheet merging all chained runs.
 * Walks chain_metadata upward to find the root, then downstream_runs
 * downward (BFS) to collect every run in the chain graph.
 * For standalone (unchained) runs, returns the same data wrapped in flowsheet format.
 *
 * @param {string} runId - Unique run identifier (any run in the chain)
 * @returns {Promise<Object>} Flowsheet response with merged data, run_map, all_run_ids
 * @throws {Error} "Run not found" for 404, or other error messages
 */
export async function getRunFlowsheet(runId) {
  const response = await fetch(`${API_BASE}/runs/${runId}/flowsheet`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Run not found");
    }
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch flowsheet" }));
    throw new Error(error.detail || "Failed to fetch flowsheet");
  }

  return response.json();
}

/**
 * List simulation runs with optional filters and pagination
 * @param {Object} params - Query parameters
 * @param {string|null} params.source - Filter by source: "calc_engine", "process_server", or null for both
 * @param {string|null} params.user_id - Filter by user ID
 * @param {string|null} params.process_id - Filter by process ID (e.g., "sugar", "ethanol")
 * @param {string|null} params.status - Filter by status: "pending", "running", "completed", "failed", "error"
 * @param {number} params.limit - Maximum number of runs to return (default 20, max 100)
 * @returns {Promise<Object>} { runs: [], has_more: boolean }
 */
export async function listRuns({
  source = null,
  user_id = null,
  process_id = null,
  status = null,
  limit = 20,
} = {}) {
  // Build query parameters
  const params = new URLSearchParams();
  if (source) params.append("source", source);
  if (user_id) params.append("user_id", user_id);
  if (process_id) params.append("process_id", process_id);
  if (status) params.append("status", status);
  params.append("limit", limit.toString());

  const response = await fetch(`${API_BASE}/runs?${params.toString()}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to fetch runs list" }));
    throw new Error(error.detail || "Failed to fetch runs list");
  }

  return response.json();
}
