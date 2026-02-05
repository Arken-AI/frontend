/**
 * Report Progress Modal Component
 *
 * Displays the progress of detailed report generation.
 * Shows status, progress bar, current step, and action buttons.
 *
 * States:
 * - Generating: Shows progress bar and cancel button
 * - Complete: Shows success message and download button
 * - Failed: Shows error message and retry button
 */

import { useEffect, useRef } from "react";
import PropTypes from "prop-types";

// =============================================================================
// ICONS
// =============================================================================

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const SpinnerIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-12 w-12 text-green-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ErrorCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-12 w-12 text-red-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

// =============================================================================
// PROGRESS BAR
// =============================================================================

function ProgressBar({ progress, isAnimated = true }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full ${
          isAnimated 
            ? "bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-1000 ease-out" 
            : "bg-blue-500"
        }`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

ProgressBar.propTypes = {
  progress: PropTypes.number.isRequired,
  isAnimated: PropTypes.bool,
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Report Progress Modal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close callback
 * @param {string} props.status - Current status (idle, pending, processing, completed, failed, cancelled)
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {string} props.currentStep - Current step description
 * @param {string} props.error - Error message if failed
 * @param {boolean} props.isGenerating - Is generation in progress
 * @param {boolean} props.isComplete - Is generation complete
 * @param {boolean} props.isFailed - Did generation fail
 * @param {Function} props.onDownload - Download button callback
 * @param {Function} props.onCancel - Cancel button callback
 * @param {Function} props.onRetry - Retry button callback
 */
export default function ReportProgressModal({
  isOpen,
  onClose,
  status,
  progress,
  currentStep,
  error,
  isGenerating,
  isComplete,
  isFailed,
  onDownload,
  onCancel,
  onRetry,
}) {
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isGenerating) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // RENDER CONTENT BASED ON STATE
  // ---------------------------------------------------------------------------

  const renderContent = () => {
    // Complete state
    if (isComplete) {
      return (
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <CheckCircleIcon />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Report Generated Successfully!
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Your detailed report is ready for download.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <DownloadIcon />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    // Failed state
    if (isFailed) {
      return (
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <ErrorCircleIcon />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Report Generation Failed
          </h3>
          <p className="text-sm text-red-600 mb-6 max-w-md mx-auto">
            {error || "An unexpected error occurred. Please try again."}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onRetry}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    // Generating state (default)
    return (
      <div className="py-4">
        {/* Progress indicator */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <SpinnerIcon className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
          Generating Report...
        </h3>

        {/* Progress bar */}
        <div className="mb-3">
          <ProgressBar progress={progress} />
        </div>

        {/* Progress percentage and step */}
        <div className="flex justify-between text-sm text-gray-600 mb-6">
          <span>{currentStep || "Starting..."}</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>

        {/* Info text - shows contextual message based on progress */}
        <p className="text-xs text-gray-500 text-center mb-6">
          {progress < 30
            ? "Collecting simulation data and formatting tables..."
            : progress < 65
              ? "Generating AI narratives (this may take a moment)..."
              : progress < 90
                ? "Building PDF document..."
                : "Finalizing report..."}
        </p>

        {/* Cancel button */}
        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isGenerating ? onClose : undefined}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isComplete
              ? "Report Ready"
              : isFailed
                ? "Generation Failed"
                : "Generating Report"}
          </h2>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6">{renderContent()}</div>
      </div>
    </div>
  );
}

ReportProgressModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  status: PropTypes.string,
  progress: PropTypes.number,
  currentStep: PropTypes.string,
  error: PropTypes.string,
  isGenerating: PropTypes.bool,
  isComplete: PropTypes.bool,
  isFailed: PropTypes.bool,
  onDownload: PropTypes.func,
  onCancel: PropTypes.func,
  onRetry: PropTypes.func,
};

ReportProgressModal.defaultProps = {
  progress: 0,
  currentStep: "",
  isGenerating: false,
  isComplete: false,
  isFailed: false,
};
