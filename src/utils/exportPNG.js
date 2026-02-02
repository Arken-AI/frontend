/**
 * PNG Export Utility
 *
 * Captures a DOM element and exports it as a PNG image.
 * Uses html2canvas for rendering.
 *
 * Features:
 * - High-DPI support (2x scale for retina displays)
 * - White background handling
 * - Automatic filename generation
 * - Download trigger
 */

import html2canvas from "html2canvas";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_OPTIONS = {
  // Scale factor for high-quality output (2 = retina quality)
  scale: 2,

  // Background color (ensures no transparency)
  backgroundColor: "#ffffff",

  // Logging level
  logging: false,

  // Use foreign object rendering for better text quality
  useCORS: true,

  // Allow tainted canvas (for cross-origin images)
  allowTaint: true,

  // Scroll handling
  scrollX: 0,
  scrollY: -window.scrollY,

  // Image format quality (0-1)
  imageQuality: 0.95,
};

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Export a DOM element as a PNG image
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - The filename (without extension)
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<Blob>} - The PNG blob
 */
export async function exportToPNG(element, filename = "export", options = {}) {
  if (!element) {
    throw new Error("No element provided for PNG export");
  }

  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: config.scale,
      backgroundColor: config.backgroundColor,
      logging: config.logging,
      useCORS: config.useCORS,
      allowTaint: config.allowTaint,
      scrollX: config.scrollX,
      scrollY: config.scrollY,
    });

    // Convert to blob
    const blob = await canvasToBlob(canvas, "image/png", config.imageQuality);

    // Trigger download
    downloadBlob(blob, `${sanitizeFilename(filename)}.png`);

    return blob;
  } catch (error) {
    console.error("[exportToPNG] Error capturing element:", error);
    throw error;
  }
}

/**
 * Export a DOM element as PNG and return as data URL
 * (useful for preview or further processing)
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<string>} - The data URL
 */
export async function captureAsDataURL(element, options = {}) {
  if (!element) {
    throw new Error("No element provided for capture");
  }

  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    const canvas = await html2canvas(element, {
      scale: config.scale,
      backgroundColor: config.backgroundColor,
      logging: config.logging,
      useCORS: config.useCORS,
      allowTaint: config.allowTaint,
    });

    return canvas.toDataURL("image/png", config.imageQuality);
  } catch (error) {
    console.error("[captureAsDataURL] Error:", error);
    throw error;
  }
}

/**
 * Export a DOM element as PNG and return as canvas
 * (useful for further processing like PDF)
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<HTMLCanvasElement>} - The canvas element
 */
export async function captureAsCanvas(element, options = {}) {
  if (!element) {
    throw new Error("No element provided for capture");
  }

  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    const canvas = await html2canvas(element, {
      scale: config.scale,
      backgroundColor: config.backgroundColor,
      logging: config.logging,
      useCORS: config.useCORS,
      allowTaint: config.allowTaint,
    });

    return canvas;
  } catch (error) {
    console.error("[captureAsCanvas] Error:", error);
    throw error;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert canvas to blob
 */
function canvasToBlob(canvas, type = "image/png", quality = 0.95) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      type,
      quality,
    );
  });
}

/**
 * Trigger file download
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Sanitize filename (remove invalid characters)
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Collapse multiple underscores
    .substring(0, 200); // Limit length
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  exportToPNG,
  captureAsDataURL,
  captureAsCanvas,
};
