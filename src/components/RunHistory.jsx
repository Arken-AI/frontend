/**
 * RunHistory Component
 *
 * Displays a clickable list of run IDs for the current conversation.
 * Latest run appears at the top. Current run is highlighted.
 * Clicking a run navigates to /results/{runId}.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getConversationRunIds } from "../api/client";

export default function RunHistory({ conversationId }) {
  const { runId: currentRunId } = useParams();
  const navigate = useNavigate();

  const [runIds, setRunIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    const fetchRunIds = async () => {
      setLoading(true);
      setError(null);
      try {
        const ids = await getConversationRunIds(conversationId);
        if (!cancelled) {
          // Deduplicate while preserving order (newest first)
          const unique = [...new Set(ids)];
          setRunIds(unique);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch run history:", err);
          setError("Failed to load run history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRunIds();

    return () => {
      cancelled = true;
    };
  }, [conversationId, currentRunId]);

  // --- No conversation ---
  if (!conversationId) {
    return (
      <p className="text-sm text-gray-500 italic">
        No conversation linked to this run.
      </p>
    );
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  // --- Empty ---
  if (runIds.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No simulation runs yet.
      </p>
    );
  }

  // --- Run list (newest first, which is how the backend already returns them) ---
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-3">
        {runIds.length} simulation run{runIds.length !== 1 ? "s" : ""}
      </p>

      {runIds.map((rid, index) => {
        const isCurrent = rid === currentRunId;
        const label = index === 0 ? "Latest" : `Run ${runIds.length - index}`;

        return (
          <button
            key={rid}
            onClick={() => {
              if (!isCurrent) navigate(`/results/${rid}`);
            }}
            className={`
              w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm
              flex items-center gap-2 group
              ${
                isCurrent
                  ? "border-blue-400 bg-blue-50 text-blue-700 font-medium shadow-sm cursor-default"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
              }
            `}
            title={isCurrent ? "Currently viewing this run" : `Switch to ${rid}`}
          >
            {/* Indicator */}
            <span
              className={`flex-shrink-0 w-2 h-2 rounded-full ${
                isCurrent ? "bg-blue-500" : "bg-gray-300 group-hover:bg-blue-300"
              }`}
            />

            {/* Run ID (truncated) */}
            <span className="flex-1 truncate font-mono text-xs">
              {rid}
            </span>

            {/* Badge */}
            {isCurrent ? (
              <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                Current
              </span>
            ) : (
              <span className="flex-shrink-0 text-xs text-gray-400 group-hover:text-blue-500">
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
