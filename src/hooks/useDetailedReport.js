/**
 * useDetailedReport Hook
 *
 * Manages the state and lifecycle of detailed report generation.
 * Handles async generation, status polling, and download.
 *
 * Usage:
 * ```jsx
 * const {
 *   status,
 *   progress,
 *   currentStep,
 *   error,
 *   isGenerating,
 *   isComplete,
 *   startGeneration,
 *   downloadReport,
 *   cancelGeneration,
 *   reset,
 * } = useDetailedReport();
 * ```
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  generateReport,
  getReportStatus,
  downloadReport as downloadReportApi,
  deleteReport,
} from "../services/reportService";

// =============================================================================
// CONSTANTS
// =============================================================================

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

const STATUS = {
  IDLE: "idle",
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing detailed report generation
 *
 * @returns {Object} Report generation state and actions
 */
export function useDetailedReport() {
  // State
  const [reportId, setReportId] = useState(null);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState(null);

  // Refs for cleanup
  const pollIntervalRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Computed states
  const isGenerating =
    status === STATUS.PENDING || status === STATUS.PROCESSING;
  const isComplete = status === STATUS.COMPLETED;
  const isFailed = status === STATUS.FAILED;
  const isCancelled = status === STATUS.CANCELLED;

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ---------------------------------------------------------------------------
  // STATUS POLLING
  // ---------------------------------------------------------------------------

  const pollStatus = useCallback(
    async (id) => {
      if (isCancelledRef.current) {
        stopPolling();
        return;
      }

      try {
        const statusResponse = await getReportStatus(id);

        // Update state from response
        setStatus(statusResponse.status);
        setProgress(statusResponse.progress || 0);
        setCurrentStep(statusResponse.current_step || "");

        // Handle terminal states
        if (statusResponse.status === "completed") {
          stopPolling();
          setProgress(100);
          setCurrentStep("Report ready for download");
        } else if (statusResponse.status === "failed") {
          stopPolling();
          setError(statusResponse.error || "Report generation failed");
        }
      } catch (err) {
        console.error("[useDetailedReport] Poll error:", err);
        // Don't stop polling on transient errors, let it retry
      }
    },
    [stopPolling],
  );

  const startPolling = useCallback(
    (id) => {
      stopPolling();
      isCancelledRef.current = false;

      // Immediate first poll
      pollStatus(id);

      // Start interval
      pollIntervalRef.current = setInterval(() => {
        pollStatus(id);
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, pollStatus],
  );

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Start report generation
   *
   * @param {Object} params - Generation parameters
   * @param {string} params.run_id - Simulation run ID
   * @param {string} params.pfd_image_base64 - Base64 encoded PFD image
   * @param {Object} params.options - Report options
   */
  const startGeneration = useCallback(
    async ({ run_id, pfd_image_base64, options = {} }) => {
      // Reset state
      setError(null);
      setStatus(STATUS.PENDING);
      setProgress(0);
      setCurrentStep("Starting report generation...");
      isCancelledRef.current = false;

      try {
        const response = await generateReport({
          run_id,
          pfd_image_base64,
          options,
        });

        setReportId(response.report_id);

        // Start polling for status
        startPolling(response.report_id);

        return response.report_id;
      } catch (err) {
        console.error("[useDetailedReport] Generation error:", err);
        setStatus(STATUS.FAILED);
        setError(err.message || "Failed to start report generation");
        throw err;
      }
    },
    [startPolling],
  );

  /**
   * Download the generated report
   *
   * @param {string} filename - Optional custom filename
   */
  const downloadReportFile = useCallback(
    async (filename) => {
      if (!reportId) {
        throw new Error("No report available for download");
      }

      if (status !== STATUS.COMPLETED) {
        throw new Error("Report is not ready for download");
      }

      try {
        await downloadReportApi(reportId, filename);
      } catch (err) {
        console.error("[useDetailedReport] Download error:", err);
        setError(err.message || "Failed to download report");
        throw err;
      }
    },
    [reportId, status],
  );

  /**
   * Cancel ongoing report generation
   */
  const cancelGeneration = useCallback(async () => {
    isCancelledRef.current = true;
    stopPolling();
    setStatus(STATUS.CANCELLED);
    setCurrentStep("Generation cancelled");

    // Clean up on server if we have a report ID
    if (reportId) {
      try {
        await deleteReport(reportId);
      } catch (err) {
        // Ignore cleanup errors
        console.warn("[useDetailedReport] Cleanup error:", err);
      }
    }
  }, [reportId, stopPolling]);

  /**
   * Reset hook state for new generation
   */
  const reset = useCallback(() => {
    stopPolling();
    isCancelledRef.current = false;
    setReportId(null);
    setStatus(STATUS.IDLE);
    setProgress(0);
    setCurrentStep("");
    setError(null);
  }, [stopPolling]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // State
    reportId,
    status,
    progress,
    currentStep,
    error,

    // Computed
    isGenerating,
    isComplete,
    isFailed,
    isCancelled,
    isIdle: status === STATUS.IDLE,

    // Actions
    startGeneration,
    downloadReport: downloadReportFile,
    cancelGeneration,
    reset,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { STATUS as REPORT_STATUS };

export default useDetailedReport;
