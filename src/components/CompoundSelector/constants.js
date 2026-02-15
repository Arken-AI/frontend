/**
 * Shared constants for CompoundSelector
 */

/**
 * Common compounds list for quick selection.
 * Users can also type a custom compound name.
 */
export const COMMON_COMPOUNDS = [
  "water",
  "ethanol",
  "methanol",
  "benzene",
  "toluene",
  "acetone",
  "hexane",
  "heptane",
  "propane",
  "butane",
  "pentane",
  "octane",
  "xylene",
  "chloroform",
  "acetic_acid",
  "ammonia",
  "carbon_dioxide",
  "nitrogen",
  "oxygen",
  "hydrogen",
  "methane",
  "ethane",
  "propylene",
  "butanol",
  "isopropanol",
  "cyclohexane",
  "diethyl_ether",
  "ethylene_glycol",
  "glycerol",
  "sucrose",
  "glucose",
  "fructose",
  "phenol",
  "aniline",
  "formic_acid",
  "sulfuric_acid",
  "hydrochloric_acid",
  "sodium_hydroxide",
  "ethylene",
  "styrene",
];

/**
 * Format a generic compound placeholder for display
 * "compound_1" → "Compound 1"
 */
export function formatPlaceholder(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
