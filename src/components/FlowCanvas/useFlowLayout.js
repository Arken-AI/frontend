/**
 * useFlowLayout Hook
 *
 * Transforms equipment data into React Flow nodes and edges with auto-layout.
 * Uses Dagre algorithm to calculate positions for left-to-right process flow.
 * Includes feed stream inputs and product stream outputs.
 * Supports multiple handles per equipment for clean edge routing.
 * Color-codes streams by phase: Blue=Liquid, Red=Vapor, Purple=Two-Phase
 */

import { useMemo } from "react";
import dagre from "dagre";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 60;
const FEED_NODE_WIDTH = 120;
const FEED_NODE_HEIGHT = 50;
const PRODUCT_NODE_WIDTH = 140;
const PRODUCT_NODE_HEIGHT = 50;

/**
 * Get stream color based on phase
 */
function getStreamColor(phase) {
  if (!phase) return "#94a3b8"; // Default gray

  const phaseStr = phase.toLowerCase();

  // Liquid phase - Blue
  if (phaseStr === "liquid") {
    return "#3b82f6"; // blue-500
  }

  // Vapor/Gas phase - Red
  if (phaseStr === "vapor" || phaseStr === "gas") {
    return "#ef4444"; // red-500
  }

  // Two-phase/Mixed - Purple
  if (
    phaseStr.includes("liquid-vapor") ||
    phaseStr.includes("mixed") ||
    phaseStr.includes("two-phase")
  ) {
    return "#a855f7"; // purple-500
  }

  return "#94a3b8"; // Default gray
}

/**
 * Get label color based on stream color (darker variant for readability)
 */
function getLabelColor(streamColor) {
  const colorMap = {
    "#3b82f6": "#1e40af", // blue-800
    "#ef4444": "#991b1b", // red-800
    "#a855f7": "#6b21a8", // purple-800
    "#94a3b8": "#475569", // slate-600
    "#22c55e": "#166534", // green-800 (feed)
    "#f97316": "#c2410c", // orange-800 (product)
  };
  return colorMap[streamColor] || "#475569";
}

/**
 * Get label background color based on stream color
 */
function getLabelBgColor(streamColor) {
  const colorMap = {
    "#3b82f6": "#dbeafe", // blue-100
    "#ef4444": "#fee2e2", // red-100
    "#a855f7": "#f3e8ff", // purple-100
    "#94a3b8": "#f1f5f9", // slate-100
    "#22c55e": "#dcfce7", // green-100 (feed)
    "#f97316": "#ffedd5", // orange-100 (product)
  };
  return colorMap[streamColor] || "#f1f5f9";
}

export default function useFlowLayout(
  equipmentData,
  apiData,
  readOnly = false,
) {
  const { nodes, edges } = useMemo(() => {
    if (!equipmentData || equipmentData.length === 0 || !apiData) {
      return { nodes: [], edges: [] };
    }

    const flowNodes = [];
    const flowEdges = [];

    // Get API data from passed parameter
    const apiEdges = apiData.input?.edges || [];
    const feedStreams = apiData.input?.feed_streams || [];

    // Build stream number map from equipment inputs/outputs
    const streamNumberMap = new Map();
    equipmentData.forEach((equipment) => {
      equipment.inputs.forEach((input) => {
        if (input.streamNumber) {
          streamNumberMap.set(input.streamId, input.streamNumber);
        }
      });
      equipment.outputs.forEach((output) => {
        if (output.streamNumber && output.stream_id) {
          streamNumberMap.set(output.stream_id, output.streamNumber);
        }
      });
    });

    // Build maps for equipment connections
    // Map: equipmentId -> list of input stream IDs (sources coming INTO this equipment)
    // Map: equipmentId -> list of output stream IDs (streams going OUT of this equipment)
    const equipmentInputStreams = new Map();
    const equipmentOutputStreams = new Map();

    // Initialize maps
    equipmentData.forEach((eq) => {
      equipmentInputStreams.set(eq.id, []);
      equipmentOutputStreams.set(eq.id, []);
    });

    // Collect feed streams as inputs to their target equipment
    feedStreams.forEach((feed) => {
      const targetInputs =
        equipmentInputStreams.get(feed.target_equipment) || [];
      targetInputs.push(feed.stream_id);
      equipmentInputStreams.set(feed.target_equipment, targetInputs);
    });

    // Collect intermediate edges
    apiEdges.forEach((edge) => {
      // edge.source equipment has this as output
      const sourceOutputs = equipmentOutputStreams.get(edge.source) || [];
      sourceOutputs.push(edge.id);
      equipmentOutputStreams.set(edge.source, sourceOutputs);

      // edge.target equipment has this as input
      const targetInputs = equipmentInputStreams.get(edge.target) || [];
      targetInputs.push(edge.id);
      equipmentInputStreams.set(edge.target, targetInputs);
    });

    // Collect product streams (outputs not connected to other equipment)
    equipmentData.forEach((equipment) => {
      equipment.outputs.forEach((output) => {
        const streamId = output.stream_id;
        const isConnected = apiEdges.some((edge) => edge.id === streamId);
        if (!isConnected && streamId) {
          const sourceOutputs = equipmentOutputStreams.get(equipment.id) || [];
          sourceOutputs.push(streamId);
          equipmentOutputStreams.set(equipment.id, sourceOutputs);
        }
      });
    });

    // Step 1: Create FEED nodes for each feed stream
    feedStreams.forEach((feed) => {
      const feedNodeId = `feed-${feed.stream_id}`;
      flowNodes.push({
        id: feedNodeId,
        type: "feed",
        position: { x: 0, y: 0 },
        data: {
          streamId: feed.stream_id,
          streamNumber: streamNumberMap.get(feed.stream_id),
          name: feed.stream_id.replace(/_/g, " "),
        },
      });

      // Create edge from feed to target equipment
      const streamNumber = streamNumberMap.get(feed.stream_id) || "";
      // Get phase from feed stream data
      const streamColor = getStreamColor(feed.phase);

      flowEdges.push({
        id: `edge-feed-${feed.stream_id}`,
        source: feedNodeId,
        target: feed.target_equipment,
        targetHandle: feed.stream_id, // Connect to specific input handle
        type: "smoothstep",
        animated: false,
        label: streamNumber ? String(streamNumber) : feed.stream_id,
        markerEnd: {
          type: "arrowclosed",
          width: 10,
          height: 10,
          color: streamColor,
        },
        style: {
          stroke: streamColor,
          strokeWidth: 2,
        },
        labelStyle: {
          fill: getLabelColor(streamColor),
          fontWeight: 600,
          fontSize: 11,
        },
        labelBgStyle: {
          fill: getLabelBgColor(streamColor),
          fillOpacity: 0.9,
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        data: {
          phase: feed.phase,
        },
      });
    });

    // Step 2: Create equipment nodes with handle information
    equipmentData.forEach((equipment) => {
      const inputHandles = equipmentInputStreams.get(equipment.id) || [];
      const outputHandles = equipmentOutputStreams.get(equipment.id) || [];

      flowNodes.push({
        id: equipment.id,
        type: "equipment",
        position: { x: 0, y: 0 },
        data: {
          ...equipment,
          inputHandles,
          outputHandles,
          readOnly,
        },
      });
    });

    // Step 3: Create edges between equipment (intermediate streams)
    apiEdges.forEach((edge) => {
      const streamNumber = streamNumberMap.get(edge.id) || "";

      // Find stream data from source equipment's outputs to get phase
      const sourceEquipment = equipmentData.find((eq) => eq.id === edge.source);
      const streamData = sourceEquipment?.outputs?.find(
        (out) => out.streamId === edge.id,
      );
      const phase = streamData?.phase;
      const isRecycle = edge.is_recycle || false;

      // Get color based on phase
      const streamColor = getStreamColor(phase);

      flowEdges.push({
        id: `edge-${edge.id}`,
        source: edge.source,
        sourceHandle: edge.id, // Connect from specific output handle
        target: edge.target,
        targetHandle: edge.id, // Connect to specific input handle
        type: "smoothstep",
        animated: false,
        label: streamNumber ? String(streamNumber) : edge.id,
        markerEnd: {
          type: "arrowclosed",
          width: 10,
          height: 10,
          color: streamColor,
        },
        style: {
          stroke: streamColor,
          strokeWidth: 2,
          strokeDasharray: isRecycle ? "5,5" : undefined, // Dashed for recycle
        },
        labelStyle: {
          fill: getLabelColor(streamColor),
          fontWeight: 600,
          fontSize: 11,
        },
        labelBgStyle: {
          fill: getLabelBgColor(streamColor),
          fillOpacity: 0.9,
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        data: {
          phase: phase,
          isRecycle: isRecycle,
        },
      });
    });

    // Step 4: Create PRODUCT nodes for outputs that don't connect to other equipment
    equipmentData.forEach((equipment) => {
      equipment.outputs.forEach((output) => {
        const streamId = output.stream_id || output.streamId;
        const isConnected = apiEdges.some((edge) => edge.id === streamId);

        if (!isConnected && streamId) {
          const productNodeId = `product-${streamId}`;
          const streamNumber =
            streamNumberMap.get(streamId) || output.streamNumber || "";

          // Get phase from output stream data
          const phase = output.phase;
          const streamColor = getStreamColor(phase);

          flowNodes.push({
            id: productNodeId,
            type: "product",
            position: { x: 0, y: 0 },
            data: {
              streamId: streamId,
              streamNumber: streamNumber,
              name: output.name || streamId.replace(/_/g, " "),
            },
          });

          flowEdges.push({
            id: `edge-product-${streamId}`,
            source: equipment.id,
            sourceHandle: streamId, // Connect from specific output handle
            target: productNodeId,
            type: "smoothstep",
            animated: false,
            label: streamNumber ? String(streamNumber) : streamId,
            markerEnd: {
              type: "arrowclosed",
              width: 10,
              height: 10,
              color: streamColor,
            },
            style: {
              stroke: streamColor,
              strokeWidth: 2,
            },
            labelStyle: {
              fill: getLabelColor(streamColor),
              fontWeight: 600,
              fontSize: 11,
            },
            labelBgStyle: {
              fill: getLabelBgColor(streamColor),
              fillOpacity: 0.9,
            },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 4,
            data: {
              phase: phase,
            },
          });
        }
      });
    });

    // Step 5: Use Dagre to calculate layout positions
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configure layout: LEFT to RIGHT
    dagreGraph.setGraph({
      rankdir: "LR",
      nodesep: 80,
      ranksep: 150,
      marginx: 50,
      marginy: 50,
    });

    // Add all nodes to graph with appropriate sizes
    flowNodes.forEach((node) => {
      let width = NODE_WIDTH;
      let height = NODE_HEIGHT;

      if (node.type === "feed") {
        width = FEED_NODE_WIDTH;
        height = FEED_NODE_HEIGHT;
      } else if (node.type === "product") {
        width = PRODUCT_NODE_WIDTH;
        height = PRODUCT_NODE_HEIGHT;
      }

      dagreGraph.setNode(node.id, { width, height });
    });

    // Add edges to graph
    flowEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Apply calculated positions to nodes
    flowNodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      let width = NODE_WIDTH;
      let height = NODE_HEIGHT;

      if (node.type === "feed") {
        width = FEED_NODE_WIDTH;
        height = FEED_NODE_HEIGHT;
      } else if (node.type === "product") {
        width = PRODUCT_NODE_WIDTH;
        height = PRODUCT_NODE_HEIGHT;
      }

      node.position = {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [equipmentData, apiData]);

  return { nodes, edges };
}
