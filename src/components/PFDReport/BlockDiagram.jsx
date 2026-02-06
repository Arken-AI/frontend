/**
 * Block Diagram Component
 *
 * Renders an SVG-based Process Flow Diagram (PFD) showing equipment
 * connected by stream lines with numbered labels.
 *
 * Features:
 * - Equipment boxes with names and type icons
 * - Stream lines with arrow markers
 * - Circled stream numbers on connections
 * - Feed and product stream arrows
 * - Recycle streams with dashed lines
 * - Color-coded stream types
 */

import { useMemo } from "react";
import { calculatePFDLayout } from "../../utils/pfdLayoutAlgorithm";
import { collectAllStreams } from "../../utils/streamDataCollector";

// =============================================================================
// EQUIPMENT TYPE ICONS
// =============================================================================

const EQUIPMENT_ICONS = {
  mixer: "M",
  splitter: "S",
  heater: "H",
  cooler: "C",
  pump: "P",
  compressor: "K",
  valve: "V",
  flash_drum: "F",
  distillation_column: "D",
  column: "D",
  stripper_column: "ST",
  absorber: "A",
  reactor: "R",
  heat_exchanger: "HX",
  multi_effect_evaporator: "ME",
  evaporator: "E",
  crystallizer: "CR",
  centrifuge: "CF",
  filter: "FI",
  tank: "T",
  default: "□",
};

/**
 * Get icon/abbreviation for equipment type
 */
function getEquipmentIcon(type) {
  return EQUIPMENT_ICONS[type] || EQUIPMENT_ICONS.default;
}

// =============================================================================
// SVG MARKER DEFINITIONS
// =============================================================================

function SvgDefs() {
  return (
    <defs>
      {/* Arrow marker for normal streams - lighter gray */}
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
      </marker>

      {/* Arrow marker for recycle streams */}
      <marker
        id="arrowhead-recycle"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
      </marker>

      {/* Arrow marker for feed streams */}
      <marker
        id="arrowhead-feed"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
      </marker>

      {/* Arrow marker for product streams */}
      <marker
        id="arrowhead-product"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
      </marker>

      {/* Shadow filter for nodes */}
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.15" />
      </filter>
    </defs>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Equipment Node - Clean simple box with just the name (like FlowCanvas)
 */
function EquipmentNode({ node, onClick, isSelected }) {
  // Split long names into two lines for readability
  const maxCharsPerLine = Math.floor(node.width / 10);
  const name = node.name || '';
  let lines;
  if (name.length <= maxCharsPerLine) {
    lines = [name];
  } else {
    // Split at last space before maxChars, or force-split
    const mid = name.lastIndexOf(' ', maxCharsPerLine);
    if (mid > 0) {
      lines = [name.slice(0, mid), name.slice(mid + 1)];
    } else {
      lines = [name.slice(0, maxCharsPerLine), name.slice(maxCharsPerLine)];
    }
    // Truncate second line if still too long
    if (lines[1] && lines[1].length > maxCharsPerLine) {
      lines[1] = lines[1].slice(0, maxCharsPerLine - 2) + '..';
    }
  }

  return (
    <g
      className="equipment-node"
      transform={`translate(${node.x}, ${node.y})`}
      onClick={() => onClick?.(node.id)}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Background rectangle - clean white with subtle border */}
      <rect
        width={node.width}
        height={node.height}
        rx={8}
        ry={8}
        fill={isSelected ? "#eff6ff" : "white"}
        stroke={isSelected ? "#3b82f6" : "#cbd5e1"}
        strokeWidth={2}
        filter="url(#shadow)"
      />

      {/* Equipment name - centered, supports two lines for long names */}
      {lines.length === 1 ? (
        <text
          x={node.width / 2}
          y={node.height / 2 + 5}
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill={isSelected ? "#1e40af" : "#374151"}
          fontFamily="Arial, Helvetica, sans-serif"
        >
          {lines[0]}
        </text>
      ) : (
        <>
          <text
            x={node.width / 2}
            y={node.height / 2 - 3}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill={isSelected ? "#1e40af" : "#374151"}
            fontFamily="Arial, Helvetica, sans-serif"
          >
            {lines[0]}
          </text>
          <text
            x={node.width / 2}
            y={node.height / 2 + 14}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill={isSelected ? "#1e40af" : "#374151"}
            fontFamily="Arial, Helvetica, sans-serif"
          >
            {lines[1]}
          </text>
        </>
      )}
    </g>
  );
}

/**
 * Stream Line (Edge between equipment)
 */
function StreamLine({ edge, onClick }) {
  const strokeColor = edge.isRecycle ? "#f97316" : "#94a3b8";
  const strokeDash = edge.isRecycle ? "5,5" : "none";
  const markerId = edge.isRecycle ? "url(#arrowhead-recycle)" : "url(#arrowhead)";

  return (
    <g className="stream-line" onClick={() => onClick?.(edge.streamNumber)}>
      {/* Path */}
      <path
        d={edge.path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={strokeDash}
        markerEnd={markerId}
        style={{ cursor: onClick ? "pointer" : "default" }}
      />

      {/* Stream number label */}
      <StreamLabel
        x={edge.labelPosition.x}
        y={edge.labelPosition.y}
        number={edge.streamNumber}
        type={edge.isRecycle ? "recycle" : "intermediate"}
      />
    </g>
  );
}

/**
 * Feed Stream Arrow
 */
function FeedArrow({ feed, onClick }) {
  return (
    <g className="feed-arrow" onClick={() => onClick?.(feed.streamNumber)}>
      {/* Path */}
      <path
        d={feed.path}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        markerEnd="url(#arrowhead-feed)"
        style={{ cursor: onClick ? "pointer" : "default" }}
      />

      {/* "Feed" label */}
      <text
        x={feed.startPoint.x + 5}
        y={feed.startPoint.y - 8}
        fontSize="10"
        fill="#3b82f6"
        fontWeight="500"
      >
        {feed.label}
      </text>

      {/* Stream number */}
      <StreamLabel
        x={feed.labelPosition.x}
        y={feed.labelPosition.y}
        number={feed.streamNumber}
        type="feed"
      />
    </g>
  );
}

/**
 * Product Stream Arrow
 */
function ProductArrow({ product, onClick }) {
  return (
    <g className="product-arrow" onClick={() => onClick?.(product.streamNumber)}>
      {/* Path */}
      <path
        d={product.path}
        fill="none"
        stroke="#22c55e"
        strokeWidth={2}
        markerEnd="url(#arrowhead-product)"
        style={{ cursor: onClick ? "pointer" : "default" }}
      />

      {/* "Product" label - positioned at the end of arrow */}
      <text
        x={product.endPoint.x + 5}
        y={product.endPoint.y + 4}
        fontSize="10"
        fill="#22c55e"
        fontWeight="500"
        textAnchor="start"
      >
        {product.label}
      </text>

      {/* Stream number */}
      <StreamLabel
        x={product.labelPosition.x}
        y={product.labelPosition.y}
        number={product.streamNumber}
        type="product"
      />
    </g>
  );
}

/**
 * Inline Stream Number Label (pill-shaped, rendered ON the line)
 * Matches the ──4── style used in FlowCanvas/React Flow
 */
function StreamLabel({ x, y, number, type }) {
  const colors = {
    feed: { bg: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
    product: { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
    recycle: { bg: "#ffedd5", border: "#f97316", text: "#c2410c" },
    intermediate: { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" },
  };

  const color = colors[type] || colors.intermediate;

  // Pill dimensions based on number of digits
  const label = String(number);
  const pillWidth = Math.max(24, label.length * 10 + 12);
  const pillHeight = 20;

  return (
    <g className="stream-label">
      {/* Background pill (rounded rectangle) */}
      <rect
        x={x - pillWidth / 2}
        y={y - pillHeight / 2}
        width={pillWidth}
        height={pillHeight}
        rx={pillHeight / 2}
        ry={pillHeight / 2}
        fill={color.bg}
        stroke={color.border}
        strokeWidth={1.5}
      />

      {/* Number text - centered on the line */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="700"
        fill={color.text}
        fontFamily="Arial, Helvetica, sans-serif"
      >
        {number}
      </text>
    </g>
  );
}

/**
 * Diagram Title
 */
function DiagramTitle({ title, x, y }) {
  return (
    <text
      x={x}
      y={y}
      fontSize="16"
      fontWeight="600"
      fill="#1f2937"
      textAnchor="middle"
    >
      {title}
    </text>
  );
}

/**
 * Legend showing stream type colors
 */
function Legend({ x, y }) {
  const items = [
    { label: "Feed", color: "#3b82f6" },
    { label: "Intermediate", color: "#94a3b8" },
    { label: "Product", color: "#22c55e" },
    { label: "Recycle", color: "#f97316", dashed: true },
  ];

  return (
    <g className="legend" transform={`translate(${x}, ${y})`}>
      {items.map((item, index) => (
        <g key={item.label} transform={`translate(${index * 120}, 0)`}>
          <line
            x1={0}
            y1={0}
            x2={30}
            y2={0}
            stroke={item.color}
            strokeWidth={2}
            strokeDasharray={item.dashed ? "5,5" : "none"}
          />
          <text x={36} y={4} fontSize="11" fill="#64748b">
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Truncate name to fit in box
 */
function truncateName(name, maxLength) {
  if (!name) return "";
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 2) + "..";
}

/**
 * Format equipment type for display
 */
function formatType(type) {
  if (!type) return "";
  return type
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Block Diagram Component
 */
export default function BlockDiagram({
  apiResponse,
  streams: providedStreams,
  width: customWidth,
  height: customHeight,
  title = "Process Flow Diagram",
  showTitle = true,
  showLegend = true,
  showStreamNumbers = true,
  onEquipmentClick = null,
  onStreamClick = null,
  selectedEquipment = null,
  className = "",
}) {
  // Collect streams if not provided
  const streams = useMemo(() => {
    if (providedStreams) return providedStreams;
    const { streams: collected } = collectAllStreams(apiResponse);
    return collected;
  }, [apiResponse, providedStreams]);

  // Calculate layout
  const layout = useMemo(() => {
    return calculatePFDLayout(apiResponse, streams);
  }, [apiResponse, streams]);

  // Handle empty layout
  if (!layout || layout.nodes.length === 0) {
    return (
      <div className={`block-diagram-empty p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg ${className}`}>
        <p>No equipment to display</p>
      </div>
    );
  }

  // Use calculated or custom dimensions
  const width = customWidth || layout.dimensions.width;
  const height = customHeight || layout.dimensions.height + (showTitle ? 40 : 0) + (showLegend ? 30 : 0);

  // Adjust viewBox for title and legend
  const titleOffset = showTitle ? 40 : 0;
  const legendOffset = showLegend ? 30 : 0;
  const viewBoxY = layout.dimensions.minY - titleOffset;
  const viewBoxHeight = layout.dimensions.height + titleOffset + legendOffset;
  const viewBox = `0 ${viewBoxY} ${width} ${viewBoxHeight}`;

  return (
    <div className={`block-diagram ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: width, maxHeight: height }}
      >
        {/* SVG Definitions (markers, filters) */}
        <SvgDefs />

        {/* Background */}
        <rect
          x={0}
          y={viewBoxY}
          width={width}
          height={viewBoxHeight}
          fill="white"
        />

        {/* Title */}
        {showTitle && (
          <DiagramTitle
            title={title}
            x={width / 2}
            y={viewBoxY + 25}
          />
        )}

        {/* Legend */}
        {showLegend && (
          <Legend
            x={width / 2 - 180}
            y={viewBoxY + viewBoxHeight - 15}
          />
        )}

        {/* Render order: edges first, then nodes (so nodes are on top) */}

        {/* Feed arrows */}
        {layout.feeds.map((feed) => (
          <FeedArrow
            key={feed.id}
            feed={feed}
            onClick={onStreamClick}
          />
        ))}

        {/* Stream lines (edges) */}
        {layout.edges.map((edge) => (
          <StreamLine
            key={edge.id}
            edge={edge}
            onClick={onStreamClick}
          />
        ))}

        {/* Product arrows */}
        {layout.products.map((product) => (
          <ProductArrow
            key={product.id}
            product={product}
            onClick={onStreamClick}
          />
        ))}

        {/* Equipment nodes */}
        {layout.nodes.map((node) => (
          <EquipmentNode
            key={node.id}
            node={node}
            onClick={onEquipmentClick}
            isSelected={selectedEquipment === node.id}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Compact version for smaller displays
 */
export function CompactBlockDiagram(props) {
  return (
    <BlockDiagram
      {...props}
      showTitle={false}
      showLegend={false}
    />
  );
}

/**
 * Print-friendly version with white background
 */
export function PrintableBlockDiagram(props) {
  return (
    <BlockDiagram
      {...props}
      className={`${props.className || ""} print-friendly`}
    />
  );
}
