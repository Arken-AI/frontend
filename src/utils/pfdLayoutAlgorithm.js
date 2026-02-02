/**
 * PFD Layout Algorithm
 *
 * Calculates x, y positions for equipment nodes and connection paths
 * for rendering a Process Flow Diagram.
 *
 * Features:
 * - Left-to-right flow based on execution order
 * - Automatic branch detection and vertical spreading
 * - Orthogonal edge routing (horizontal-vertical-horizontal)
 * - Recycle stream handling (route backwards)
 * - Feed and product stream positioning
 */

import { formatStreamNumber } from "./streamDataCollector";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG = {
  // Node dimensions
  nodeWidth: 120,
  nodeHeight: 60,
  nodeRadius: 8, // Corner radius

  // Spacing
  columnGap: 180, // Horizontal space between columns
  rowGap: 100, // Vertical space between rows
  padding: 60, // Diagram edge padding

  // Stream labels
  labelRadius: 12, // Circle radius for stream numbers
  labelOffset: 15, // Distance from line to label

  // Feed/Product arrows
  feedArrowLength: 80,
  productArrowLength: 80,

  // Port positions (relative to node)
  ports: {
    left: { x: 0, y: 0.5 }, // Inlet (center left)
    right: { x: 1, y: 0.5 }, // Outlet (center right)
    top: { x: 0.5, y: 0 }, // Top outlet
    bottom: { x: 0.5, y: 1 }, // Bottom outlet
    topRight: { x: 1, y: 0.25 },
    bottomRight: { x: 1, y: 0.75 },
  },
};

// =============================================================================
// MAIN LAYOUT FUNCTION
// =============================================================================

/**
 * Calculate layout for PFD diagram.
 *
 * @param {Object} apiResponse - API response with input and result
 * @param {StreamData[]} streams - Collected streams from streamDataCollector
 * @param {Object} [config] - Optional configuration overrides
 * @returns {Object} Layout data with nodes, edges, feeds, products, dimensions
 */
export function calculatePFDLayout(apiResponse, streams, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Handle wrapped or direct response
  const data = apiResponse.result
    ? apiResponse
    : apiResponse.data || apiResponse;
  const { input, result } = data;

  if (!input || !result) {
    console.error("[pfdLayoutAlgorithm] Invalid API response");
    return createEmptyLayout();
  }

  // Build lookup maps
  const equipmentMap = buildEquipmentMap(input.equipment);
  const edgeMap = buildEdgeMap(input.edges);
  const streamNumberMap = buildStreamNumberMap(streams);

  // Step 1: Get execution order (filter pseudo-nodes)
  const executionOrder = (result.execution_order || []).filter(
    (id) => id !== "FEED" && id !== "PRODUCT",
  );

  if (executionOrder.length === 0) {
    return createEmptyLayout();
  }

  // Step 2: Build adjacency information
  const { outgoingEdges, incomingEdges } = buildAdjacencyMaps(input.edges);

  // Step 3: Assign columns and rows
  const { columnAssignments, rowAssignments, maxColumn, maxRow, minRow } =
    assignPositions(executionOrder, outgoingEdges, incomingEdges, equipmentMap);

  // Step 4: Calculate node positions
  const nodes = calculateNodePositions(
    executionOrder,
    columnAssignments,
    rowAssignments,
    equipmentMap,
    cfg,
  );

  // Step 5: Calculate feed entry points
  const feeds = calculateFeedPositions(
    input.feed_streams,
    nodes,
    streamNumberMap,
    cfg,
  );

  // Step 6: Calculate edge paths
  const edges = calculateEdgePaths(
    input.edges,
    nodes,
    streamNumberMap,
    outgoingEdges,
    cfg,
  );

  // Step 7: Calculate product exit points
  const products = calculateProductPositions(
    nodes,
    outgoingEdges,
    result.node_results,
    streamNumberMap,
    cfg,
  );

  // Step 8: Calculate overall dimensions
  const dimensions = calculateDimensions(nodes, feeds, products, cfg);

  return {
    nodes,
    edges,
    feeds,
    products,
    dimensions,
    config: cfg,
  };
}

// =============================================================================
// HELPER FUNCTIONS - Data Building
// =============================================================================

/**
 * Build equipment lookup map
 */
function buildEquipmentMap(equipment) {
  const map = new Map();
  (equipment || []).forEach((eq) => {
    map.set(eq.id, {
      id: eq.id,
      type: eq.type,
      name:
        eq.name ||
        eq.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });
  });
  return map;
}

/**
 * Build edge lookup map
 */
function buildEdgeMap(edges) {
  const map = new Map();
  (edges || []).forEach((edge) => {
    map.set(edge.id, edge);
  });
  return map;
}

/**
 * Build stream number lookup from collected streams
 */
function buildStreamNumberMap(streams) {
  const map = new Map();
  (streams || []).forEach((stream) => {
    map.set(stream.id, {
      number: stream.number,
      displayNumber: formatStreamNumber(stream.number),
      type: stream.type,
      name: stream.name,
    });
  });
  return map;
}

/**
 * Build adjacency maps for graph traversal
 */
function buildAdjacencyMaps(edges) {
  const outgoingEdges = new Map(); // equipmentId -> [edges]
  const incomingEdges = new Map(); // equipmentId -> [edges]

  (edges || []).forEach((edge) => {
    // Outgoing
    if (!outgoingEdges.has(edge.source)) {
      outgoingEdges.set(edge.source, []);
    }
    outgoingEdges.get(edge.source).push(edge);

    // Incoming
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target).push(edge);
  });

  return { outgoingEdges, incomingEdges };
}

// =============================================================================
// HELPER FUNCTIONS - Position Assignment
// =============================================================================

/**
 * Assign column and row positions to each equipment
 */
function assignPositions(
  executionOrder,
  outgoingEdges,
  incomingEdges,
  equipmentMap,
) {
  const columnAssignments = new Map();
  const rowAssignments = new Map();

  // Track which equipment creates branches
  const branchParents = new Set();
  outgoingEdges.forEach((edges, source) => {
    if (edges.length > 1) {
      branchParents.add(source);
    }
  });

  // Assign columns based on execution order
  executionOrder.forEach((equipmentId, index) => {
    columnAssignments.set(equipmentId, index);
  });

  // Assign rows - main flow is row 0, branches spread vertically
  // Simple algorithm: detect branching and offset children
  const visited = new Set();
  const rowOffsets = new Map(); // Track cumulative row offset

  executionOrder.forEach((equipmentId) => {
    if (!rowAssignments.has(equipmentId)) {
      rowAssignments.set(equipmentId, 0); // Default to center row
    }

    // Check if this equipment has multiple outputs
    const outEdges = outgoingEdges.get(equipmentId) || [];
    if (outEdges.length > 1) {
      // Spread children vertically
      const sortedEdges = [...outEdges].sort((a, b) => {
        // Sort by port name to get consistent ordering
        // "distillate" before "bottoms", "top" before "bottom"
        const portOrder = {
          distillate: 0,
          top: 0,
          vapor: 0,
          liquid: 1,
          bottoms: 2,
          bottom: 2,
        };
        const aOrder = portOrder[a.source_port] ?? 1;
        const bOrder = portOrder[b.source_port] ?? 1;
        return aOrder - bOrder;
      });

      sortedEdges.forEach((edge, idx) => {
        const targetId = edge.target;
        const rowOffset = idx - Math.floor(sortedEdges.length / 2);

        // Only assign if not already assigned (avoid overwriting)
        if (!visited.has(targetId)) {
          rowAssignments.set(targetId, rowOffset);
          visited.add(targetId);
        }
      });
    }
  });

  // Calculate max column and row bounds
  let maxColumn = 0;
  let maxRow = 0;
  let minRow = 0;

  columnAssignments.forEach((col) => {
    maxColumn = Math.max(maxColumn, col);
  });

  rowAssignments.forEach((row) => {
    maxRow = Math.max(maxRow, row);
    minRow = Math.min(minRow, row);
  });

  return { columnAssignments, rowAssignments, maxColumn, maxRow, minRow };
}

/**
 * Calculate actual x, y positions for nodes
 */
function calculateNodePositions(
  executionOrder,
  columnAssignments,
  rowAssignments,
  equipmentMap,
  cfg,
) {
  const nodes = [];

  // Calculate center row offset (to center the diagram)
  const rows = Array.from(rowAssignments.values());
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const rowRange = maxRow - minRow + 1;
  const centerOffset = cfg.padding + (rowRange * cfg.rowGap) / 2;

  executionOrder.forEach((equipmentId) => {
    const column = columnAssignments.get(equipmentId) ?? 0;
    const row = rowAssignments.get(equipmentId) ?? 0;
    const equipment = equipmentMap.get(equipmentId);

    const x = cfg.padding + cfg.feedArrowLength + column * cfg.columnGap;
    const y = centerOffset + row * cfg.rowGap;

    nodes.push({
      id: equipmentId,
      type: equipment?.type || "default",
      name: equipment?.name || equipmentId,
      x,
      y,
      width: cfg.nodeWidth,
      height: cfg.nodeHeight,
      column,
      row,
      // Port positions (absolute coordinates)
      ports: {
        left: { x: x, y: y + cfg.nodeHeight / 2 },
        right: { x: x + cfg.nodeWidth, y: y + cfg.nodeHeight / 2 },
        top: { x: x + cfg.nodeWidth / 2, y: y },
        bottom: { x: x + cfg.nodeWidth / 2, y: y + cfg.nodeHeight },
        topRight: { x: x + cfg.nodeWidth, y: y + cfg.nodeHeight * 0.25 },
        bottomRight: { x: x + cfg.nodeWidth, y: y + cfg.nodeHeight * 0.75 },
      },
    });
  });

  return nodes;
}

// =============================================================================
// HELPER FUNCTIONS - Feed Positions
// =============================================================================

/**
 * Calculate feed stream entry points
 */
function calculateFeedPositions(feedStreams, nodes, streamNumberMap, cfg) {
  const feeds = [];

  (feedStreams || []).forEach((feed, index) => {
    const targetNode = nodes.find((n) => n.id === feed.target_equipment);
    if (!targetNode) return;

    const streamInfo = streamNumberMap.get(feed.stream_id);
    const yOffset =
      feedStreams.length > 1 ? (index - (feedStreams.length - 1) / 2) * 30 : 0;

    const startX = cfg.padding;
    const startY = targetNode.ports.left.y + yOffset;
    const endX = targetNode.ports.left.x;
    const endY = startY;

    // Create path for feed arrow
    const path = `M ${startX} ${startY} L ${endX} ${endY}`;

    // Label position (midpoint)
    const labelX = (startX + endX) / 2;
    const labelY = startY - cfg.labelOffset;

    feeds.push({
      id: feed.stream_id,
      streamNumber: streamInfo?.number || 0,
      displayNumber: streamInfo?.displayNumber || "?",
      targetNode: feed.target_equipment,
      targetPort: feed.target_port,
      path,
      startPoint: { x: startX, y: startY },
      endPoint: { x: endX, y: endY },
      labelPosition: { x: labelX, y: labelY },
      label: "Feed",
    });
  });

  return feeds;
}

// =============================================================================
// HELPER FUNCTIONS - Edge Paths
// =============================================================================

/**
 * Calculate paths for all edges
 */
function calculateEdgePaths(edges, nodes, streamNumberMap, outgoingEdges, cfg) {
  const edgePaths = [];

  // Build node lookup
  const nodeMap = new Map();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  (edges || []).forEach((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) return;

    const streamInfo = streamNumberMap.get(edge.id);
    const isRecycle = edge.is_recycle || false;

    // Determine source port based on how many outputs the source has
    const sourceOutEdges = outgoingEdges.get(edge.source) || [];
    let sourcePort = "right";

    if (sourceOutEdges.length > 1) {
      // Multiple outputs - use topRight or bottomRight
      const edgeIndex = sourceOutEdges.findIndex((e) => e.id === edge.id);
      if (edgeIndex === 0) {
        sourcePort = "topRight";
      } else if (edgeIndex === sourceOutEdges.length - 1) {
        sourcePort = "bottomRight";
      } else {
        sourcePort = "right";
      }
    }

    const startPoint = sourceNode.ports[sourcePort];
    const endPoint = targetNode.ports.left;

    // Generate path
    let path;
    if (isRecycle) {
      // Recycle path goes up/down and back
      path = generateRecyclePath(
        startPoint,
        endPoint,
        sourceNode,
        targetNode,
        cfg,
      );
    } else if (startPoint.y === endPoint.y) {
      // Same row - straight horizontal line
      path = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
    } else {
      // Different rows - orthogonal routing
      path = generateOrthogonalPath(startPoint, endPoint, cfg);
    }

    // Calculate label position (midpoint of path)
    const labelPosition = calculatePathMidpoint(
      startPoint,
      endPoint,
      isRecycle,
      cfg,
    );

    edgePaths.push({
      id: edge.id,
      streamNumber: streamInfo?.number || 0,
      displayNumber: streamInfo?.displayNumber || "?",
      source: edge.source,
      target: edge.target,
      sourcePort: edge.source_port,
      targetPort: edge.target_port,
      isRecycle,
      path,
      startPoint,
      endPoint,
      labelPosition,
    });
  });

  return edgePaths;
}

/**
 * Generate orthogonal path (L-shaped or Z-shaped)
 */
function generateOrthogonalPath(start, end, cfg) {
  // Go right, then vertical, then right again
  const midX = (start.x + end.x) / 2;

  return (
    `M ${start.x} ${start.y} ` +
    `L ${midX} ${start.y} ` +
    `L ${midX} ${end.y} ` +
    `L ${end.x} ${end.y}`
  );
}

/**
 * Generate recycle path (goes around and back)
 */
function generateRecyclePath(start, end, sourceNode, targetNode, cfg) {
  // Determine if we need to go up or down
  const goUp = start.y >= end.y;
  const verticalOffset = goUp ? -cfg.rowGap * 0.6 : cfg.rowGap * 0.6;

  const topY = Math.min(start.y, end.y) - Math.abs(verticalOffset);
  const bottomY = Math.max(start.y, end.y) + Math.abs(verticalOffset);
  const routeY = goUp ? topY : bottomY;

  // Path: right → up/down → left → down/up → left to target
  return (
    `M ${start.x} ${start.y} ` +
    `L ${start.x + 30} ${start.y} ` +
    `L ${start.x + 30} ${routeY} ` +
    `L ${end.x - 30} ${routeY} ` +
    `L ${end.x - 30} ${end.y} ` +
    `L ${end.x} ${end.y}`
  );
}

/**
 * Calculate midpoint of path for label placement
 */
function calculatePathMidpoint(start, end, isRecycle, cfg) {
  if (isRecycle) {
    // For recycle, place label at the top/bottom of the loop
    const midX = (start.x + end.x) / 2;
    const offsetY =
      start.y >= end.y
        ? -cfg.rowGap * 0.6 - cfg.labelOffset
        : cfg.rowGap * 0.6 + cfg.labelOffset;
    return { x: midX, y: start.y + offsetY };
  }

  // For normal edges, place at horizontal midpoint
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 - cfg.labelOffset,
  };
}

// =============================================================================
// HELPER FUNCTIONS - Product Positions
// =============================================================================

/**
 * Calculate product stream exit points
 */
function calculateProductPositions(
  nodes,
  outgoingEdges,
  nodeResults,
  streamNumberMap,
  cfg,
) {
  const products = [];

  // Find nodes that have outlets without outgoing edges
  nodes.forEach((node) => {
    const nodeOutEdges = outgoingEdges.get(node.id) || [];
    const nodeResult = nodeResults?.[node.id];

    if (!nodeResult?.outlets) return;

    // Get ports that have edges
    const portsWithEdges = new Set(nodeOutEdges.map((e) => e.source_port));

    // Find outlets without edges (terminal products)
    Object.entries(nodeResult.outlets).forEach(([portName, outlet], index) => {
      if (portsWithEdges.has(portName)) return;

      const streamId = outlet.stream_id || `${node.id}_${portName}`;
      const streamInfo = streamNumberMap.get(streamId);

      // Determine exit port
      const exitPort = node.ports.right;
      const yOffset = index * 25;

      const startX = exitPort.x;
      const startY = exitPort.y + yOffset;
      const endX = startX + cfg.productArrowLength;
      const endY = startY;

      const path = `M ${startX} ${startY} L ${endX} ${endY}`;

      const labelX = (startX + endX) / 2;
      const labelY = startY - cfg.labelOffset;

      products.push({
        id: streamId,
        streamNumber: streamInfo?.number || 0,
        displayNumber: streamInfo?.displayNumber || "?",
        sourceNode: node.id,
        sourcePort: portName,
        path,
        startPoint: { x: startX, y: startY },
        endPoint: { x: endX, y: endY },
        labelPosition: { x: labelX, y: labelY },
        label: "Product",
      });
    });
  });

  return products;
}

// =============================================================================
// HELPER FUNCTIONS - Dimensions
// =============================================================================

/**
 * Calculate overall diagram dimensions
 */
function calculateDimensions(nodes, feeds, products, cfg) {
  let maxX = 0;
  let maxY = 0;
  let minY = Infinity;

  // From nodes
  nodes.forEach((node) => {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
    minY = Math.min(minY, node.y);
  });

  // From products (extend right)
  products.forEach((product) => {
    maxX = Math.max(maxX, product.endPoint.x);
  });

  // Add padding
  const width = maxX + cfg.padding;
  const height = maxY - minY + cfg.padding * 2;

  return {
    width,
    height,
    minY: minY - cfg.padding,
    viewBox: `0 ${minY - cfg.padding} ${width} ${height}`,
  };
}

/**
 * Create empty layout for error cases
 */
function createEmptyLayout() {
  return {
    nodes: [],
    edges: [],
    feeds: [],
    products: [],
    dimensions: { width: 400, height: 200, minY: 0, viewBox: "0 0 400 200" },
    config: DEFAULT_CONFIG,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  calculatePFDLayout,
  DEFAULT_CONFIG,
};
