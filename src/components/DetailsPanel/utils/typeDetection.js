/**
 * Type Detection Utility
 *
 * Determines the type of any value for rendering decisions.
 * Handles JavaScript's quirks (null, arrays, etc.)
 *
 * Returns one of: 'null', 'boolean', 'number', 'string', 'array', 'object'
 */

/**
 * Detect the type of a value for rendering purposes
 * @param {*} value - Any value to check
 * @returns {string} Type name: 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object'
 */
export function detectType(value) {
  // Null and undefined
  if (value === null || value === undefined) {
    return "null";
  }

  // Boolean
  if (typeof value === "boolean") {
    return "boolean";
  }

  // Number (including NaN and Infinity)
  if (typeof value === "number") {
    return "number";
  }

  // String
  if (typeof value === "string") {
    return "string";
  }

  // Array (must check before object)
  if (Array.isArray(value)) {
    return "array";
  }

  // Object
  if (typeof value === "object") {
    return "object";
  }

  // Fallback for functions, symbols, etc.
  return "unknown";
}

/**
 * Check if an object is "simple" (all primitive values, small)
 * Simple objects can be rendered inline instead of as collapsible sections
 * @param {object} obj - Object to check
 * @param {number} maxKeys - Maximum number of keys for "simple"
 * @returns {boolean} Whether the object is simple
 */
export function isSimpleObject(obj, maxKeys = 4) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return false;
  }

  const keys = Object.keys(obj);

  // Too many keys
  if (keys.length > maxKeys) {
    return false;
  }

  // Check if all values are primitive
  for (const key of keys) {
    const type = detectType(obj[key]);
    if (type === "object" || type === "array") {
      return false;
    }
  }

  return true;
}

/**
 * Check if an array is "simple" (all primitive values)
 * @param {array} arr - Array to check
 * @returns {boolean} Whether the array is simple
 */
export function isSimpleArray(arr) {
  if (!Array.isArray(arr)) return false;

  return arr.every((item) => {
    const type = detectType(item);
    return type !== "object" && type !== "array";
  });
}

/**
 * Get the type of array contents
 * @param {array} arr - Array to analyze
 * @returns {string} 'strings' | 'numbers' | 'objects' | 'mixed' | 'empty'
 */
export function getArrayContentType(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return "empty";
  }

  const types = new Set(arr.map((item) => detectType(item)));

  if (types.size === 1) {
    const type = types.values().next().value;
    if (type === "string") return "strings";
    if (type === "number") return "numbers";
    if (type === "object") return "objects";
    if (type === "boolean") return "booleans";
  }

  return "mixed";
}

/**
 * Count the depth of nesting in an object
 * @param {object} obj - Object to analyze
 * @param {number} maxDepth - Maximum depth to check
 * @returns {number} Nesting depth
 */
export function getObjectDepth(obj, maxDepth = 10) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return 0;
  }

  let depth = 1;

  for (const key of Object.keys(obj)) {
    if (depth >= maxDepth) break;

    const value = obj[key];
    if (value && typeof value === "object") {
      const childDepth = Array.isArray(value)
        ? 1
        : getObjectDepth(value, maxDepth - 1);
      depth = Math.max(depth, 1 + childDepth);
    }
  }

  return depth;
}

/**
 * Check if a key name suggests the value is a special type
 * @param {string} key - Key name to check
 * @returns {object|null} Special type info or null
 */
export function inferTypeFromKey(key) {
  if (!key || typeof key !== "string") return null;

  const lowerKey = key.toLowerCase();

  // Boolean indicators
  if (
    lowerKey.startsWith("is_") ||
    lowerKey.startsWith("has_") ||
    lowerKey.startsWith("can_") ||
    lowerKey.endsWith("_enabled") ||
    lowerKey.endsWith("_active") ||
    lowerKey === "converged" ||
    lowerKey === "feasible" ||
    lowerKey === "adiabatic"
  ) {
    return { expectedType: "boolean" };
  }

  // Array indicators
  if (
    lowerKey.endsWith("_list") ||
    lowerKey.endsWith("_array") ||
    lowerKey === "warnings" ||
    lowerKey === "errors" ||
    lowerKey === "compounds" ||
    lowerKey === "components"
  ) {
    return { expectedType: "array" };
  }

  // Object indicators
  if (
    lowerKey.endsWith("_config") ||
    lowerKey.endsWith("_settings") ||
    lowerKey.endsWith("_properties") ||
    lowerKey.endsWith("_details") ||
    lowerKey === "composition" ||
    lowerKey === "metadata"
  ) {
    return { expectedType: "object" };
  }

  return null;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} Whether the value is empty
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && Object.keys(value).length === 0) return true;
  return false;
}

export default detectType;
