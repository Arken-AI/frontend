/**
 * Stream Data Collector Utility
 *
 * Extracts and normalizes all streams from any process simulation API response
 * into a standardized format for PFD Report generation.
 *
 * Works with any process type: distillation, stripping, evaporation, etc.
 */

/**
 * @typedef {Object} StreamData
 * @property {number} number - Sequential stream number (1, 2, 3...)
 * @property {string} id - Original stream/edge ID from API
 * @property {string} name - Human-readable stream name
 * @property {'feed'|'intermediate'|'product'|'recycle'} type - Stream classification
 * @property {number} temperature_K - Temperature in Kelvin
 * @property {number} pressure_Pa - Pressure in Pascals
 * @property {number} flow_rate - Flow rate (units depend on flow_basis)
 * @property {string} flow_basis - "molar" or "mass"
 * @property {Object} composition - Component fractions { compound: fraction }
 * @property {string} composition_basis - "molar" or "mass"
 * @property {string} phase - "liquid", "vapor", "liquid-vapor", "solid"
 * @property {number} vapor_fraction - Vapor fraction (0-1)
 * @property {string|null} source - Source equipment ID or "Feed"
 * @property {string|null} target - Target equipment ID or "Product"
 * @property {string|null} sourcePort - Source port name
 * @property {string|null} targetPort - Target port name
 * @property {boolean} isRecycle - Whether this is a recycle stream
 * @property {boolean} isTerminal - Whether this goes to product (no downstream equipment)
 */

/**
 * @typedef {Object} CollectedStreamData
 * @property {string[]} compounds - List of compound names from the simulation
 * @property {StreamData[]} streams - Array of all streams in order
 * @property {Object} metadata - Additional information about the collection
 */

/**
 * Collect all streams from an API response into a standardized format.
 *
 * @param {Object} apiResponse - The data field from API response (apiResponse.data or direct response)
 * @returns {CollectedStreamData} Standardized stream data
 *
 * @example
 * const { compounds, streams } = collectAllStreams(apiResponse.data);
 * // compounds: ["benzene", "toluene"]
 * // streams: [{ number: 1, id: "fresh_feed", name: "Fresh Feed", ... }, ...]
 */
export function collectAllStreams(apiResponse) {
  // Handle both wrapped (apiResponse.data) and direct response formats
  const data = apiResponse.result
    ? apiResponse
    : apiResponse.data || apiResponse;

  const { input, result } = data;

  if (!input || !result) {
    console.error(
      "[streamDataCollector] Invalid API response structure:",
      data,
    );
    return {
      compounds: [],
      streams: [],
      metadata: { error: "Invalid response structure" },
    };
  }

  const compounds = input.compounds || [];
  const streams = [];
  let streamNumber = 1;

  // Track which edge IDs we've processed to avoid duplicates
  const processedEdgeIds = new Set();

  // Track feed stream IDs for later reference
  const feedStreamIds = new Set(
    input.feed_streams?.map((f) => f.stream_id) || [],
  );

  // Build edge lookup: edgeId -> edge definition
  const edgeMap = new Map();
  (input.edges || []).forEach((edge) => {
    edgeMap.set(edge.id, edge);
  });

  // Build equipment lookup for names
  const equipmentMap = new Map();
  (input.equipment || []).forEach((eq) => {
    equipmentMap.set(eq.id, eq);
  });

  // Helper: Get equipment display name
  const getEquipmentName = (id) => {
    if (!id) return null;
    if (id === "FEED") return "Feed";
    if (id === "PRODUCT") return "Product";
    const eq = equipmentMap.get(id);
    return (
      eq?.name || id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  // Helper: Format stream name
  const formatStreamName = (rawName, id, source, target) => {
    if (rawName && rawName !== id) return rawName;

    // Generate name from source → target
    const srcName = getEquipmentName(source);
    const tgtName = getEquipmentName(target);

    if (srcName && tgtName) {
      return `${srcName} to ${tgtName}`;
    }

    // Fallback: format the ID
    return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // ============================================================
  // STEP 1: Collect Feed Streams
  // ============================================================
  (input.feed_streams || []).forEach((feed) => {
    streams.push({
      number: streamNumber++,
      id: feed.stream_id,
      name: formatStreamName(
        null,
        feed.stream_id,
        "FEED",
        feed.target_equipment,
      ),
      type: "feed",
      temperature_K: feed.temperature_K,
      pressure_Pa: feed.pressure_Pa,
      flow_rate: feed.flow_rate,
      flow_basis: feed.flow_basis || "molar",
      composition: feed.composition || {},
      composition_basis: feed.composition_basis || "molar",
      phase: "liquid", // Feeds typically liquid, could enhance if API provides
      vapor_fraction: 0,
      source: "Feed",
      target: getEquipmentName(feed.target_equipment),
      sourcePort: null,
      targetPort: feed.target_port,
      isRecycle: false,
      isTerminal: false,
    });

    processedEdgeIds.add(feed.stream_id);
  });

  // ============================================================
  // STEP 2: Collect Intermediate Streams (from edges)
  // ============================================================
  // Process edges in execution order for consistent numbering
  const executionOrder = result.execution_order || [];

  // Get edges grouped by source equipment
  const edgesBySource = new Map();
  (input.edges || []).forEach((edge) => {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source).push(edge);
  });

  // Process in execution order
  executionOrder.forEach((equipmentId) => {
    if (equipmentId === "FEED" || equipmentId === "PRODUCT") return;

    const outgoingEdges = edgesBySource.get(equipmentId) || [];

    outgoingEdges.forEach((edge) => {
      if (processedEdgeIds.has(edge.id)) return;

      // Get stream data from results
      const streamResult = result.stream_results?.[edge.id] || {};

      // Determine stream type
      let streamType = "intermediate";
      if (edge.is_recycle) {
        streamType = "recycle";
      }

      streams.push({
        number: streamNumber++,
        id: edge.id,
        name: formatStreamName(
          streamResult.name,
          edge.id,
          edge.source,
          edge.target,
        ),
        type: streamType,
        temperature_K: streamResult.temperature_K || 0,
        pressure_Pa: streamResult.pressure_Pa || 0,
        flow_rate: streamResult.flow_rate || 0,
        flow_basis: streamResult.flow_basis || "molar",
        composition: streamResult.composition || {},
        composition_basis: streamResult.composition_basis || "molar",
        phase: streamResult.phase || "liquid",
        vapor_fraction: streamResult.vapor_fraction || 0,
        source: getEquipmentName(edge.source),
        target: getEquipmentName(edge.target),
        sourcePort: edge.source_port,
        targetPort: edge.target_port,
        isRecycle: edge.is_recycle || false,
        isTerminal: false,
      });

      processedEdgeIds.add(edge.id);
    });
  });

  // ============================================================
  // STEP 3: Collect Terminal/Product Streams
  // ============================================================
  // Find outlets that don't have outgoing edges (terminal products)
  const edgeSourcePorts = new Map(); // equipmentId -> Set of ports with edges
  (input.edges || []).forEach((edge) => {
    if (!edgeSourcePorts.has(edge.source)) {
      edgeSourcePorts.set(edge.source, new Set());
    }
    edgeSourcePorts.get(edge.source).add(edge.source_port);
  });

  // Check each equipment's outlets
  executionOrder.forEach((equipmentId) => {
    if (equipmentId === "FEED" || equipmentId === "PRODUCT") return;

    const nodeResult = result.node_results?.[equipmentId];
    if (!nodeResult?.outlets) return;

    const portsWithEdges = edgeSourcePorts.get(equipmentId) || new Set();

    Object.entries(nodeResult.outlets).forEach(([portName, outlet]) => {
      // Skip if this port has an outgoing edge (already processed)
      if (portsWithEdges.has(portName)) return;

      // This is a terminal stream (goes to Product)
      const streamId = outlet.stream_id || `${equipmentId}_${portName}`;

      if (processedEdgeIds.has(streamId)) return;

      streams.push({
        number: streamNumber++,
        id: streamId,
        name: formatStreamName(outlet.name, streamId, equipmentId, "PRODUCT"),
        type: "product",
        temperature_K: outlet.temperature_K || 0,
        pressure_Pa: outlet.pressure_Pa || 0,
        flow_rate: outlet.flow_rate || 0,
        flow_basis: outlet.flow_basis || "molar",
        composition: outlet.composition || {},
        composition_basis: outlet.composition_basis || "molar",
        phase: outlet.phase || "liquid",
        vapor_fraction: outlet.vapor_fraction || 0,
        source: getEquipmentName(equipmentId),
        target: "Product",
        sourcePort: portName,
        targetPort: null,
        isRecycle: false,
        isTerminal: true,
      });

      processedEdgeIds.add(streamId);
    });
  });

  // ============================================================
  // Build Metadata
  // ============================================================
  const metadata = {
    totalStreams: streams.length,
    feedCount: streams.filter((s) => s.type === "feed").length,
    productCount: streams.filter((s) => s.type === "product").length,
    intermediateCount: streams.filter((s) => s.type === "intermediate").length,
    recycleCount: streams.filter((s) => s.type === "recycle").length,
    compoundCount: compounds.length,
    flowBasis: input.feed_streams?.[0]?.flow_basis || "molar",
    compositionBasis: input.feed_streams?.[0]?.composition_basis || "molar",
    simulationName: input.name || "Simulation",
    flowsheetId: data.flowsheet_id || null,
    converged: result.converged ?? true,
    iterations: result.iterations || 1,
  };

  return { compounds, streams, metadata };
}

/**
 * Get a specific stream by number.
 *
 * @param {StreamData[]} streams - Array of streams from collectAllStreams
 * @param {number} number - Stream number to find
 * @returns {StreamData|undefined} The stream or undefined if not found
 */
export function getStreamByNumber(streams, number) {
  return streams.find((s) => s.number === number);
}

/**
 * Get streams by type.
 *
 * @param {StreamData[]} streams - Array of streams
 * @param {'feed'|'intermediate'|'product'|'recycle'} type - Type to filter
 * @returns {StreamData[]} Filtered streams
 */
export function getStreamsByType(streams, type) {
  return streams.filter((s) => s.type === type);
}

/**
 * Get streams connected to a specific equipment (as source or target).
 *
 * @param {StreamData[]} streams - Array of streams
 * @param {string} equipmentName - Equipment name to match
 * @returns {{ inputs: StreamData[], outputs: StreamData[] }} Streams by direction
 */
export function getStreamsByEquipment(streams, equipmentName) {
  return {
    inputs: streams.filter((s) => s.target === equipmentName),
    outputs: streams.filter((s) => s.source === equipmentName),
  };
}

/**
 * Format stream number as circled number for display.
 *
 * @param {number} num - Stream number (1-20 have special characters, others use parentheses)
 * @returns {string} Formatted number like "①" or "(21)"
 */
export function formatStreamNumber(num) {
  // Unicode circled numbers (1-20)
  const circledNumbers = [
    "①",
    "②",
    "③",
    "④",
    "⑤",
    "⑥",
    "⑦",
    "⑧",
    "⑨",
    "⑩",
    "⑪",
    "⑫",
    "⑬",
    "⑭",
    "⑮",
    "⑯",
    "⑰",
    "⑱",
    "⑲",
    "⑳",
  ];

  if (num >= 1 && num <= 20) {
    return circledNumbers[num - 1];
  }

  // Fallback for numbers > 20
  return `(${num})`;
}

/**
 * Validate stream data for completeness.
 *
 * @param {StreamData} stream - Stream to validate
 * @returns {{ valid: boolean, issues: string[] }} Validation result
 */
export function validateStream(stream) {
  const issues = [];

  if (!stream.id) issues.push("Missing stream ID");
  if (stream.temperature_K <= 0) issues.push("Invalid temperature");
  if (stream.pressure_Pa <= 0) issues.push("Invalid pressure");
  if (stream.flow_rate < 0) issues.push("Negative flow rate");
  if (!stream.composition || Object.keys(stream.composition).length === 0) {
    issues.push("Missing composition");
  }

  // Check composition sums to ~1.0
  const compositionSum = Object.values(stream.composition || {}).reduce(
    (a, b) => a + b,
    0,
  );
  if (Math.abs(compositionSum - 1.0) > 0.01) {
    issues.push(
      `Composition sum is ${compositionSum.toFixed(4)}, expected ~1.0`,
    );
  }

  return { valid: issues.length === 0, issues };
}

export default {
  collectAllStreams,
  getStreamByNumber,
  getStreamsByType,
  getStreamsByEquipment,
  formatStreamNumber,
  validateStream,
};
