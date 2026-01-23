/**
 * Unit Inference Utility
 *
 * Detects units from key names based on naming conventions.
 * Engineering data typically encodes units in the key suffix.
 *
 * Examples:
 *   "temperature_K" → { unit: "K", category: "temperature" }
 *   "pressure_Pa" → { unit: "Pa", category: "pressure" }
 *   "efficiency" → { unit: "%", multiply: 100, category: "fraction" }
 */

/**
 * Unit patterns matched against key suffixes
 * Order matters - longer suffixes should come first
 */
const UNIT_PATTERNS = [
  // Temperature
  { pattern: /_K$/, unit: "K", category: "temperature" },
  { pattern: /_C$/, unit: "°C", category: "temperature" },
  { pattern: /_F$/, unit: "°F", category: "temperature" },

  // Pressure
  { pattern: /_Pa$/, unit: "Pa", category: "pressure" },
  { pattern: /_kPa$/, unit: "kPa", category: "pressure" },
  { pattern: /_bar$/, unit: "bar", category: "pressure" },
  { pattern: /_psi$/, unit: "psi", category: "pressure" },
  { pattern: /_atm$/, unit: "atm", category: "pressure" },

  // Power / Energy
  { pattern: /_kW$/, unit: "kW", category: "power" },
  { pattern: /_MW$/, unit: "MW", category: "power" },
  { pattern: /_W$/, unit: "W", category: "power" },
  { pattern: /_hp$/, unit: "hp", category: "power" },
  { pattern: /_kJ$/, unit: "kJ", category: "energy" },
  { pattern: /_J$/, unit: "J", category: "energy" },

  // Enthalpy / Entropy
  { pattern: /_J_mol$/, unit: "J/mol", category: "thermodynamic" },
  { pattern: /_kJ_mol$/, unit: "kJ/mol", category: "thermodynamic" },
  { pattern: /_J_mol_K$/, unit: "J/(mol·K)", category: "thermodynamic" },

  // Length
  { pattern: /_m$/, unit: "m", category: "length" },
  { pattern: /_mm$/, unit: "mm", category: "length" },
  { pattern: /_cm$/, unit: "cm", category: "length" },
  { pattern: /_in$/, unit: "in", category: "length" },
  { pattern: /_ft$/, unit: "ft", category: "length" },

  // Area
  { pattern: /_m2$/, unit: "m²", category: "area" },
  { pattern: /_cm2$/, unit: "cm²", category: "area" },

  // Volume
  { pattern: /_m3$/, unit: "m³", category: "volume" },
  { pattern: /_L$/, unit: "L", category: "volume" },
  { pattern: /_mL$/, unit: "mL", category: "volume" },

  // Mass
  { pattern: /_kg$/, unit: "kg", category: "mass" },
  { pattern: /_g$/, unit: "g", category: "mass" },
  { pattern: /_lb$/, unit: "lb", category: "mass" },

  // Mass flow
  { pattern: /_kg_hr$/, unit: "kg/hr", category: "mass_flow" },
  { pattern: /_kg_s$/, unit: "kg/s", category: "mass_flow" },
  { pattern: /_lb_hr$/, unit: "lb/hr", category: "mass_flow" },

  // Molar
  { pattern: /_kmol$/, unit: "kmol", category: "molar" },
  { pattern: /_mol$/, unit: "mol", category: "molar" },
  { pattern: /_kmol_hr$/, unit: "kmol/hr", category: "molar_flow" },
  { pattern: /_mol_s$/, unit: "mol/s", category: "molar_flow" },

  // Volumetric flow
  { pattern: /_m3_hr$/, unit: "m³/hr", category: "volumetric_flow" },
  { pattern: /_m3_s$/, unit: "m³/s", category: "volumetric_flow" },
  { pattern: /_L_min$/, unit: "L/min", category: "volumetric_flow" },

  // Velocity
  { pattern: /_m_s$/, unit: "m/s", category: "velocity" },
  { pattern: /_ft_s$/, unit: "ft/s", category: "velocity" },

  // Density
  { pattern: /_kg_m3$/, unit: "kg/m³", category: "density" },
  { pattern: /_g_cm3$/, unit: "g/cm³", category: "density" },
  { pattern: /_lb_ft3$/, unit: "lb/ft³", category: "density" },

  // Heat transfer
  { pattern: /_W_m2K$/, unit: "W/(m²·K)", category: "heat_transfer" },
  { pattern: /_m2K_W$/, unit: "m²·K/W", category: "thermal_resistance" },
  { pattern: /_W_mK$/, unit: "W/(m·K)", category: "thermal_conductivity" },

  // Mass flux
  { pattern: /_kg_m2s$/, unit: "kg/(m²·s)", category: "mass_flux" },

  // Moment of inertia
  { pattern: /_m4$/, unit: "m⁴", category: "moment_of_inertia" },

  // Time
  { pattern: /_s$/, unit: "s", category: "time" },
  { pattern: /_min$/, unit: "min", category: "time" },
  { pattern: /_hr$/, unit: "hr", category: "time" },

  // Frequency
  { pattern: /_Hz$/, unit: "Hz", category: "frequency" },

  // Mechanical
  { pattern: /_GPa$/, unit: "GPa", category: "stress" },
  { pattern: /_MPa$/, unit: "MPa", category: "stress" },

  // Percentage
  { pattern: /_percent$/, unit: "%", category: "percentage" },
  { pattern: /_pct$/, unit: "%", category: "percentage" },
];

/**
 * Special keywords that imply certain formatting
 */
const KEYWORD_PATTERNS = [
  // Fractions and ratios (0-1 values shown as percentage)
  {
    pattern: /efficiency/i,
    unit: "%",
    multiply: 100,
    precision: 1,
    category: "fraction",
  },
  { pattern: /fraction/i, unit: "", precision: 4, category: "fraction" },
  { pattern: /ratio/i, unit: "", precision: 3, category: "ratio" },
  {
    pattern: /recovery/i,
    unit: "%",
    multiply: 1,
    precision: 1,
    category: "percentage",
  },
  { pattern: /purity/i, unit: "", precision: 4, category: "fraction" },

  // Factors (dimensionless)
  { pattern: /factor/i, unit: "", precision: 3, category: "dimensionless" },
  {
    pattern: /coefficient/i,
    unit: "",
    precision: 4,
    category: "dimensionless",
  },

  // Counts
  { pattern: /num_|number_|count/i, unit: "", precision: 0, category: "count" },
  { pattern: /_stages$/i, unit: "", precision: 0, category: "count" },
  { pattern: /iterations/i, unit: "", precision: 0, category: "count" },
];

/**
 * Infer unit and formatting information from a key name
 * @param {string} key - The key name to analyze
 * @returns {object} Unit information
 */
export function inferUnit(key) {
  if (!key || typeof key !== "string") {
    return { unit: "", category: "unknown" };
  }

  // First check suffix patterns (most reliable)
  for (const { pattern, unit, category } of UNIT_PATTERNS) {
    if (pattern.test(key)) {
      return { unit, category };
    }
  }

  // Then check keyword patterns
  for (const {
    pattern,
    unit,
    multiply,
    precision,
    category,
  } of KEYWORD_PATTERNS) {
    if (pattern.test(key)) {
      return { unit, multiply, precision, category };
    }
  }

  // Default: no unit detected
  return { unit: "", category: "unknown" };
}

/**
 * Get the appropriate precision for displaying a value
 * @param {string} key - The key name
 * @param {number} value - The actual value
 * @returns {number} Number of decimal places
 */
export function inferPrecision(key, value) {
  const unitInfo = inferUnit(key);

  // If precision is explicitly defined, use it
  if (unitInfo.precision !== undefined) {
    return unitInfo.precision;
  }

  // Otherwise, infer from value magnitude
  if (value === null || value === undefined) return 2;

  const absValue = Math.abs(value);

  if (absValue === 0) return 0;
  if (absValue >= 10000) return 0;
  if (absValue >= 100) return 1;
  if (absValue >= 1) return 2;
  if (absValue >= 0.01) return 4;
  return 6; // Very small numbers
}

/**
 * Check if a value needs to be multiplied for display
 * (e.g., efficiency 0.95 → 95%)
 * @param {string} key - The key name
 * @returns {number} Multiplier (default 1)
 */
export function getMultiplier(key) {
  const unitInfo = inferUnit(key);
  return unitInfo.multiply || 1;
}

export default inferUnit;
