/**
 * Value Formatters Utility
 *
 * Format numbers and values for display based on their magnitude and type.
 * Handles scientific notation, thousands separators, and precision.
 *
 * Examples:
 *   1155.2478 → "1,155.25"
 *   0.00002 → "2.0e-5"
 *   101325 → "101,325"
 *   0.95 (efficiency) → "95%"
 */

import { inferUnit, inferPrecision, getMultiplier } from "./unitInference";

/**
 * Format a number with appropriate precision and thousands separators
 * @param {number} value - The number to format
 * @param {number} precision - Decimal places
 * @param {boolean} useGrouping - Whether to use thousands separators
 * @returns {string} Formatted number string
 */
function formatWithPrecision(value, precision = 2, useGrouping = true) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
    useGrouping,
  });
}

/**
 * Format a very small number using scientific notation
 * @param {number} value - The number to format
 * @param {number} sigFigs - Significant figures
 * @returns {string} Formatted string in scientific notation
 */
function formatScientific(value, sigFigs = 2) {
  return value.toExponential(sigFigs);
}

/**
 * Format a number based on its magnitude
 * @param {number} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted number string
 */
export function formatNumber(value, options = {}) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value !== "number" || isNaN(value)) {
    return String(value);
  }

  const {
    precision,
    multiply = 1,
    useGrouping = true,
    forceScientific = false,
  } = options;

  // Apply multiplier (e.g., for efficiency percentages)
  const displayValue = value * multiply;
  const absValue = Math.abs(displayValue);

  // Determine precision if not specified
  let effectivePrecision = precision;
  if (effectivePrecision === undefined) {
    if (absValue === 0) effectivePrecision = 0;
    else if (absValue >= 10000) effectivePrecision = 0;
    else if (absValue >= 100) effectivePrecision = 1;
    else if (absValue >= 1) effectivePrecision = 2;
    else if (absValue >= 0.01) effectivePrecision = 4;
    else effectivePrecision = 2; // Will use scientific
  }

  // Use scientific notation for very small or very large numbers
  if (
    forceScientific ||
    (absValue !== 0 && (absValue < 0.0001 || absValue >= 1e9))
  ) {
    return formatScientific(displayValue, 2);
  }

  return formatWithPrecision(displayValue, effectivePrecision, useGrouping);
}

/**
 * Format a value with its unit, inferring from key name
 * @param {*} value - The value to format
 * @param {string} key - The key name (for unit inference)
 * @returns {object} { formatted: string, unit: string }
 */
export function formatWithUnit(value, key) {
  if (value === null || value === undefined) {
    return { formatted: "—", unit: "" };
  }

  if (typeof value !== "number") {
    return { formatted: String(value), unit: "" };
  }

  const unitInfo = inferUnit(key);
  const precision = inferPrecision(key, value);
  const multiply = getMultiplier(key);

  const formatted = formatNumber(value, { precision, multiply });

  return {
    formatted,
    unit: unitInfo.unit,
  };
}

/**
 * Format a percentage value
 * @param {number} value - Value between 0 and 1
 * @param {number} precision - Decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, precision = 1) {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(precision)}%`;
}

/**
 * Format a temperature value with unit conversion indicator
 * @param {number} kelvin - Temperature in Kelvin
 * @param {string} displayUnit - 'K', 'C', or 'F'
 * @returns {string} Formatted temperature
 */
export function formatTemperature(kelvin, displayUnit = "K") {
  if (kelvin === null || kelvin === undefined) return "—";

  let value = kelvin;
  let unit = "K";

  switch (displayUnit) {
    case "C":
      value = kelvin - 273.15;
      unit = "°C";
      break;
    case "F":
      value = ((kelvin - 273.15) * 9) / 5 + 32;
      unit = "°F";
      break;
    default:
      unit = "K";
  }

  return `${formatNumber(value, { precision: 2 })} ${unit}`;
}

/**
 * Format a pressure value with optional unit conversion
 * @param {number} pascal - Pressure in Pascal
 * @param {string} displayUnit - 'Pa', 'kPa', 'bar', 'atm'
 * @returns {string} Formatted pressure
 */
export function formatPressure(pascal, displayUnit = "Pa") {
  if (pascal === null || pascal === undefined) return "—";

  let value = pascal;
  let unit = "Pa";

  switch (displayUnit) {
    case "kPa":
      value = pascal / 1000;
      unit = "kPa";
      break;
    case "bar":
      value = pascal / 100000;
      unit = "bar";
      break;
    case "atm":
      value = pascal / 101325;
      unit = "atm";
      break;
    default:
      unit = "Pa";
  }

  return `${formatNumber(value, { precision: value >= 100 ? 0 : 2 })} ${unit}`;
}

/**
 * Format a flow rate value
 * @param {number} value - Flow rate value
 * @param {string} unit - Unit string
 * @returns {string} Formatted flow rate
 */
export function formatFlowRate(value, unit = "kmol/hr") {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value, { precision: 2 })} ${unit}`;
}

/**
 * Truncate a long string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export function truncateString(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Format a duration in seconds to human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—";

  if (seconds < 0.001) {
    return `${(seconds * 1000000).toFixed(0)} μs`;
  }
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(1)} ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)} s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default formatNumber;
