/**
 * DetailsPanel Utilities
 *
 * Central export for all utility functions used in the Details panel.
 */

// Label inference
export { inferLabel, getKnownFieldInfo } from "./labelInference";

// Unit inference
export { inferUnit, inferPrecision, getMultiplier } from "./unitInference";

// Value formatters
export {
  formatNumber,
  formatWithUnit,
  formatPercent,
  formatTemperature,
  formatPressure,
  formatFlowRate,
  truncateString,
  formatDuration,
} from "./formatters";

// Type detection
export {
  detectType,
  isSimpleObject,
  isSimpleArray,
  getArrayContentType,
  getObjectDepth,
  inferTypeFromKey,
  isEmpty,
} from "./typeDetection";

// Category detection
export {
  detectCategory,
  getCategoryInfo,
  categorizeMetadata,
  getSortedCategories,
  extractSummary,
} from "./categoryDetection";
