/**
 * Report Service - API functions for Detailed Report generation
 *
 * Communicates with backend /api/v1/reports endpoints.
 *
 * Endpoints:
 * - POST /api/v1/reports - Generate a new report
 * - GET /api/v1/reports/{id}/status - Check generation status
 * - GET /api/v1/reports/{id}/download - Download PDF
 * - DELETE /api/v1/reports/{id} - Delete report
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Request a new detailed report generation
 *
 * @param {Object} params - Report request parameters
 * @param {string} params.run_id - Simulation run ID
 * @param {string} params.pfd_image_base64 - Base64 encoded PFD image (PNG)
 * @param {Object} params.options - Report options
 * @param {boolean} params.options.include_ai_narratives - Include AI-generated text (default: true)
 * @param {boolean} params.options.include_pfd_image - Include PFD diagram (default: true)
 * @param {boolean} params.options.include_stream_tables - Include stream tables (default: true)
 * @param {boolean} params.options.include_equipment_tables - Include equipment tables (default: true)
 * @param {boolean} params.options.include_mass_balance - Include mass balance summary (default: true)
 * @param {boolean} params.options.include_energy_balance - Include energy balance summary (default: true)
 * @returns {Promise<Object>} Response with report_id, status, message
 */
export async function generateReport({
  run_id,
  pfd_image_base64,
  options = {},
}) {
  const defaultOptions = {
    include_ai_narratives: true,
    include_pfd_image: true,
    include_stream_tables: true,
    include_equipment_tables: true,
    include_mass_balance: true,
    include_energy_balance: true,
  };

  const response = await fetch(`${API_BASE}/v1/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      run_id,
      pfd_image_base64,
      options: { ...defaultOptions, ...options },
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Network error" }));
    throw new Error(
      error.detail || error.message || "Failed to generate report",
    );
  }

  return response.json();
}

// =============================================================================
// STATUS POLLING
// =============================================================================

/**
 * Get the current status of a report generation
 *
 * @param {string} reportId - Report ID returned from generateReport
 * @returns {Promise<Object>} Status response with:
 *   - report_id: string
 *   - status: 'pending' | 'processing' | 'completed' | 'failed'
 *   - progress: number (0-100)
 *   - current_step: string
 *   - error: string | null
 *   - created_at: string (ISO timestamp)
 *   - completed_at: string | null (ISO timestamp)
 */
export async function getReportStatus(reportId) {
  const response = await fetch(`${API_BASE}/v1/reports/${reportId}/status`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Report not found");
    }
    const error = await response
      .json()
      .catch(() => ({ detail: "Network error" }));
    throw new Error(error.detail || "Failed to get report status");
  }

  return response.json();
}

// =============================================================================
// DOWNLOAD
// =============================================================================

/**
 * Download the generated PDF report
 *
 * @param {string} reportId - Report ID
 * @param {string} filename - Optional filename for download (default: 'report.pdf')
 * @returns {Promise<void>} Triggers browser download
 */
export async function downloadReport(
  reportId,
  filename = "simulation_report.pdf",
) {
  const response = await fetch(`${API_BASE}/v1/reports/${reportId}/download`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Report not found or not ready");
    }
    const error = await response
      .json()
      .catch(() => ({ detail: "Download failed" }));
    throw new Error(error.detail || "Failed to download report");
  }

  // Get blob and trigger download
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Get report PDF as blob (for preview or custom handling)
 *
 * @param {string} reportId - Report ID
 * @returns {Promise<Blob>} PDF blob
 */
export async function getReportBlob(reportId) {
  const response = await fetch(`${API_BASE}/v1/reports/${reportId}/download`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Report not found or not ready");
    }
    throw new Error("Failed to get report");
  }

  return response.blob();
}

// =============================================================================
// DELETION
// =============================================================================

/**
 * Delete a generated report
 *
 * @param {string} reportId - Report ID to delete
 * @returns {Promise<Object>} Response with message
 */
export async function deleteReport(reportId) {
  const response = await fetch(`${API_BASE}/v1/reports/${reportId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Report not found");
    }
    const error = await response
      .json()
      .catch(() => ({ detail: "Delete failed" }));
    throw new Error(error.detail || "Failed to delete report");
  }

  return response.json();
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  generateReport,
  getReportStatus,
  downloadReport,
  getReportBlob,
  deleteReport,
};
