/**
 * Category Detection Utility
 *
 * Automatically categorizes metadata fields into logical groups
 * based on key names and patterns.
 *
 * Categories:
 *   - summary: Key performance indicators
 *   - thermal: Temperature, heat, phase data
 *   - energy: Duty, power, efficiency
 *   - flow: Pressure, flow rates, velocity
 *   - sizing: Dimensions, area, volume
 *   - composition: Stream compositions
 *   - mass_transfer: HTU, NTU, recovery
 *   - status: Convergence, feasibility
 *   - alerts: Warnings, errors, notes
 *   - details: Everything else
 */

/**
 * Category definitions with their detection patterns
 */
const CATEGORY_PATTERNS = {
  summary: {
    label: "Summary",
    icon: "📊",
    priority: 1,
    // Summary is assigned explicitly, not by pattern
    patterns: [],
  },

  status: {
    label: "Status",
    icon: "✓",
    priority: 2,
    patterns: [
      /^converged$/i,
      /^feasible$/i,
      /^status$/i,
      /^iterations$/i,
      /^active$/i,
      /^valid/i,
    ],
  },

  energy: {
    label: "Energy",
    icon: "⚡",
    priority: 3,
    patterns: [
      /duty/i,
      /power/i,
      /^efficiency$/i,
      /heat_.*kw/i,
      /energy/i,
      /sensible/i,
      /latent/i,
    ],
  },

  thermal: {
    label: "Thermal",
    icon: "🌡️",
    priority: 4,
    patterns: [
      /temperature/i,
      /temp_/i,
      /_temp$/i,
      /thermal/i,
      /^phase$/i,
      /phase_/i,
      /vapor_fraction/i,
      /bubble_point/i,
      /dew_point/i,
      /boiling/i,
      /condensing/i,
      /subcool/i,
      /superheat/i,
      /lmtd/i,
      /delta_t/i,
    ],
  },

  flow: {
    label: "Flow",
    icon: "💧",
    priority: 5,
    patterns: [
      /pressure/i,
      /flow_rate/i,
      /flow$/i,
      /^flow_/i,
      /velocity/i,
      /density/i,
      /viscosity/i,
      /reynolds/i,
      /^re$/i,
      /mach/i,
      /volumetric/i,
      /mass_flow/i,
      /molar_flow/i,
    ],
  },

  sizing: {
    label: "Sizing",
    icon: "📐",
    priority: 6,
    patterns: [
      /diameter/i,
      /length/i,
      /height/i,
      /width/i,
      /area/i,
      /volume/i,
      /thickness/i,
      /spacing/i,
      /pitch/i,
      /^num_/i,
      /number_of/i,
      /stages/i,
      /tubes/i,
      /passes/i,
      /baffles/i,
      /geometry/i,
      /vessel/i,
      /nozzle/i,
      /^A_/i, // A_s_m2, etc.
      /^I_/i, // I_tube_m4, etc.
      /^G_/i, // G_s_kg_m2s (mass flux)
    ],
  },

  mass_transfer: {
    label: "Mass Transfer",
    icon: "🔄",
    priority: 7,
    patterns: [
      /htu/i,
      /ntu/i,
      /^h_[og]l?$/i,
      /^n_[og]l?$/i,
      /recovery/i,
      /separation/i,
      /stripping/i,
      /absorption/i,
      /k_[gl]_a/i,
      /mass_transfer/i,
      /driving_force/i,
    ],
  },

  heat_exchanger: {
    label: "Heat Exchanger",
    icon: "🔥",
    priority: 7,
    patterns: [
      /shell_/i,
      /tube_/i,
      /baffle/i,
      /fouling/i,
      /tema/i,
      /^u_overall/i,
      /h_shell/i,
      /h_tube/i,
      /corrected/i,
      /f_factor/i,
    ],
  },

  vibration: {
    label: "Vibration",
    icon: "〰️",
    priority: 8,
    patterns: [
      /vibration/i,
      /critical_velocity/i,
      /fluidelastic/i,
      /vortex/i,
      /damping/i,
      /frequency/i,
      /span/i,
    ],
  },

  composition: {
    label: "Composition",
    icon: "🧪",
    priority: 10,
    patterns: [
      /^composition$/i,
      /liquid_composition/i,
      /vapor_composition/i,
      /concentration/i,
      /fraction$/i,
      /mole_frac/i,
      /mass_frac/i,
      /purity/i,
    ],
  },

  distillation: {
    label: "Distillation",
    icon: "🏭",
    priority: 9,
    patterns: [
      /reflux/i,
      /boilup/i,
      /condenser/i,
      /reboiler/i,
      /distillate/i,
      /bottoms/i,
      /tray/i,
      /feed_stage/i,
    ],
  },

  performance: {
    label: "Performance",
    icon: "📈",
    priority: 9,
    patterns: [
      /efficiency(?!_)/i,
      /factor$/i,
      /coefficient/i,
      /ratio/i,
      /^u_/i,
      /overall/i,
      /corrected/i,
    ],
  },

  alerts: {
    label: "Alerts",
    icon: "⚠️",
    priority: 10,
    patterns: [
      /^warnings?$/i,
      /^errors?$/i,
      /^notes?$/i,
      /guidance/i,
      /message/i,
      /model_notes/i,
    ],
  },

  details: {
    label: "Details",
    icon: "📋",
    priority: 99,
    patterns: [], // Catch-all category
  },
};

/**
 * Fields that should always go to summary (high priority)
 */
const SUMMARY_FIELDS = new Set([
  "duty_kW",
  "duty",
  "power_kW",
  "efficiency",
  "head_m",
  "LMTD_K",
  "recovery_percent",
  "num_stages",
  "reflux_ratio",
  "packed_height_m",
]);

/**
 * Detect the category for a single key
 * @param {string} key - The key name to categorize
 * @returns {string} Category name
 */
export function detectCategory(key) {
  if (!key || typeof key !== "string") {
    return "details";
  }

  // Check summary fields first
  if (SUMMARY_FIELDS.has(key)) {
    return "summary";
  }

  // Check each category's patterns
  for (const [categoryName, categoryInfo] of Object.entries(
    CATEGORY_PATTERNS,
  )) {
    if (categoryName === "summary" || categoryName === "details") continue;

    for (const pattern of categoryInfo.patterns) {
      if (pattern.test(key)) {
        return categoryName;
      }
    }
  }

  // Default to details
  return "details";
}

/**
 * Get category metadata (label, icon, priority)
 * @param {string} categoryName - Category name
 * @returns {object} Category metadata
 */
export function getCategoryInfo(categoryName) {
  return CATEGORY_PATTERNS[categoryName] || CATEGORY_PATTERNS.details;
}

/**
 * Categorize all keys in a metadata object
 * @param {object} metadata - The metadata object to categorize
 * @returns {object} Object with category names as keys, each containing relevant key-value pairs
 */
export function categorizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const categorized = {};

  // Initialize categories
  for (const categoryName of Object.keys(CATEGORY_PATTERNS)) {
    categorized[categoryName] = {};
  }

  // Categorize each key
  for (const [key, value] of Object.entries(metadata)) {
    const category = detectCategory(key);
    categorized[category][key] = value;
  }

  // Remove empty categories
  for (const categoryName of Object.keys(categorized)) {
    if (Object.keys(categorized[categoryName]).length === 0) {
      delete categorized[categoryName];
    }
  }

  return categorized;
}

/**
 * Get categories sorted by priority
 * @param {object} categorizedData - Output from categorizeMetadata
 * @returns {array} Array of [categoryName, data] pairs sorted by priority
 */
export function getSortedCategories(categorizedData) {
  return Object.entries(categorizedData).sort(([a], [b]) => {
    const priorityA = CATEGORY_PATTERNS[a]?.priority || 99;
    const priorityB = CATEGORY_PATTERNS[b]?.priority || 99;
    return priorityA - priorityB;
  });
}

/**
 * Extract summary fields from metadata
 * Creates a "quick view" of the most important metrics
 * @param {object} metadata - The metadata object
 * @param {string} equipmentType - Type of equipment (heater, pump, etc.)
 * @returns {object} Summary key-value pairs
 */
export function extractSummary(metadata, equipmentType) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const summary = {};

  // Equipment-type specific priority fields
  const priorityByType = {
    heater: [
      "duty",
      "efficiency",
      "temperature_change_K",
      "phase_change_detected",
    ],
    cooler: [
      "duty",
      "efficiency",
      "temperature_change_K",
      "phase_change_detected",
    ],
    pump: ["power_kW", "head_m", "efficiency", "NPSH_available_m"],
    heat_exchanger: ["duty_kW", "LMTD_K", "F_factor", "U_overall_W_m2K"],
    flash_drum: ["outlet_vapor_fraction", "duty_kW", "equilibrium"],
    distillation_column: [
      "num_stages",
      "reflux_ratio",
      "condenser_duty_kW",
      "reboiler_duty_kW",
    ],
    stripper_column: [
      "recovery_percent",
      "packed_height_m",
      "controlling_resistance",
    ],
    mixer: ["num_inlets_used", "total_molar_flow_kmol_hr"],
    splitter: ["inlet_flow", "split_ratios"],
  };

  const priorityFields = priorityByType[equipmentType] || [];

  // Add priority fields that exist
  for (const field of priorityFields) {
    if (metadata[field] !== undefined) {
      summary[field] = metadata[field];
    }
  }

  // Also add any fields from SUMMARY_FIELDS
  for (const field of SUMMARY_FIELDS) {
    if (metadata[field] !== undefined && !summary[field]) {
      summary[field] = metadata[field];
    }
  }

  return summary;
}

export default categorizeMetadata;
