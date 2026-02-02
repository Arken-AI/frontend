/**
 * Compound Formatter Utility
 *
 * Converts plain compound names to proper chemical formulas with subscripts.
 * Used in PFD Report tables for professional display.
 */

// Unicode subscript digits for chemical formulas
const SUBSCRIPT_MAP = {
  0: "₀",
  1: "₁",
  2: "₂",
  3: "₃",
  4: "₄",
  5: "₅",
  6: "₆",
  7: "₇",
  8: "₈",
  9: "₉",
};

/**
 * Common compound name to chemical formula mapping.
 * Add new compounds here as they are encountered in simulations.
 *
 * Format: lowercase_name: "Formula with subscripts"
 */
const COMPOUND_FORMULAS = {
  // Water and common solvents
  water: "H₂O",
  steam: "H₂O",

  // Hydrocarbons - Aromatics
  benzene: "C₆H₆",
  toluene: "C₇H₈",
  xylene: "C₈H₁₀",
  ethylbenzene: "C₈H₁₀",
  styrene: "C₈H₈",
  naphthalene: "C₁₀H₈",

  // Hydrocarbons - Alkanes
  methane: "CH₄",
  ethane: "C₂H₆",
  propane: "C₃H₈",
  butane: "C₄H₁₀",
  pentane: "C₅H₁₂",
  hexane: "C₆H₁₄",
  heptane: "C₇H₁₆",
  octane: "C₈H₁₈",
  isobutane: "C₄H₁₀",
  isopentane: "C₅H₁₂",
  neopentane: "C₅H₁₂",

  // Hydrocarbons - Alkenes
  ethylene: "C₂H₄",
  propylene: "C₃H₆",
  butene: "C₄H₈",
  isobutene: "C₄H₈",

  // Alcohols
  methanol: "CH₃OH",
  ethanol: "C₂H₅OH",
  propanol: "C₃H₇OH",
  isopropanol: "C₃H₇OH",
  butanol: "C₄H₉OH",

  // Acids
  acetic_acid: "CH₃COOH",
  formic_acid: "HCOOH",
  sulfuric_acid: "H₂SO₄",
  nitric_acid: "HNO₃",
  hydrochloric_acid: "HCl",
  phosphoric_acid: "H₃PO₄",

  // Ketones and Aldehydes
  acetone: "C₃H₆O",
  formaldehyde: "CH₂O",
  acetaldehyde: "C₂H₄O",

  // Gases
  nitrogen: "N₂",
  oxygen: "O₂",
  hydrogen: "H₂",
  carbon_dioxide: "CO₂",
  carbon_monoxide: "CO",
  ammonia: "NH₃",
  chlorine: "Cl₂",
  helium: "He",
  argon: "Ar",
  sulfur_dioxide: "SO₂",
  hydrogen_sulfide: "H₂S",
  nitric_oxide: "NO",
  nitrogen_dioxide: "NO₂",

  // Sugars and Carbohydrates
  sucrose: "C₁₂H₂₂O₁₁",
  glucose: "C₆H₁₂O₆",
  fructose: "C₆H₁₂O₆",
  lactose: "C₁₂H₂₂O₁₁",
  maltose: "C₁₂H₂₂O₁₁",

  // Esters
  ethyl_acetate: "C₄H₈O₂",
  methyl_acetate: "C₃H₆O₂",

  // Ethers
  diethyl_ether: "C₄H₁₀O",
  dimethyl_ether: "C₂H₆O",

  // Chlorinated
  chloroform: "CHCl₃",
  dichloromethane: "CH₂Cl₂",
  carbon_tetrachloride: "CCl₄",

  // Amines
  methylamine: "CH₃NH₂",
  ethylamine: "C₂H₅NH₂",
  aniline: "C₆H₅NH₂",

  // Inorganic
  sodium_hydroxide: "NaOH",
  sodium_chloride: "NaCl",
  calcium_carbonate: "CaCO₃",

  // Sugar industry specific
  fiber: "Fiber",
  ash: "Ash",
  non_sucrose_dissolved_solids: "NSDS",
  bagasse: "Bagasse",
  molasses: "Molasses",

  // IPA (Isopropyl Alcohol)
  ipa: "C₃H₇OH",
  isopropyl_alcohol: "C₃H₇OH",
  "2-propanol": "C₃H₇OH",
};

/**
 * Convert a number string to subscript format
 * @param {string} num - Number string like "12"
 * @returns {string} Subscript version like "₁₂"
 */
function toSubscript(num) {
  return String(num)
    .split("")
    .map((d) => SUBSCRIPT_MAP[d] || d)
    .join("");
}

/**
 * Format a compound name for display.
 * Returns chemical formula with subscripts if known, otherwise formatted name.
 *
 * @param {string} name - Compound name (e.g., "water", "benzene", "unknown_compound")
 * @returns {string} Formatted display string (e.g., "H₂O", "C₆H₆", "Unknown Compound")
 *
 * @example
 * formatCompound("water") // "H₂O"
 * formatCompound("benzene") // "C₆H₆"
 * formatCompound("my_custom_compound") // "My Custom Compound"
 */
export function formatCompound(name) {
  if (!name) return "";

  // Normalize: lowercase, trim
  const normalized = name.toLowerCase().trim();

  // Check lookup table
  if (COMPOUND_FORMULAS[normalized]) {
    return COMPOUND_FORMULAS[normalized];
  }

  // Fallback: Format as readable name
  // Replace underscores with spaces, capitalize each word
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get the chemical formula for a compound (or null if not found).
 * Unlike formatCompound, this returns null for unknown compounds.
 *
 * @param {string} name - Compound name
 * @returns {string|null} Chemical formula or null
 */
export function getCompoundFormula(name) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  return COMPOUND_FORMULAS[normalized] || null;
}

/**
 * Check if a compound has a known formula in the lookup table.
 *
 * @param {string} name - Compound name
 * @returns {boolean} True if formula is known
 */
export function hasKnownFormula(name) {
  if (!name) return false;
  const normalized = name.toLowerCase().trim();
  return normalized in COMPOUND_FORMULAS;
}

/**
 * Get all known compound names.
 * Useful for debugging or displaying available compounds.
 *
 * @returns {string[]} Array of compound names
 */
export function getKnownCompounds() {
  return Object.keys(COMPOUND_FORMULAS);
}

/**
 * Add a custom compound formula (runtime addition).
 * Useful for processes with specialized compounds.
 *
 * @param {string} name - Compound name (lowercase, underscores for spaces)
 * @param {string} formula - Chemical formula with subscripts
 */
export function addCompoundFormula(name, formula) {
  if (name && formula) {
    COMPOUND_FORMULAS[name.toLowerCase().trim()] = formula;
  }
}

/**
 * Format compound name for plain text (no subscripts).
 * Useful for file names, exports where subscripts don't render.
 *
 * @param {string} name - Compound name
 * @returns {string} Plain text formula or formatted name
 */
export function formatCompoundPlain(name) {
  if (!name) return "";

  const normalized = name.toLowerCase().trim();

  // Plain text versions (no subscripts)
  const plainFormulas = {
    water: "H2O",
    benzene: "C6H6",
    toluene: "C7H8",
    ammonia: "NH3",
    nitrogen: "N2",
    oxygen: "O2",
    sucrose: "C12H22O11",
    // Add more as needed
  };

  if (plainFormulas[normalized]) {
    return plainFormulas[normalized];
  }

  // Fallback to formatted name
  return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default {
  formatCompound,
  getCompoundFormula,
  hasKnownFormula,
  getKnownCompounds,
  addCompoundFormula,
  formatCompoundPlain,
  toSubscript,
};
