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
  initialSequence = 0
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastSequence, setLastSequence] = useState(initialSequence);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const enabledRef = useRef(enabled); // Track enabled state in ref

  // Maximum reconnect attempts
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds

  // Update enabled ref when it changes
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Reset lastSequence when conversationId changes
  useEffect(() => {
    setLastSequence(initialSequence);
  }, [conversationId, initialSequence]);

  const connect = () => {
    if ((!conversationId && !customStreamUrl) || !enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const url = customStreamUrl || getStreamUrl(conversationId, lastSequence);
      const eventSource = new EventSource(url);

      eventSource.onopen = () => {
        console.log("[SSE] Connected to stream:", conversationId);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);

          // Update last sequence
          if (event.sequence) {
            setLastSequence(event.sequence);
          }

          // Call event handler
          onEvent(event);
        } catch (err) {
          console.error("[SSE] Failed to parse event:", err);
        }
      };

      // Listen for specific event types
      const eventTypes = [
        "thinking_start",
        "thinking_end",
        "tool_start",
        "tool_end",
        "run_progress",
        "message_delta",
        "message_final",
        "app_error",
      ];

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (e) => {
          try {
            const event = JSON.parse(e.data);

            // Update last sequence
            if (event.sequence) {
              setLastSequence(event.sequence);
            }

            onEvent(event);
          } catch (err) {
            console.error(`[SSE] Failed to parse ${eventType} event:`, err);
          }
        });
      });

      eventSource.onerror = (err) => {
        // Check the readyState to see if stream closed naturally
        const readyState = eventSource.readyState;

        // If readyState is CLOSED (2), the server closed the connection
        // This is normal after message_final, so don't treat it as an error
        if (readyState === EventSource.CLOSED) {
          console.log("[SSE] Stream completed successfully");
          setIsConnected(false);
          eventSource.close();
          return;
        }

        // For other errors, log them
        console.error("[SSE] Connection error:", err);
        setIsConnected(false);
        eventSource.close();

        // Don't reconnect if streaming is disabled
        if (!enabledRef.current) {
          console.log("[SSE] Stream ended - not reconnecting (disabled)");
          return;
        }

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;

          setError(`Connection lost. Reconnecting in ${delay / 1000}s...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            // Double-check enabled state before reconnecting
            if (!enabledRef.current) {
              console.log("[SSE] Cancelling reconnect - streaming disabled");
              return;
            }
            console.log(
              `[SSE] Reconnecting (attempt ${reconnectAttemptsRef.current})...`
            );
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

  // Manual reconnect function
  const reconnect = () => {
    reconnectAttemptsRef.current = 0;
    setError(null);
    connect();
  };

  useEffect(() => {
    let isActive = true; // Track if effect is still active

    if (enabled && conversationId) {
      connect();
    }

    // Cleanup
    return () => {
      isActive = false; // Mark as inactive

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Reset state
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
