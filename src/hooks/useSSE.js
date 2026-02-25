/**
 * SSE (Server-Sent Events) Hook
 *
 * Manages EventSource connection for real-time event streaming.
 * Handles reconnection with sequence tracking.
 */

import { useEffect, useRef, useState } from "react";
import { getStreamUrl } from "../api/client";

/**
 * Hook to manage SSE connection
 * @param {string|null} conversationId - Conversation ID to stream events for
 * @param {function} onEvent - Callback for each event received
 * @param {boolean} enabled - Whether to connect (default: true)
 * @param {string|null} customStreamUrl - Custom stream URL (overrides conversationId if provided)
 * @param {number} initialSequence - Starting sequence number for existing conversations (default: 0)
 * @returns {Object} { isConnected, lastSequence, error, reconnect }
 */
export function useSSE(
  conversationId,
  onEvent,
  enabled = true,
  customStreamUrl = null,
  initialSequence = 0,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSequence, setLastSequence] = useState(initialSequence);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const enabledRef = useRef(enabled);

  // Step 2: Use a ref so connect() and reconnect always read the latest
  // sequence instead of a stale closure value.
  const lastSequenceRef = useRef(initialSequence);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  // Keep refs in sync with props
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    lastSequenceRef.current = initialSequence;
    setLastSequence(initialSequence);
  }, [conversationId, initialSequence]);

  const connect = () => {
    if ((!conversationId && !customStreamUrl) || !enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Step 2: Read sequence from ref (always current)
      const url =
        customStreamUrl ||
        getStreamUrl(conversationId, lastSequenceRef.current);
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("[SSE] Connected to stream:", conversationId);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      // Step 3: No onmessage handler — all backend events use named types
      // (event: tool_start, etc.) so onmessage never fires for them.
      // Keepalive lines (":keepalive") are SSE comments and are silently
      // ignored by the browser, so no handler is needed.

      // Named event listeners for each event type
      const eventTypes = [
        "thinking_start",
        "thinking_end",
        "tool_start",
        "tool_end",
        "run_progress",
        "app_error",
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (e) => {
          try {
            const event = JSON.parse(e.data);

            // Step 2: Update both ref and state
            if (event.sequence) {
              lastSequenceRef.current = event.sequence;
              setLastSequence(event.sequence);
            }

            onEvent(event);
          } catch (err) {
            console.error(`[SSE] Failed to parse ${eventType} event:`, err);
          }
        });
      });

      eventSource.onerror = (err) => {
        const readyState = eventSource.readyState;

        // Server closed the connection gracefully (e.g. after thinking_end)
        if (readyState === EventSource.CLOSED) {
          console.log("[SSE] Stream completed successfully");
          setIsConnected(false);
          eventSource.close();
          return;
        }

        console.error("[SSE] Connection error:", err);
        setIsConnected(false);
        eventSource.close();

        if (!enabledRef.current) {
          console.log("[SSE] Stream ended - not reconnecting (disabled)");
          return;
        }

        // Auto-reconnect with linear backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;

          setError(`Connection lost. Reconnecting in ${delay / 1000}s...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (!enabledRef.current) {
              console.log("[SSE] Cancelling reconnect - streaming disabled");
              return;
            }
            console.log(
              `[SSE] Reconnecting (attempt ${reconnectAttemptsRef.current})...`,
            );
            // Step 2: connect() will read lastSequenceRef.current — always fresh
            connect();
          }, delay);
        } else {
          setError("Connection lost. Please refresh the page.");
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("[SSE] Failed to create EventSource:", err);
      setError("Failed to connect to event stream");
      setIsConnected(false);
    }
  };

  // Manual reconnect
  const reconnect = () => {
    reconnectAttemptsRef.current = 0;
    setError(null);
    connect();
  };

  useEffect(() => {
    if (enabled && conversationId) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
      setError(null);
    };
  }, [conversationId, enabled]);

  return {
    isConnected,
    lastSequence,
    error,
    reconnect,
  };
}
