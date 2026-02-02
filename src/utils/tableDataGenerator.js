/**
 * Table Data Generator Utility
 *
 * Transforms collected stream data into a table-ready structure
 * for the Material Balance Table in PFD Reports.
 */

import { formatCompound } from "./compoundFormatter";
import { formatStreamNumber } from "./streamDataCollector";

/**
 * @typedef {Object} TableRow
 * @property {string} key - Unique row identifier (compound name or 'total', 'temperature', 'pressure')
 * @property {string} label - Display label (formatted compound name or property name)
 * @property {string} [unit] - Unit of measurement (optional)
 * @property {'component'|'summary'|'property'} type - Row type for styling
 */

/**
 * @typedef {Object} TableColumn
 * @property {number} number - Stream number
 * @property {string} id - Stream ID
 * @property {string} name - Stream name for header
 * @property {string} displayNumber - Formatted number (①, ②, etc.)
 * @property {'feed'|'intermediate'|'product'|'recycle'} type - Stream type
 */

/**
 * @typedef {Object} TableData
 * @property {TableRow[]} rows - Row definitions
 * @property {TableColumn[]} columns - Column definitions
 * @property {Object} data - Cell values: { [streamNumber]: { [rowKey]: value } }
 * @property {Object} metadata - Table metadata
 */

/**
 * Configuration options for table generation.
 */
const DEFAULT_OPTIONS = {
  // Number formatting
  compositionDecimals: 4, // Decimal places for composition values
  flowRateDecimals: 2, // Decimal places for flow rates
  temperatureDecimals: 1, // Decimal places for temperature
  pressureDecimals: 1, // Decimal places for pressure

  // Display options
  showAsPercentage: false, // Show composition as percentage (multiply by 100)
  pressureUnit: "kPa", // 'Pa', 'kPa', 'bar', 'atm'
  temperatureUnit: "K", // 'K', 'C', 'F'

  // Content options
  includePhase: true, // Include phase row
  includeVaporFraction: false, // Include vapor fraction row
  includeTotalFlow: true, // Include total flow row

  // Null value display
  nullValue: "—", // What to show for missing/null values
  traceThreshold: 1e-6, // Values below this show as "Trace"
  traceLabel: "Trace",
};

/**
 * Generate table data structure from collected stream data.
 *
 * @param {string[]} compounds - List of compound names
 * @param {StreamData[]} streams - Array of stream data from collectAllStreams
 * @param {Object} [options] - Configuration options
 * @returns {TableData} Table-ready data structure
 *
 * @example
 * const { compounds, streams } = collectAllStreams(apiResponse);
 * const tableData = generateTableData(compounds, streams);
 * // Use tableData.rows, tableData.columns, tableData.data in StreamDataTable component
 */
export function generateTableData(compounds, streams, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // ============================================================
  // Build Rows (Components + Summary Properties)
  // ============================================================
  const rows = [];

  // Component rows (one per compound)
  compounds.forEach((compound) => {
    rows.push({
      key: compound,
      label: formatCompound(compound),
      unit: opts.showAsPercentage ? "%" : "mol frac",
      type: "component",
    });
  });

  // Summary rows
  if (opts.includeTotalFlow) {
    const flowBasis = streams[0]?.flow_basis || "molar";
    const flowUnit = flowBasis === "mass" ? "kg/s" : "mol/s";
    rows.push({
      key: "total_flow",
      label: "Total Flow",
      unit: flowUnit,
      type: "summary",
    });
  }

  // Temperature row
  rows.push({
    key: "temperature",
    label: "Temperature",
    unit: opts.temperatureUnit,
    type: "property",
  });

  // Pressure row
  rows.push({
    key: "pressure",
    label: "Pressure",
    unit: opts.pressureUnit,
    type: "property",
  });

  // Phase row (optional)
  if (opts.includePhase) {
    rows.push({
      key: "phase",
      label: "Phase",
      unit: "",
      type: "property",
    });
  }

  // Vapor fraction row (optional)
  if (opts.includeVaporFraction) {
    rows.push({
      key: "vapor_fraction",
      label: "Vapor Frac.",
      unit: "",
      type: "property",
    });
  }

  // ============================================================
  // Build Columns (One per Stream)
  // ============================================================
  const columns = streams.map((stream) => ({
    number: stream.number,
    id: stream.id,
    name: stream.name,
    displayNumber: formatStreamNumber(stream.number),
    type: stream.type,
  }));

  // ============================================================
  // Build Cell Data
  // ============================================================
  const data = {};

  streams.forEach((stream) => {
    const cellData = {};

    // Component values (composition)
    compounds.forEach((compound) => {
      const value = stream.composition?.[compound];
      cellData[compound] = formatCompositionValue(value, opts);
    });

    // Total flow
    if (opts.includeTotalFlow) {
      cellData.total_flow = formatNumber(
        stream.flow_rate,
        opts.flowRateDecimals,
        opts,
      );
    }

    // Temperature
    cellData.temperature = formatTemperature(stream.temperature_K, opts);

    // Pressure
    cellData.pressure = formatPressure(stream.pressure_Pa, opts);

    // Phase
    if (opts.includePhase) {
      cellData.phase = formatPhase(stream.phase);
    }

    // Vapor fraction
    if (opts.includeVaporFraction) {
      cellData.vapor_fraction = formatNumber(stream.vapor_fraction, 3, opts);
    }

    data[stream.number] = cellData;
  });

  // ============================================================
  // Build Metadata
  // ============================================================
  const metadata = {
    totalRows: rows.length,
    totalColumns: columns.length,
    componentRows: compounds.length,
    flowBasis: streams[0]?.flow_basis || "molar",
    compositionBasis: streams[0]?.composition_basis || "molar",
    options: opts,
  };

  return { rows, columns, data, metadata };
}

/**
 * Format a composition value for display.
 */
function formatCompositionValue(value, opts) {
  if (value === undefined || value === null) {
    return opts.nullValue;
  }

  if (value < opts.traceThreshold && value > 0) {
    return opts.traceLabel;
  }

  if (value === 0) {
    return opts.nullValue;
  }

  const displayValue = opts.showAsPercentage ? value * 100 : value;
  return displayValue.toFixed(opts.compositionDecimals);
}

/**
 * Format a number for display.
 */
function formatNumber(value, decimals, opts) {
  if (value === undefined || value === null) {
    return opts.nullValue;
  }
  return value.toFixed(decimals);
}

/**
 * Format temperature with unit conversion.
 */
function formatTemperature(kelvin, opts) {
  if (kelvin === undefined || kelvin === null || kelvin <= 0) {
    return opts.nullValue;
  }

  let value = kelvin;

  switch (opts.temperatureUnit) {
    case "C":
      value = kelvin - 273.15;
      break;
    case "F":
      value = ((kelvin - 273.15) * 9) / 5 + 32;
      break;
    case "K":
    default:
      value = kelvin;
  }

  return value.toFixed(opts.temperatureDecimals);
}

/**
 * Format pressure with unit conversion.
 */
function formatPressure(pascals, opts) {
  if (pascals === undefined || pascals === null || pascals <= 0) {
    return opts.nullValue;
  }

  let value = pascals;

  switch (opts.pressureUnit) {
    case "kPa":
      value = pascals / 1000;
      break;
    case "bar":
      value = pascals / 100000;
      break;
    case "atm":
      value = pascals / 101325;
      break;
    case "Pa":
    default:
      value = pascals;
  }

  return value.toFixed(opts.pressureDecimals);
}

/**
 * Format phase for display.
 */
function formatPhase(phase) {
  if (!phase) return "—";

  const phaseMap = {
    liquid: "L",
    vapor: "V",
    gas: "V",
    "liquid-vapor": "L-V",
    "vapor-liquid": "L-V",
    solid: "S",
    slurry: "SL",
    "two-phase": "L-V",
  };

  return phaseMap[phase.toLowerCase()] || phase;
}

/**
 * Generate a summary row with totals across all streams.
 * Useful for mass balance verification.
 *
 * @param {TableData} tableData - Generated table data
 * @param {string[]} compounds - Compound list
 * @returns {Object} Summary with total mass/molar flows per compound
 */
export function generateBalanceSummary(tableData, compounds) {
  const summary = {
    totalIn: {},
    totalOut: {},
    balance: {},
  };

  compounds.forEach((compound) => {
    summary.totalIn[compound] = 0;
    summary.totalOut[compound] = 0;
  });

  // Calculate totals by stream type
  tableData.columns.forEach((col) => {
    const streamData = tableData.data[col.number];
    const totalFlow = parseFloat(streamData.total_flow) || 0;

    compounds.forEach((compound) => {
      const fraction = parseFloat(streamData[compound]) || 0;
      const componentFlow = totalFlow * fraction;

      if (col.type === "feed") {
        summary.totalIn[compound] += componentFlow;
      } else if (col.type === "product") {
        summary.totalOut[compound] += componentFlow;
      }
    });
  });

  // Calculate balance (should be ~0 for closed systems)
  compounds.forEach((compound) => {
    summary.balance[compound] =
      summary.totalIn[compound] - summary.totalOut[compound];
  });

  return summary;
}

/**
 * Get table data as a 2D array for CSV export.
 *
 * @param {TableData} tableData - Generated table data
 * @returns {string[][]} 2D array suitable for CSV generation
 */
export function tableDataToArray(tableData) {
  const { rows, columns, data } = tableData;

  // Header row
  const header = [
    "Component",
    ...columns.map((c) => `${c.displayNumber} ${c.name}`),
  ];

  // Data rows
  const dataRows = rows.map((row) => {
    const rowData = [row.label];
    columns.forEach((col) => {
      rowData.push(data[col.number]?.[row.key] ?? "—");
    });
    return rowData;
  });

  return [header, ...dataRows];
}

/**
 * Export table data to CSV string.
 *
 * @param {TableData} tableData - Generated table data
 * @returns {string} CSV formatted string
 */
export function tableDataToCSV(tableData) {
  const array = tableDataToArray(tableData);

  return array
    .map((row) =>
      row
        .map((cell) => {
          // Escape cells containing commas or quotes
          const str = String(cell);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    )
    .join("\n");
}

export default {
  generateTableData,
  generateBalanceSummary,
  tableDataToArray,
  tableDataToCSV,
  DEFAULT_OPTIONS,
};
