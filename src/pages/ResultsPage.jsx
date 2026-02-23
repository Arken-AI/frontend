/**
 * Results Page
 *
 * The 3-panel results viewer at route "/results/:runId"
 * Displays flowsheet diagram, equipment details, and contextual chat.
 * Panel switching controlled by Zustand store.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import FlowCanvas from "../components/FlowCanvas";
import ChatPanel from "../components/chat/ChatPanel";
import {
  transformEquipmentData,
  getWarningsData,
} from "../data/mockSimulationData";
import useSelectionStore from "../store/useSelectionStore";
import useEquipmentStore from "../stores/useEquipmentStore";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { ActivityBar } from "../components/layout";
import { getRunResults, getRunFlowsheet, sendMessage } from "../api/client";
import { useChatContext } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { PFDReportModal } from "../components/PFDReport";
import { DetailedReportButton } from "../components/DetailedReport";

// Sidebar sections configuration
const SIDEBAR_SECTIONS = [
  {
    id: "equipment",
    icon: "📁",
    label: "Equipment Browser",
    title: "Equipment",
  },
  { id: "details", icon: "📋", label: "Details", title: "Details" },
  {
    id: "thermodynamics",
    icon: "🌡️",
    label: "Thermodynamics",
    title: "Thermodynamics",
  },
  { id: "warnings", icon: "⚠️", label: "Warnings", title: "Warnings" },
  { id: "history", icon: "📊", label: "Run History", title: "Run History" },
];

// Sidebar size constraints
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 500;
const SIDEBAR_DEFAULT_WIDTH = 370;
const SIDEBAR_COLLAPSE_THRESHOLD = 150;

// Right chat panel size constraints
const CHAT_MIN_WIDTH = 280;
const CHAT_MAX_WIDTH = 500;
const CHAT_DEFAULT_WIDTH = 320;
const CHAT_COLLAPSE_THRESHOLD = 200;

export default function ResultsPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { loadConversation, appendMessagesToContext } = useChatContext();
  const { username } = useAuth();

  // API response state for simulation results
  const [apiResponse, setApiResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Flowsheet chain state
  const [runMap, setRunMap] = useState(null); // equipment_id → run_id
  const [allRunIds, setAllRunIds] = useState([]);

  // Increment to force re-fetch even when runId stays the same (re-simulation)
  const [fetchCounter, setFetchCounter] = useState(0);

  // Get active panel and selection from Zustand store
  const {
    activePanel,
    setActivePanel,
    selectedEquipmentId,
    selectEquipment,
    clearSelection,
  } = useSelectionStore();

  // Get equipment parameter state from store
  const {
    hasUnsavedChanges,
    hasValidationErrors,
    getEditedCount,
    resetAll,
    getCompoundMappingForPayload,
    compoundMappingErrors,
    editedParams,
  } = useEquipmentStore();

  // Left sidebar state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);

  // Right chat panel state
  const [isRightChatOpen, setIsRightChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT_WIDTH);

  // PFD Report modal state
  const [isPFDReportOpen, setIsPFDReportOpen] = useState(false);

  // Re-simulation in-flight lock
  const [isSimulating, setIsSimulating] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const dragStartX = useRef(0);

  // Track loaded conversation to prevent duplicate loads
  const loadedConversationRef = useRef(null);
  const dragStartWidth = useRef(0);

  // Ref for PFD container (used by DetailedReportButton for canvas capture)
  const pfdContainerRef = useRef(null);

  // Ref for FlowCanvas component (exposes getFullFlowsheetPng method)
  const flowCanvasRef = useRef(null);

  // Derive equipment data from API response
  const equipmentData = useMemo(() => {
    if (!apiResponse?.data) return [];
    // DEBUG: Log raw API response to verify constraints are present
    console.log("[Step 1] Raw API Response:", apiResponse.data);
    console.log(
      "[Step 1] Feed streams with constraints:",
      apiResponse.data?.input?.feed_streams,
    );
    // Transform works for both calc_engine and process_server sources
    const transformed = transformEquipmentData(apiResponse.data);
    console.log("[Step 2] Transformed equipment data:", transformed);
    return transformed;
  }, [apiResponse]);

  // Detect template type and chain metadata from API response
  const templateType = apiResponse?.template_type || null;
  const isSingleEquipment = templateType === "single_equipment";
  const chainMetadata = apiResponse?.chain_metadata || null;
  const compounds = apiResponse?.data?.input?.compounds || [];

  // Derive warnings data from equipment data
  const warningsData = useMemo(() => {
    if (!apiResponse?.data || equipmentData.length === 0) {
      return { equipmentWarnings: {}, globalWarnings: [], totalCount: 0 };
    }
    return getWarningsData(equipmentData, apiResponse.data);
  }, [equipmentData, apiResponse]);

  // Fetch simulation results when runId changes
  useEffect(() => {
    let isMounted = true; // Cleanup flag

    const fetchResults = async () => {
      if (!runId) {
        setError("No run ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try the unified flowsheet endpoint first (merges chained runs),
        // falling back to single-run endpoint for older runs or if
        // the flowsheet endpoint is unavailable.
        let result;
        try {
          const flowsheet = await getRunFlowsheet(runId);
          result = {
            ...flowsheet,
            data: flowsheet.data,
            chain_metadata: flowsheet.chain_metadata,
          };
          // Store chain/flowsheet state
          if (isMounted) {
            setRunMap(flowsheet.run_map || null);
            setAllRunIds(flowsheet.all_run_ids || []);
          }
        } catch (flowsheetErr) {
          // Fallback: use single-run endpoint
          console.warn(
            "Flowsheet endpoint unavailable, falling back to single run:",
            flowsheetErr.message,
          );
          result = await getRunResults(runId);
          if (isMounted) {
            setRunMap(null);
            setAllRunIds([]);
          }
        }

        // Only update state if component is still mounted
        if (isMounted) {
          // Check if run data exists
          if (!result) {
            navigate("/");
            return;
          }

          setApiResponse(result);
          resetAll(); // Phase 6: clear any stale edits when new results load

          // Restore compound mapping from the persisted run so
          // re-simulation payloads always include it for single-equipment
          // templates with generic compounds.
          // NOTE: setCompoundMapping would set hasUnsavedChanges=true since the
          // mapping has values. We set the mapping directly without triggering
          // the "unsaved" flag because this is the saved baseline, not a user edit.
          if (result.compound_mapping && typeof result.compound_mapping === 'object') {
            useEquipmentStore.setState({
              compoundMapping: result.compound_mapping,
              compoundMappingErrors: {},
              // hasUnsavedChanges stays false — this is baseline, not an edit
            });
          }

          // Load conversation if conversation_id exists and not already loaded
          if (
            result.conversation_id &&
            loadedConversationRef.current !== result.conversation_id
          ) {
            try {
              loadedConversationRef.current = result.conversation_id;
              await loadConversation(result.conversation_id);

              // After loadConversation overwrites currentContext, re-apply any
              // messages that were passed through navigation state (from re-simulation).
              // This beats the overwrite race because we run immediately after the fetch.
              const pending = location.state?.pendingMessages;
              if (pending && pending.length > 0) {
                appendMessagesToContext(pending);
                // Clear nav state so a hard-refresh doesn't re-inject them
                navigate(location.pathname, { replace: true, state: {} });
              }
            } catch (convError) {
              console.error("Failed to load conversation:", convError);
              // Continue even if conversation fails to load
            }
          }

          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load simulation results");
          setLoading(false);
          toast.error(err.message || "Failed to load simulation results");
          // Redirect to home on error
          navigate("/");
        }
      }
    };

    fetchResults();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [runId, navigate, fetchCounter]);

  // Ensure sidebar opens when active panel changes (e.g., from Warnings "View Equipment")
  useEffect(() => {
    if (activePanel) {
      setIsLeftSidebarOpen(true);
    }
  }, [activePanel]);

  // Ensure sidebar opens when equipment is selected (even if panel is already "equipment")
  useEffect(() => {
    if (selectedEquipmentId) {
      setIsLeftSidebarOpen(true);
    }
  }, [selectedEquipmentId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key) {
        case "Escape":
          // Clear selection
          clearSelection();
          break;

        case "Tab":
          e.preventDefault();
          // Cycle through equipment
          if (equipmentData.length === 0) return;

          const currentIndex = selectedEquipmentId
            ? equipmentData.findIndex((eq) => eq.id === selectedEquipmentId)
            : -1;

          let nextIndex;
          if (e.shiftKey) {
            // Shift+Tab: previous equipment
            nextIndex =
              currentIndex <= 0 ? equipmentData.length - 1 : currentIndex - 1;
          } else {
            // Tab: next equipment
            nextIndex =
              currentIndex >= equipmentData.length - 1 ? 0 : currentIndex + 1;
          }

          selectEquipment(equipmentData[nextIndex].id);
          break;

        case "ArrowDown":
        case "ArrowUp":
          e.preventDefault();
          // Navigate through equipment list
          if (equipmentData.length === 0) return;

          const currentIdx = selectedEquipmentId
            ? equipmentData.findIndex((eq) => eq.id === selectedEquipmentId)
            : -1;

          let newIdx;
          if (e.key === "ArrowDown") {
            newIdx =
              currentIdx >= equipmentData.length - 1 ? 0 : currentIdx + 1;
          } else {
            newIdx =
              currentIdx <= 0 ? equipmentData.length - 1 : currentIdx - 1;
          }

          selectEquipment(equipmentData[newIdx].id);
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEquipmentId, selectEquipment, clearSelection, equipmentData]);

  // Handle activity bar icon click
  const handleActivityBarClick = (sectionId) => {
    if (activePanel === sectionId && isLeftSidebarOpen) {
      // Clicking active section when open → close sidebar
      setIsLeftSidebarOpen(false);
    } else {
      // Clicking different section OR clicking when closed → open and switch
      setActivePanel(sectionId);
      setIsLeftSidebarOpen(true);
    }
  };

  // Handle drag start
  const handleDragStart = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = sidebarWidth;

      // Add event listeners for drag
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    },
    [sidebarWidth],
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e) => {
      const delta = e.clientX - dragStartX.current;
      let newWidth = dragStartWidth.current + delta;

      // Collapse if dragged below threshold
      if (newWidth < SIDEBAR_COLLAPSE_THRESHOLD) {
        setIsLeftSidebarOpen(false);
        return;
      }

      // Ensure sidebar is open when dragging
      if (!isLeftSidebarOpen && newWidth >= SIDEBAR_COLLAPSE_THRESHOLD) {
        setIsLeftSidebarOpen(true);
      }

      // Clamp to min/max
      newWidth = Math.max(
        SIDEBAR_MIN_WIDTH,
        Math.min(SIDEBAR_MAX_WIDTH, newWidth),
      );
      setSidebarWidth(newWidth);
    },
    [isLeftSidebarOpen],
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
  }, [handleDragMove]);

  // Handle double-click to toggle
  const handleDoubleClick = () => {
    setIsLeftSidebarOpen(!isLeftSidebarOpen);
  };

  // Handle chat panel drag start
  const handleChatDragStart = useCallback(
    (e) => {
      e.preventDefault();
      setIsDraggingChat(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = chatWidth;

      document.addEventListener("mousemove", handleChatDragMove);
      document.addEventListener("mouseup", handleChatDragEnd);
    },
    [chatWidth],
  );

  // Handle chat panel drag move
  const handleChatDragMove = useCallback(
    (e) => {
      // For right panel, dragging left increases width
      const delta = dragStartX.current - e.clientX;
      let newWidth = dragStartWidth.current + delta;

      // Collapse if dragged below threshold
      if (newWidth < CHAT_COLLAPSE_THRESHOLD) {
        setIsRightChatOpen(false);
        return;
      }

      // Ensure panel is open when dragging
      if (!isRightChatOpen && newWidth >= CHAT_COLLAPSE_THRESHOLD) {
        setIsRightChatOpen(true);
      }

      // Clamp to min/max
      newWidth = Math.max(CHAT_MIN_WIDTH, Math.min(CHAT_MAX_WIDTH, newWidth));
      setChatWidth(newWidth);
    },
    [isRightChatOpen],
  );

  // Handle chat panel drag end
  const handleChatDragEnd = useCallback(() => {
    setIsDraggingChat(false);
    document.removeEventListener("mousemove", handleChatDragMove);
    document.removeEventListener("mouseup", handleChatDragEnd);
  }, [handleChatDragMove]);

  // Handle chat double-click to toggle
  const handleChatDoubleClick = () => {
    setIsRightChatOpen(!isRightChatOpen);
  };

  // Handle discard changes
  const handleDiscardChanges = () => {
    if (isSimulating) {
      toast.error("Cannot discard while simulation is running");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to discard all changes? This cannot be undone.",
      )
    ) {
      resetAll();
      // Restore compound mapping baseline — resetAll() wipes it but the
      // run's mapping is still the correct baseline for the next edit cycle.
      if (apiResponse?.compound_mapping && typeof apiResponse.compound_mapping === 'object') {
        useEquipmentStore.setState({
          compoundMapping: apiResponse.compound_mapping,
          compoundMappingErrors: {},
        });
      }
      toast.success("All changes discarded");
    }
  };

  // Handle back to chat with unsaved changes check
  const handleBackToChat = (e) => {
    if (isSimulating) {
      e.preventDefault();
      toast.error("Cannot navigate away while simulation is running");
      return;
    }
    if (hasUnsavedChanges) {
      e.preventDefault();
      if (
        window.confirm(
          "You have unsaved changes. Discard changes and return to chat?",
        )
      ) {
        resetAll();
        navigate("/");
      }
    }
  };

  // Handle simulate button click
  const handleSimulate = async () => {
    // --- Guard 1: validation errors ---
    if (hasValidationErrors()) {
      toast.error("Please fix validation errors before simulating");
      return;
    }

    // --- Guard 2: compound mapping errors (single-equipment templates) ---
    if (Object.keys(compoundMappingErrors).length > 0) {
      toast.error("Please fix compound mapping errors before simulating");
      return;
    }

    // --- Guard 3: nothing edited ---
    if (!hasUnsavedChanges) {
      toast.error("No changes to simulate");
      return;
    }

    // --- Guard 4: no conversation context to re-simulate into ---
    const conversationId = apiResponse?.conversation_id;
    if (!conversationId) {
      toast.error(
        "This run has no linked conversation. Open a new chat to re-simulate.",
      );
      return;
    }

    // --- Guard 5: already simulating ---
    if (isSimulating) return;

    // ---------------------------------------------------------------
    // Phase 0: Classify edited params into feed-stream edits vs
    // equipment-parameter edits so the backend knows which MCP tool
    // argument to populate.
    //
    // editedParams shape: { equipmentId: { paramName: value } }
    // Feed streams live in apiResponse.data.input.feed_streams and
    // are identified by stream_id.
    // ---------------------------------------------------------------
    const feedStreamIds = new Set(
      (apiResponse?.data?.input?.feed_streams || []).map((f) => f.stream_id),
    );

    const feedStreamEdits = {};   // { stream_id: { prop: value } }
    const equipmentParamEdits = {}; // { equip_id: { param: value } }

    Object.entries(editedParams).forEach(([id, params]) => {
      if (feedStreamIds.has(id)) {
        // This id is a feed stream — every key is a stream property
        feedStreamEdits[id] = { ...params };
      } else {
        // This id is an equipment node — every key is a process parameter
        equipmentParamEdits[id] = { ...params };
      }
    });

    // Include compound mapping if present (single-equipment templates)
    const compoundMapping = getCompoundMappingForPayload();

    // Collect all context the backend needs to build the MCP tool call
    const simulationPayload = {
      conversation_id: conversationId,
      process_id: apiResponse?.process_id || null,
      source: apiResponse?.source || null,         // "calc_engine" | "process_server"
      template_type: apiResponse?.template_type || null, // "single_equipment" | "process"
      parent_run_id: runId,
      equipment_param_edits: equipmentParamEdits,  // { equip_id: { param: val } }
      feed_stream_edits: feedStreamEdits,          // { stream_id: { prop: val } }
      ...(compoundMapping ? { compound_mapping: compoundMapping } : {}),
    };

    console.log("[Simulate] Payload classified:", simulationPayload);
    console.log(
      "[Simulate] Equipment edits:",
      Object.keys(equipmentParamEdits).length,
      "| Feed stream edits:",
      Object.keys(feedStreamEdits).length,
    );

    // ---------------------------------------------------------------
    // Phase 1: Build the chat message and call sendMessage()
    // ---------------------------------------------------------------

    // Human-readable summary for the message text
    const editSummaryParts = [];
    Object.entries(equipmentParamEdits).forEach(([equipId, params]) => {
      const paramStr = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      editSummaryParts.push(`${equipId}: ${paramStr}`);
    });
    Object.entries(feedStreamEdits).forEach(([streamId, props]) => {
      const propStr = Object.entries(props)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      editSummaryParts.push(`feed stream ${streamId}: ${propStr}`);
    });

    const messageText =
      `Parameter update — please re-simulate.\n` +
      `Changes: ${editSummaryParts.join(" | ") || "(see metadata)"}\n` +
      `Process: ${apiResponse?.process_id || "unknown"}`;

    setIsSimulating(true);
    setIsRightChatOpen(true); // Phase 5d: open now so SSE tool events stream in real time
    const loadingToast = toast.loading("Simulating…");

    // --- Fix 1: inject user message IMMEDIATELY so it appears in the
    // chat panel before the (potentially long) backend call starts. ---
    const userMessage = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    appendMessagesToContext([userMessage]);

    try {
      const response = await sendMessage({
        message: messageText,
        conversation_id: conversationId,
        username,
        extra_metadata: {
          re_simulation: true,
          ...simulationPayload,
        },
      });

      toast.dismiss(loadingToast);

      // Extract new run_id from response
      const newRunId = response.run_ids?.[0];

      if (!newRunId) {
        toast.error(
          response.message ||
            "Simulation completed but no run ID returned. Check chat for details.",
        );
        return;
      }

      // Build the assistant message now that we have the response
      const assistantMessage = {
        role: "assistant",
        content: response.message || "",
        timestamp: new Date().toISOString(),
        run_ids: response.run_ids,
        tool_executions: response.tool_executions,
      };

      // Inject assistant reply into current page's chat panel too
      appendMessagesToContext([assistantMessage]);

      // Clear edits — new results are now the baseline
      resetAll();
      toast.success("Simulation complete — loading new results…");

      if (newRunId !== runId) {
        // Different run ID — navigate to it (triggers fetchResults via runId change)
        navigate(`/results/${newRunId}`, {
          replace: false,
          state: {
            pendingMessages: [userMessage, assistantMessage],
          },
        });
      } else {
        // Same run ID (e.g. backend reused the ID) — force re-fetch
        // by bumping fetchCounter since runId didn't change.
        setFetchCounter((c) => c + 1);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Simulation failed. Please try again.");
      console.error("[Simulate] sendMessage error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Warn user before leaving page with unsaved changes or active simulation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges || isSimulating) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isSimulating]);

  // Get current section config
  const currentSection = SIDEBAR_SECTIONS.find((s) => s.id === activePanel);

  return (
    <div
      className={`h-screen flex flex-col bg-gray-50 ${isDragging || isDraggingChat ? "select-none" : ""}`}
    >
      {/* Header */}
      <header className="h-12 border-b border-gray-100 flex items-center px-4 bg-white shadow-sm">
        {/* Left Side */}
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-base font-bold text-gray-900">ARKEN AI</h1>
          <span className="text-gray-300">›</span>
          <span className="text-sm font-medium text-gray-600">
            Simulation Results
          </span>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-100 rounded-lg text-xs">
            <span className="text-gray-500">Run:</span>
            <span className="font-medium text-gray-700">{runId}</span>
          </div>

          {/* Pending Changes Indicator */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 border border-orange-300 text-orange-600 bg-orange-50 rounded-full text-xs font-medium">
              <span>⚠</span>
              <span>{getEditedCount()} param{getEditedCount() !== 1 ? 's' : ''} modified</span>
            </div>
          )}
        </div>

        {/* Right Side - Reordered buttons */}
        <div className="flex items-center gap-2">
          {/* Simulate Button */}
          <button
            onClick={handleSimulate}
            disabled={!hasUnsavedChanges || hasValidationErrors() || isSimulating}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
            title={
              isSimulating
                ? "Simulation in progress..."
                : hasValidationErrors()
                  ? "Fix validation errors first"
                  : !hasUnsavedChanges
                    ? "No changes to simulate"
                    : "Run simulation with edited parameters"
            }
          >
            {isSimulating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Simulating…
              </>
            ) : hasUnsavedChanges ? (
              "Run Simulation"
            ) : (
              "Simulate"
            )}
          </button>

          {/* Discard Changes Button — hidden while simulating */}
          {hasUnsavedChanges && !isSimulating && (
            <button
              onClick={handleDiscardChanges}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-300"
              title="Discard all changes"
            >
              Discard
            </button>
          )}

          {/* PFD Report Button */}
          <button
            onClick={() => setIsPFDReportOpen(true)}
            disabled={!apiResponse?.data}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Generate PFD Report with material balance table"
          >
            <span>📊</span>
            <span>PFD Report</span>
          </button>

          {/* Detailed Report Button (AI-powered PDF generation) */}
          <DetailedReportButton
            runId={runId}
            pfdContainerRef={pfdContainerRef}
            flowCanvasRef={flowCanvasRef}
            disabled={!apiResponse?.data}
          />

          {/* Back to Chat Link */}
          <Link
            to="/"
            onClick={handleBackToChat}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back to Chat
          </Link>

          {/* Chat Toggle Button */}
          {!isRightChatOpen && (
            <button
              onClick={() => setIsRightChatOpen(true)}
              className="w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm"
              title="Open Chat"
            >
              <span className="text-sm">💬</span>
            </button>
          )}
        </div>
      </header>

      {/* Chain Provenance Banner */}
      {chainMetadata && (
        <div
          className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 flex items-center gap-3"
          data-testid="chain-provenance-banner"
        >
          <span className="text-indigo-500 text-sm">🔗</span>
          <span className="text-sm text-indigo-700">
            Fed from{" "}
            <strong>
              {chainMetadata.source_equipment_id || "upstream equipment"}
            </strong>
            {chainMetadata.source_port && (
              <>
                {" "}
                (port:{" "}
                <code className="text-xs bg-indigo-100 px-1 rounded">
                  {chainMetadata.source_port}
                </code>
                )
              </>
            )}{" "}
            in run{" "}
            <Link
              to={`/results/${chainMetadata.source_run_id}`}
              className="font-medium underline hover:text-indigo-900 transition-colors"
            >
              {chainMetadata.source_run_id}
            </Link>
          </span>
          {chainMetadata.extracted_stream && (
            <span className="text-xs text-indigo-500 ml-auto">
              {chainMetadata.extracted_stream.flow_rate &&
                `${chainMetadata.extracted_stream.flow_rate.toFixed(1)} mol/s`}
              {chainMetadata.extracted_stream.temperature_K &&
                ` @ ${chainMetadata.extracted_stream.temperature_K.toFixed(1)} K`}
            </span>
          )}
        </div>
      )}

      {/* Main Content - 3 Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          sections={SIDEBAR_SECTIONS.map((s) => ({
            ...s,
            badge: s.id === "warnings" ? warningsData.totalCount : undefined,
          }))}
          activeSection={activePanel}
          onSectionClick={handleActivityBarClick}
          collapsed={!isLeftSidebarOpen}
        />

        {/* Left Sidebar - Resizable */}
        <div
          className="bg-surface flex flex-shrink-0 relative"
          style={{
            width: isLeftSidebarOpen ? sidebarWidth : 0,
            transition: isDragging ? "none" : "width 200ms ease-in-out",
          }}
        >
          {/* Sidebar Content Container */}
          <div
            className="flex flex-col overflow-hidden h-full bg-white"
            style={{ width: sidebarWidth }}
          >
            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b-2 border-gray-900 bg-white">
              <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
                {currentSection?.label}
              </h2>
            </div>

            {/* Sidebar Content */}
            <div
              className={`flex-1 overflow-auto ${activePanel === "warnings" ? "" : "p-4"}`}
            >
              <ErrorBoundary fallbackMessage="Unable to load this panel. Please try refreshing the page.">
                <SidebarContent
                  section={activePanel}
                  equipmentData={equipmentData}
                  warningsData={warningsData}
                  templateType={templateType}
                  compounds={compounds}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group z-10
              ${isDragging ? "bg-primary" : "bg-transparent hover:bg-primary"}
              transition-colors duration-150`}
            onMouseDown={handleDragStart}
            onDoubleClick={handleDoubleClick}
          >
            {/* Wider hit area for easier grabbing */}
            <div className="absolute -left-1 -right-1 top-0 bottom-0" />
          </div>
        </div>

        {/* Border between sidebar and canvas (only when sidebar is open) */}
        {isLeftSidebarOpen && <div className="w-px bg-border flex-shrink-0" />}

        {/* Middle Canvas */}
        <div className="flex-1 canvas-grid relative" ref={pfdContainerRef}>
          <ErrorBoundary fallbackMessage="Unable to load flowsheet. Please refresh the page.">
            <FlowCanvas
              ref={flowCanvasRef}
              equipmentData={equipmentData}
              apiData={apiResponse?.data}
            />
          </ErrorBoundary>
        </div>

        {/* Border between canvas and chat (only when chat is open) */}
        {isRightChatOpen && <div className="w-px bg-border flex-shrink-0" />}

        {/* Right Chat Panel - Resizable */}
        <div
          className="bg-surface flex flex-shrink-0 relative"
          style={{
            width: isRightChatOpen ? chatWidth : 0,
            transition: isDraggingChat ? "none" : "width 200ms ease-in-out",
          }}
        >
          {/* Resize Handle */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group z-10
              ${isDraggingChat ? "bg-primary" : "bg-transparent hover:bg-primary"}
              transition-colors duration-150`}
            onMouseDown={handleChatDragStart}
            onDoubleClick={handleChatDoubleClick}
          >
            {/* Wider hit area for easier grabbing */}
            <div className="absolute -left-1 -right-1 top-0 bottom-0" />
          </div>

          {/* Chat Content Container */}
          <div
            className="flex flex-col overflow-hidden h-full"
            style={{ width: chatWidth }}
          >
            <ErrorBoundary fallbackMessage="Chat is temporarily unavailable.">
              <ChatPanel
                onClose={() => setIsRightChatOpen(false)}
                placeholder="Ask about this simulation..."
                externalProcessing={isSimulating}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* PFD Report Modal */}
      <PFDReportModal
        isOpen={isPFDReportOpen}
        onClose={() => setIsPFDReportOpen(false)}
        apiResponse={apiResponse?.data}
        simulationName={`Run_${runId}`}
      />
    </div>
  );
}

/**
 * Sidebar Content Component
 * Renders different content based on active section
 */
import EquipmentBrowser from "../components/EquipmentBrowser";
import WarningsPanel from "../components/WarningsPanel";
import { DetailsPanel } from "../components/DetailsPanel";

function SidebarContent({
  section,
  equipmentData,
  warningsData,
  templateType = null,
  compounds = [],
}) {
  // Get selected equipment from store
  const { selectedEquipmentId } = useSelectionStore();

  // Find selected equipment data
  const selectedEquipment = selectedEquipmentId
    ? equipmentData.find((eq) => eq.id === selectedEquipmentId)
    : null;

  switch (section) {
    case "equipment":
      return (
        <EquipmentBrowser
          equipmentData={equipmentData}
          templateType={templateType}
          compounds={compounds}
        />
      );

    case "details": {
      // Use the new DetailsPanel component
      if (selectedEquipment) {
        // Combine equipment info with metadata for full display
        const fullMetadata = {
          ...selectedEquipment.metadata,
          converged: selectedEquipment.converged,
          iterations: selectedEquipment.iterations,
          warnings: selectedEquipment.warnings,
        };

        return (
          <DetailsPanel
            equipment={{
              id: selectedEquipment.id,
              name: selectedEquipment.name,
              type: selectedEquipment.type,
            }}
            metadata={fullMetadata}
            className="h-full -m-4" // Negative margin to fill the sidebar padding
          />
        );
      }

      // No equipment selected - show empty state
      return <DetailsPanel equipment={null} metadata={null} />;
    }

    case "thermodynamics":
      return (
        <div className="space-y-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Property Package
            </span>
            <p className="text-sm text-gray-900 mt-1">Ideal</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Compounds
            </span>
            <p className="text-sm text-gray-900 mt-1">—</p>
          </div>
        </div>
      );

    case "warnings":
      return <WarningsPanel warningsData={warningsData} />;

    case "history":
      return (
        <>
          <p className="text-sm text-content-secondary">
            Recent simulation runs
          </p>
          <div className="mt-4 space-y-2">
            <div className="p-2 border border-border rounded bg-surface-secondary flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-content">Current run</span>
            </div>
          </div>
        </>
      );

    default:
      return null;
  }
}
