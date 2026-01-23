/**
 * Label Inference Utility
 *
 * Converts JSON key names into human-readable labels.
 * Handles snake_case, camelCase, and unit suffixes.
 *
 * Examples:
 *   "outlet_temperature_K" → "Outlet Temperature"
 *   "pressure_drop_Pa" → "Pressure Drop"
 *   "NPSH_available_m" → "NPSH Available"
 *   "heatTransferCoefficient" → "Heat Transfer Coefficient"
 */

// Unit suffixes to remove from labels (will be shown separately)
const UNIT_SUFFIXES = [
  "_K", // Kelvin
  "_Pa", // Pascal
  "_kPa", // kiloPascal
  "_bar", // bar
  "_kW", // kilowatt
  "_W", // watt
  "_MW", // megawatt
  "_m", // meter
  "_mm", // millimeter
  "_m2", // square meter
  "_m3", // cubic meter
  "_m4", // m^4 (moment of inertia)
  "_kg", // kilogram
  "_kg_hr", // kg per hour
  "_kg_s", // kg per second
  "_kg_m3", // kg per cubic meter
  "_kg_m2s", // kg/(m²·s) (mass flux)
  "_kmol", // kilomole
  "_kmol_hr", // kmol per hour
  "_mol", // mole
  "_mol_s", // mole per second
  "_m_s", // meters per second
  "_m2K_W", // m²K/W (fouling factor)
  "_W_m2K", // W/m²K (heat transfer coefficient)
  "_W_mK", // W/(m·K) (thermal conductivity)
  "_J_mol", // J/mol (enthalpy)
  "_J_mol_K", // J/mol·K (entropy)
  "_Hz", // Hertz
  "_GPa", // GigaPascal
  "_s", // seconds
  "_hr", // hours
  "_min", // minutes
  "_percent", // percentage
  "_pct", // percentage
];

// Acronyms that should stay uppercase
const ACRONYMS = [
  "NPSH",
  "LMTD",
  "HTU",
  "NTU",
  "VLE",
  "VLLE",
  "MW", // Molecular Weight
  "ID",
  "OD",
  "BPE", // Boiling Point Elevation
  "Re", // Reynolds
  "Pr", // Prandtl
  "Nu", // Nusselt
  "UA", // Overall heat transfer coefficient × Area
  "TEMA", // Tubular Exchanger Manufacturers Association
  "LLE", // Liquid-Liquid Extraction
  "PSA", // Pressure Swing Adsorption
  "TSA", // Temperature Swing Adsorption
];

/**
 * Remove unit suffix from key name
 * @param {string} key - The key name
 * @returns {string} Key without unit suffix
 */
function removeUnitSuffix(key) {
  // Sort by length descending to match longer suffixes first
  const sortedSuffixes = [...UNIT_SUFFIXES].sort((a, b) => b.length - a.length);

  for (const suffix of sortedSuffixes) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length);
    }
  }
  return key;
}

/**
 * Convert snake_case or camelCase to Title Case with spaces
 * @param {string} str - Input string
 * @returns {string} Formatted string
 */
function toTitleCase(str) {
  return (
    str
      // Insert space before uppercase letters (camelCase)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Replace underscores with spaces
      .replace(/_/g, " ")
      // Capitalize first letter of each word
      .replace(/\b\w/g, (char) => char.toUpperCase())
      // Trim extra spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Preserve known acronyms in the label
 * @param {string} label - The label to process
 * @returns {string} Label with preserved acronyms
 */
function preserveAcronyms(label) {
  let result = label;

  for (const acronym of ACRONYMS) {
    // Create case-insensitive regex to find the acronym
    const regex = new RegExp(`\\b${acronym}\\b`, "gi");
    result = result.replace(regex, acronym);
  }

  return result;
}

/**
 * Handle special cases and common patterns
 * @param {string} label - The label to process
 * @returns {string} Processed label
 */
function handleSpecialCases(label) {
  // Common replacements for better readability
  const replacements = {
    "Num ": "Number of ",
    "Temp ": "Temperature ",
    "Vol ": "Volume ",
    "Vel ": "Velocity ",
    "Coeff ": "Coefficient ",
    "Avg ": "Average ",
    "Min ": "Minimum ",
    "Max ": "Maximum ",
    "Calc ": "Calculated ",
    "Config ": "Configuration ",
    Pct: "Percent",
    "Delta ": "Δ",
    " In": " Inlet",
    " Out": " Outlet",
  };

  let result = label;
  for (const [from, to] of Object.entries(replacements)) {
    result = result.replace(new RegExp(from, "g"), to);
  }

  return result;
}

/**
 * Convert a JSON key name to a human-readable label
 * @param {string} key - The key name to convert
 * @returns {string} Human-readable label
 */
export function inferLabel(key) {
  if (!key || typeof key !== "string") {
    return "";
  }

  // Step 1: Remove unit suffix
  let label = removeUnitSuffix(key);

  // Step 2: Convert to title case with spaces
  label = toTitleCase(label);

  // Step 3: Preserve known acronyms
  label = preserveAcronyms(label);

  // Step 4: Handle special cases
  label = handleSpecialCases(label);

  return label;
}

/**
 * Check if a key represents a commonly known field
 * Returns additional metadata about the field
 * @param {string} key - The key name
 * @returns {object|null} Field metadata or null if not recognized
 */
export function getKnownFieldInfo(key) {
  const knownFields = {
    converged: { label: "Converged", category: "status" },
    iterations: { label: "Iterations", category: "solver" },
    status: { label: "Status", category: "status" },
    feasible: { label: "Feasible", category: "status" },
    efficiency: { label: "Efficiency", category: "performance" },
    duty: { label: "Heat Duty", category: "energy" },
    phase: { label: "Phase", category: "thermal" },
    vapor_fraction: { label: "Vapor Fraction", category: "thermal" },
    composition: { label: "Composition", category: "composition" },
    warnings: { label: "Warnings", category: "alerts" },
    errors: { label: "Errors", category: "alerts" },
  };

  return knownFields[key] || null;
}

export default inferLabel;
