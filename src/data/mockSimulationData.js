/**
 * Mock Simulation Data
 *
 * Loads simulation data from response.json file.
 * Used until real API integration in Phase 3.
 */

import responseData from "./response.json";

// Equipment type to icon mapping
export const EQUIPMENT_ICONS = {
  heater: "🔥",
  cooler: "❄️",
  pump: "💧",
  mixer: "🔀",
  splitter: "🔱",
  separator: "⚗️",
  flash_drum: "💨",
  distillation_column: "🏭",
  heat_exchanger: "🔄",
  reactor: "⚛️",
  compressor: "🌀",
  valve: "🚰",
  tank: "🛢️",
  default: "📦",
};

// Raw API response - loaded from response.json
export const mockApiResponse = responseData;

/**
 * Transform API response to UI-friendly format
 * Includes global stream numbering for easy reference
 */
export function transformEquipmentData(apiResponse) {
  const { result, input } = apiResponse;

  // Get feed stream IDs for editability check
  const feedStreamIds = input.feed_streams.map((f) => f.stream_id);

  // STEP 1: Build stream numbering map
  // Track all unique streams in order of appearance
  const streamNumberMap = new Map();
  let streamCounter = 1;

  result.execution_order
    .filter((id) => id !== "FEED" && id !== "PRODUCT")
    .forEach((equipmentId) => {
      const nodeResult = result.node_results[equipmentId];
      const equipmentInput = result.equipment_inputs[equipmentId];

      if (!nodeResult || !equipmentInput) return;

      // Number input streams (if not already numbered)
      equipmentInput.inlet_ports.forEach((streamId) => {
        if (!streamNumberMap.has(streamId)) {
          streamNumberMap.set(streamId, streamCounter++);
        }
      });

      // Number output streams
      Object.values(nodeResult.outlets).forEach((stream) => {
        const streamId = stream.stream_id;
        if (!streamNumberMap.has(streamId)) {
          streamNumberMap.set(streamId, streamCounter++);
        }
      });
    });

  // STEP 2: Transform equipment with stream numbers
  return result.execution_order
    .filter((id) => id !== "FEED" && id !== "PRODUCT") // Skip pseudo-nodes
    .map((equipmentId) => {
      const nodeResult = result.node_results[equipmentId];
      const equipmentInput = result.equipment_inputs[equipmentId];
      const equipmentDef = input.equipment.find((e) => e.id === equipmentId);

      if (!nodeResult || !equipmentInput) return null;

      // Build constraints array
      const constraints = Object.entries(equipmentInput.applied_parameters)
        .filter(([_, value]) => value !== null) // Skip null values
        .map(([key, value]) => ({
          key,
          value,
          ...(equipmentInput.parameter_constraints[key] || {}),
        }));

      // Build inputs array with stream numbers
      const inputs = equipmentInput.inlet_ports.map((streamId) => {
        const streamData = result.stream_results[streamId] || {};
        const feedStream = input.feed_streams.find(
          (f) => f.stream_id === streamId
        );
        return {
          streamId,
          streamNumber: streamNumberMap.get(streamId),
          name: feedStream?.stream_id || streamId,
          ...streamData,
          ...(feedStream || {}),
          editable: feedStreamIds.includes(streamId),
        };
      });

      // Build outputs array with stream numbers
      const outputs = Object.entries(nodeResult.outlets).map(
        ([port, stream]) => ({
          port,
          streamNumber: streamNumberMap.get(stream.stream_id),
          ...stream,
          editable: false,
        })
      );

      return {
        id: equipmentId,
        name: equipmentDef?.name || equipmentId,
        type: equipmentInput.equipment_type,
        icon:
          EQUIPMENT_ICONS[equipmentInput.equipment_type] ||
          EQUIPMENT_ICONS.default,
        converged: nodeResult.converged,
        iterations: nodeResult.iterations,
        warnings: nodeResult.warnings || [],
        metadata: nodeResult.metadata || {},
        constraints,
        inputs,
        outputs,
        energyStreams: nodeResult.energy_streams || {},
      };
    })
    .filter(Boolean); // Remove null entries
}

/**
 * Transform warnings data for Warnings Panel
 */
export function getWarningsData(equipmentData, apiResponse) {
  // Equipment-specific warnings
  const equipmentWarnings = equipmentData
    .filter((eq) => eq.warnings && eq.warnings.length > 0)
    .map((eq) => ({
      equipmentId: eq.id,
      equipmentName: eq.name,
      icon: eq.icon,
      warnings: eq.warnings,
    }));

  // Global/process-level warnings
  const globalWarnings = apiResponse.result.warnings || [];

  // Calculate total count (excluding duplicates in global warnings)
  const equipmentWarningTexts = new Set(
    equipmentWarnings.flatMap((eq) => eq.warnings)
  );
  const uniqueGlobalWarnings = globalWarnings.filter(
    (w) => !equipmentWarningTexts.has(w)
  );

  const totalCount =
    equipmentWarnings.reduce((sum, eq) => sum + eq.warnings.length, 0) +
    uniqueGlobalWarnings.length;

  return {
    equipmentWarnings,
    globalWarnings: uniqueGlobalWarnings,
    totalCount,
  };
}

// Export transformed data for direct use
export const mockEquipmentData = transformEquipmentData(mockApiResponse);
export const mockWarningsData = getWarningsData(
  mockEquipmentData,
  mockApiResponse
);
