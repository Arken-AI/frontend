/**
 * Detailed Report Button Component
 *
 * A button that triggers AI-powered detailed report generation.
 * Shows options modal, captures PFD, and manages generation lifecycle.
 *
 * Usage:
 * ```jsx
 * <DetailedReportButton
 *   runId="abc123"
 *   pfdContainerRef={pfdRef}
 *   disabled={!apiResponse?.data}
 * />
 * ```
 */

import { useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import toast from "react-hot-toast";
import { useDetailedReport } from "../../hooks/useDetailedReport";
import { capturePFDAsBase64 } from "../../utils/canvasExport";
import ReportProgressModal from "./ReportProgressModal";
import ReportOptionsForm from "./ReportOptionsForm";

// =============================================================================
// ICONS
// =============================================================================

const DocumentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

// =============================================================================
// DEFAULT OPTIONS
// =============================================================================

const DEFAULT_REPORT_OPTIONS = {
  include_ai_narratives: true,
  include_pfd_image: true,
  include_stream_tables: true,
  include_equipment_tables: true,
  include_mass_balance: true,
  include_energy_balance: true,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Detailed Report Button
 *
 * @param {Object} props
 * @param {string} props.runId - Simulation run ID
 * @param {React.RefObject} props.pfdContainerRef - Ref to PFD container element for capture (fallback)
 * @param {React.RefObject} props.flowCanvasRef - Ref to FlowCanvas component with getFullFlowsheetPng method (preferred)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.className - Additional CSS classes
 */
export default function DetailedReportButton({
  runId,
  pfdContainerRef,
  flowCanvasRef,
  disabled = false,
  className = "",
}) {
  // Modal states
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [options, setOptions] = useState(DEFAULT_REPORT_OPTIONS);

  // Report generation hook
  const {
    status,
    progress,
    currentStep,
    error,
    isGenerating,
    isComplete,
    isFailed,
    startGeneration,
    downloadReport,
    cancelGeneration,
    reset,
  } = useDetailedReport();

  // Track if we're capturing PFD
  const [isCapturing, setIsCapturing] = useState(false);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Open options modal
   */
  const handleButtonClick = useCallback(() => {
    if (disabled) return;
    setIsOptionsOpen(true);
  }, [disabled]);

  /**
   * Start report generation after options confirmed
   */
  const handleStartGeneration = useCallback(
    async (selectedOptions) => {
      setIsOptionsOpen(false);
      setOptions(selectedOptions);
      setIsProgressOpen(true);

      try {
        // Capture PFD image
        setIsCapturing(true);
        let pfdImageBase64 = "";

        if (selectedOptions.include_pfd_image) {
          try {
            // Prefer using FlowCanvas's getFullFlowsheetPng for full diagram capture
            if (flowCanvasRef?.current?.getFullFlowsheetPng) {
              const { dataUrl } = await flowCanvasRef.current.getFullFlowsheetPng();
              // Strip the data URL prefix for backend (just the base64 content)
              pfdImageBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");
            } else if (pfdContainerRef?.current) {
              // Fallback to generic capture (only captures visible viewport)
              console.warn("[DetailedReportButton] FlowCanvas ref not available, using fallback capture");
              const reactFlowElement =
                pfdContainerRef.current.querySelector(".react-flow");
              const targetElement = reactFlowElement || pfdContainerRef.current;

              pfdImageBase64 = await capturePFDAsBase64(targetElement, {
                scale: 2,
                backgroundColor: "#ffffff",
              });
            }
          } catch (captureError) {
            console.warn(
              "[DetailedReportButton] PFD capture failed:",
              captureError
            );
            toast.error("Could not capture PFD image. Report will be generated without it.");
            // Continue without image
          }
        }

        setIsCapturing(false);

        // Start generation
        await startGeneration({
          run_id: runId,
          pfd_image_base64: pfdImageBase64,
          options: selectedOptions,
        });
      } catch (err) {
        setIsCapturing(false);
        console.error("[DetailedReportButton] Generation failed:", err);
        toast.error(err.message || "Failed to start report generation");
      }
    },
    [runId, pfdContainerRef, flowCanvasRef, startGeneration]
  );

  /**
   * Handle download when complete
   */
  const handleDownload = useCallback(async () => {
    try {
      const filename = `Detailed_Report_${runId}_${new Date().toISOString().split("T")[0]}.pdf`;
      await downloadReport(filename);
      toast.success("Report downloaded successfully!");
    } catch (err) {
      console.error("[DetailedReportButton] Download failed:", err);
      toast.error(err.message || "Failed to download report");
    }
  }, [runId, downloadReport]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    cancelGeneration();
    setIsProgressOpen(false);
    toast.info("Report generation cancelled");
  }, [cancelGeneration]);

  /**
   * Handle close progress modal
   */
  const handleCloseProgress = useCallback(() => {
    if (isGenerating) {
      // Confirm before closing during generation
      if (
        window.confirm("Report is still generating. Cancel and close?")
      ) {
        cancelGeneration();
        setIsProgressOpen(false);
      }
    } else {
      reset();
      setIsProgressOpen(false);
    }
  }, [isGenerating, cancelGeneration, reset]);

  /**
   * Handle retry after failure
   */
  const handleRetry = useCallback(() => {
    reset();
    setIsProgressOpen(false);
    setIsOptionsOpen(true);
  }, [reset]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Main Button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled || isGenerating}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
          border flex items-center gap-1.5
          ${
            disabled || isGenerating
              ? "text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed"
              : "text-gray-700 border-gray-300 hover:text-gray-900 hover:bg-gray-100"
          }
          ${className}
        `}
        title="Generate detailed PDF report with AI narratives"
      >
        <span>📄</span>
        <span>Detailed Report</span>
      </button>

      {/* Options Modal */}
      <ReportOptionsForm
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        onGenerate={handleStartGeneration}
        defaultOptions={options}
      />

      {/* Progress Modal */}
      <ReportProgressModal
        isOpen={isProgressOpen}
        onClose={handleCloseProgress}
        status={status}
        progress={progress}
        currentStep={isCapturing ? "Capturing PFD image..." : currentStep}
        error={error}
        isGenerating={isGenerating || isCapturing}
        isComplete={isComplete}
        isFailed={isFailed}
        onDownload={handleDownload}
        onCancel={handleCancel}
        onRetry={handleRetry}
      />
    </>
  );
}

DetailedReportButton.propTypes = {
  runId: PropTypes.string.isRequired,
  pfdContainerRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element),
  }),
  flowCanvasRef: PropTypes.shape({
    current: PropTypes.shape({
      getFullFlowsheetPng: PropTypes.func,
    }),
  }),
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
