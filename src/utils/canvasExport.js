/**
 * Canvas Export Utility for Detailed Reports
 *
 * Captures the ReactFlow PFD canvas and exports it as a base64 PNG string
 * suitable for sending to the backend report generation API.
 *
 * Uses html2canvas (already installed in the project) for DOM capture.
 *
 * Usage:
 * ```javascript
 * import { capturePFDAsBase64 } from '../utils/canvasExport';
 *
 * // In your component
 * const pfdRef = useRef(null);
 * const base64Image = await capturePFDAsBase64(pfdRef.current);
 * ```
 */

import html2canvas from "html2canvas";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CAPTURE_OPTIONS = {
  // Scale factor for high-quality output (2 = retina quality)
  scale: 2,

  // White background for PDF compatibility
  backgroundColor: "#ffffff",

  // Disable logging in production
  logging: false,

  // Enable CORS for external resources
  useCORS: true,

  // Allow tainted canvas
  allowTaint: true,

  // Ignore scroll offset
  scrollX: 0,
  scrollY: 0,
};

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Capture a DOM element (PFD canvas) as a base64 PNG string
 *
 * This function is specifically designed for capturing the ReactFlow canvas
 * for inclusion in detailed PDF reports.
 *
 * @param {HTMLElement} element - The DOM element to capture (typically the ReactFlow container)
 * @param {Object} options - Optional configuration overrides
 * @param {number} options.scale - Scale factor (default: 2)
 * @param {string} options.backgroundColor - Background color (default: '#ffffff')
 * @returns {Promise<string>} Base64 encoded PNG string (without data:image/png;base64, prefix)
 */
export async function capturePFDAsBase64(element, options = {}) {
  if (!element) {
    throw new Error("No element provided for PFD capture");
  }

  const config = { ...DEFAULT_CAPTURE_OPTIONS, ...options };

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

    // Convert to base64 (strip the data URL prefix for backend)
    const dataUrl = canvas.toDataURL("image/png", 0.95);
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");

    return base64;
  } catch (error) {
    console.error("[canvasExport] Error capturing PFD:", error);
    throw new Error(`Failed to capture PFD image: ${error.message}`);
  }
}

/**
 * Capture a DOM element as a full data URL
 *
 * Useful for preview purposes before sending to backend.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<string>} Full data URL (data:image/png;base64,...)
 */
export async function capturePFDAsDataUrl(element, options = {}) {
  if (!element) {
    throw new Error("No element provided for PFD capture");
  }

  const config = { ...DEFAULT_CAPTURE_OPTIONS, ...options };

  try {
    const canvas = await html2canvas(element, {
      scale: config.scale,
      backgroundColor: config.backgroundColor,
      logging: config.logging,
      useCORS: config.useCORS,
      allowTaint: config.allowTaint,
      scrollX: config.scrollX,
      scrollY: config.scrollY,
    });

    return canvas.toDataURL("image/png", 0.95);
  } catch (error) {
    console.error("[canvasExport] Error capturing PFD:", error);
    throw new Error(`Failed to capture PFD image: ${error.message}`);
  }
}

/**
 * Get the dimensions of a DOM element
 *
 * Useful for validating capture area before export.
 *
 * @param {HTMLElement} element - The DOM element
 * @returns {Object} { width, height }
 */
export function getElementDimensions(element) {
  if (!element) {
    return { width: 0, height: 0 };
  }

  const rect = element.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/**
 * Find the ReactFlow canvas element within a container
 *
 * ReactFlow renders the actual flow in a nested div. This helper finds it.
 *
 * @param {HTMLElement} containerElement - The container element (e.g., PFD wrapper)
 * @returns {HTMLElement|null} The ReactFlow viewport element or null
 */
export function findReactFlowViewport(containerElement) {
  if (!containerElement) {
    return null;
  }

  // ReactFlow uses specific class names
  // Try to find the react-flow__viewport or react-flow__renderer
  const viewport = containerElement.querySelector(".react-flow__viewport");
  if (viewport) {
    return viewport.parentElement; // Return the react-flow container
  }

  // Fallback: look for the main react-flow class
  const reactFlowElement = containerElement.querySelector(".react-flow");
  return reactFlowElement || containerElement;
}

/**
 * Capture PFD with automatic element detection
 *
 * Automatically finds the best element to capture within a container.
 *
 * @param {HTMLElement} containerElement - The container element
 * @param {Object} options - Optional configuration overrides
 * @returns {Promise<string>} Base64 encoded PNG string
 */
export async function capturePFDSmart(containerElement, options = {}) {
  const targetElement =
    findReactFlowViewport(containerElement) || containerElement;
  return capturePFDAsBase64(targetElement, options);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  capturePFDAsBase64,
  capturePFDAsDataUrl,
  getElementDimensions,
  findReactFlowViewport,
  capturePFDSmart,
};
