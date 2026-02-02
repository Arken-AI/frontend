/**
 * Stream Data Table Component
 *
 * Renders a horizontal material balance table for PFD Reports.
 * Displays component compositions, flow rates, temperatures, and pressures
 * for all streams in the simulation.
 *
 * Features:
 * - Dynamic columns based on stream count
 * - Dynamic rows based on compounds
 * - Color-coded columns by stream type (feed/product/recycle)
 * - Sticky header and first column for large tables
 * - Responsive with horizontal scroll
 */

import { useMemo } from "react";

/**
 * Get background color class based on stream type
 */
function getColumnBgClass(type, isHeader = false) {
  const baseColors = {
    feed: isHeader ? "bg-blue-100" : "bg-blue-50",
    product: isHeader ? "bg-green-100" : "bg-green-50",
    recycle: isHeader ? "bg-orange-100" : "bg-orange-50",
    intermediate: isHeader ? "bg-gray-100" : "bg-white",
  };
  return baseColors[type] || baseColors.intermediate;
}

/**
 * Get text color class based on stream type (for headers)
 */
function getColumnTextClass(type) {
  const textColors = {
    feed: "text-blue-700",
    product: "text-green-700",
    recycle: "text-orange-700",
    intermediate: "text-gray-700",
  };
  return textColors[type] || textColors.intermediate;
}

/**
 * Stream Data Table Component
 */
export default function StreamDataTable({
  tableData,
  className = "",
  compact = false,
  showUnits = true,
  highlightFeeds = true,
  highlightProducts = true,
  highlightRecycles = true,
  stickyHeader = true,
  stickyFirstColumn = true,
  title = "Material Balance",
  onStreamClick = null,
}) {
  // Validate tableData
  if (!tableData || !tableData.rows || !tableData.columns || !tableData.data) {
    return (
      <div className="p-4 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
        No stream data available
      </div>
    );
  }

  const { rows, columns, data, metadata } = tableData;

  // Separate component rows from property rows
  const componentRows = useMemo(
    () => rows.filter((r) => r.type === "component"),
    [rows]
  );

  const propertyRows = useMemo(
    () => rows.filter((r) => r.type === "summary" || r.type === "property"),
    [rows]
  );

  // Cell size classes based on compact mode
  const cellPadding = compact ? "px-2 py-1" : "px-3 py-2";
  const fontSize = compact ? "text-xs" : "text-sm";
  const headerFontSize = compact ? "text-xs" : "text-sm";

  /**
   * Get column background based on settings and type
   */
  const getColBg = (type, isHeader = false) => {
    if (type === "feed" && !highlightFeeds) return isHeader ? "bg-gray-100" : "bg-white";
    if (type === "product" && !highlightProducts) return isHeader ? "bg-gray-100" : "bg-white";
    if (type === "recycle" && !highlightRecycles) return isHeader ? "bg-gray-100" : "bg-white";
    return getColumnBgClass(type, isHeader);
  };

  /**
   * Format cell value for display
   */
  const formatCellValue = (value) => {
    if (value === "—" || value === "-" || value === null || value === undefined) {
      return <span className="text-gray-400">—</span>;
    }
    if (value === "Trace") {
      return <span className="text-gray-400 italic">Trace</span>;
    }
    return value;
  };

  return (
    <div className={`stream-data-table ${className}`}>
      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📊</span>
          <span>{title}</span>
          <span className="text-sm font-normal text-gray-500">
            ({columns.length} streams, {componentRows.length} components)
          </span>
        </h3>
      )}

      {/* Table Container with horizontal scroll */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className={`min-w-full border-collapse ${fontSize}`}>
          {/* Table Header */}
          <thead className={stickyHeader ? "sticky top-0 z-20" : ""}>
            {/* Stream Number Row */}
            <tr className="border-b border-gray-300">
              {/* Corner cell */}
              <th
                className={`${cellPadding} ${headerFontSize} font-semibold text-left text-gray-600 bg-gray-50 border-r border-gray-200 ${
                  stickyFirstColumn ? "sticky left-0 z-30" : ""
                }`}
                style={stickyFirstColumn ? { minWidth: "120px" } : {}}
              >
                Component
              </th>

              {/* Stream headers */}
              {columns.map((col) => (
                <th
                  key={col.number}
                  className={`${cellPadding} ${headerFontSize} font-semibold text-center border-r border-gray-200 last:border-r-0 ${getColBg(
                    col.type,
                    true
                  )} ${getColumnTextClass(col.type)} ${
                    onStreamClick ? "cursor-pointer hover:opacity-80" : ""
                  }`}
                  style={{ minWidth: compact ? "80px" : "100px" }}
                  onClick={() => onStreamClick?.(col.number)}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-lg leading-none">{col.displayNumber}</span>
                    <span className="text-xs font-normal truncate max-w-[90px]" title={col.name}>
                      {col.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Component Rows */}
            {componentRows.map((row, rowIndex) => (
              <tr
                key={row.key}
                className={`border-b border-gray-100 hover:bg-gray-50 ${
                  rowIndex % 2 === 1 ? "bg-gray-50/30" : ""
                }`}
              >
                {/* Row label (component name) */}
                <td
                  className={`${cellPadding} font-medium text-gray-700 border-r border-gray-200 bg-white ${
                    stickyFirstColumn ? "sticky left-0 z-10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{row.label}</span>
                    {showUnits && row.unit && (
                      <span className="text-xs text-gray-400">({row.unit})</span>
                    )}
                  </div>
                </td>

                {/* Data cells */}
                {columns.map((col) => (
                  <td
                    key={`${row.key}-${col.number}`}
                    className={`${cellPadding} text-right font-mono border-r border-gray-100 last:border-r-0 ${getColBg(
                      col.type
                    )}`}
                  >
                    {formatCellValue(data[col.number]?.[row.key])}
                  </td>
                ))}
              </tr>
            ))}

            {/* Separator Row */}
            {propertyRows.length > 0 && (
              <tr className="border-b-2 border-gray-300">
                <td
                  colSpan={columns.length + 1}
                  className="h-1 bg-gray-200"
                />
              </tr>
            )}

            {/* Property/Summary Rows */}
            {propertyRows.map((row, rowIndex) => (
              <tr
                key={row.key}
                className={`border-b border-gray-100 ${
                  rowIndex % 2 === 0 ? "bg-gray-50" : "bg-gray-100/50"
                }`}
              >
                {/* Row label */}
                <td
                  className={`${cellPadding} font-semibold text-gray-600 border-r border-gray-200 bg-gray-50 ${
                    stickyFirstColumn ? "sticky left-0 z-10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{row.label}</span>
                    {showUnits && row.unit && (
                      <span className="text-xs text-gray-400">({row.unit})</span>
                    )}
                  </div>
                </td>

                {/* Data cells */}
                {columns.map((col) => (
                  <td
                    key={`${row.key}-${col.number}`}
                    className={`${cellPadding} text-right font-mono font-medium border-r border-gray-100 last:border-r-0 ${
                      row.key === "phase" ? "text-center" : ""
                    } ${getColBg(col.type)}`}
                  >
                    {formatCellValue(data[col.number]?.[row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with metadata */}
      {metadata && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>
            Flow basis: <strong>{metadata.flowBasis}</strong>
          </span>
          <span>
            Composition basis: <strong>{metadata.compositionBasis}</strong>
          </span>
          {metadata.options?.pressureUnit && (
            <span>
              Pressure unit: <strong>{metadata.options.pressureUnit}</strong>
            </span>
          )}
          {metadata.options?.temperatureUnit && (
            <span>
              Temperature unit: <strong>{metadata.options.temperatureUnit}</strong>
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {highlightFeeds && columns.some((c) => c.type === "feed") && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
            <span className="text-gray-600">Feed Streams</span>
          </div>
        )}
        {highlightProducts && columns.some((c) => c.type === "product") && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-200" />
            <span className="text-gray-600">Product Streams</span>
          </div>
        )}
        {highlightRecycles && columns.some((c) => c.type === "recycle") && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200" />
            <span className="text-gray-600">Recycle Streams</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-200" />
          <span className="text-gray-600">Intermediate Streams</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller displays or embedded views
 */
export function CompactStreamDataTable(props) {
  return <StreamDataTable {...props} compact={true} showUnits={false} />;
}

/**
 * Print-friendly version with no sticky positioning
 */
export function PrintableStreamDataTable(props) {
  return (
    <StreamDataTable
      {...props}
      stickyHeader={false}
      stickyFirstColumn={false}
      className={`${props.className || ""} print-friendly`}
    />
  );
}
