/**
 * Equipment Browser
 *
 * Main container for the equipment accordion list.
 * Displays equipment in process sequence order.
 * Syncs with canvas selection via Zustand store.
 *
 * For single-equipment templates:
 * - Shows compound selector at the top when generic compounds are detected
 * - Simplified layout with a single equipment card (no accordion needed)
 */

import { useState, useEffect, useRef } from "react";
import EquipmentCard from "./EquipmentCard";
import useSelectionStore from "../../store/useSelectionStore";
import useEquipmentStore from "../../stores/useEquipmentStore";
import CompoundSelector from "../CompoundSelector";
import { SkeletonEquipmentCard } from "../common/SkeletonLoader";
import { NoEquipmentFound } from "../common/EmptyState";

export default function EquipmentBrowser({
  equipmentData = [],
  templateType = null,
  compounds = [],
}) {
  // Track which equipment card is expanded (null = all collapsed)
  const [expandedId, setExpandedId] = useState(null);

  // Get selection state from store
  const { selectedEquipmentId, selectEquipment } = useSelectionStore();

  // Get equipment parameter state from store
  const {
    editedParams,
    validationErrors,
    updateParameter,
    validateParameter,
    compoundMapping,
    compoundMappingErrors,
    updateCompoundMapping,
    hasGenericCompounds,
    getGenericCompounds,
  } = useEquipmentStore();

  // Refs for auto-scroll functionality
  const cardRefs = useRef({});

  // Equipment data from API
  const equipmentList = equipmentData;

  // Determine if this is a single-equipment template
  const isSingleEquipment = templateType === "single_equipment";

  // Detect generic compounds
  const genericCompounds = getGenericCompounds(compounds);
  const showCompoundSelector = genericCompounds.length > 0;

  // Auto-expand the single equipment card
  useEffect(() => {
    if (isSingleEquipment && equipmentList.length === 1 && !expandedId) {
      setExpandedId(equipmentList[0].id);
    }
  }, [isSingleEquipment, equipmentList, expandedId]);

  // Auto-scroll to selected equipment when selection changes externally (e.g., from canvas)
  useEffect(() => {
    if (selectedEquipmentId && cardRefs.current[selectedEquipmentId]) {
      cardRefs.current[selectedEquipmentId].scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      // Auto-expand selected equipment
      setExpandedId(selectedEquipmentId);
    }
  }, [selectedEquipmentId]);

  const handleToggle = (equipmentId) => {
    // Accordion behavior: toggle or switch
    setExpandedId((prev) => (prev === equipmentId ? null : equipmentId));
  };

  const handleCardClick = (equipmentId) => {
    // Update selection in store (this will sync with canvas)
    selectEquipment(equipmentId);
  };

  /**
   * Handle parameter change from equipment card
   * @param {string} equipmentId - Equipment identifier
   * @param {string} paramName - Parameter name (may be "streamId_fieldName" for stream edits)
   * @param {number|string} value - New value
   * @param {boolean} isValid - Whether value passes validation
   */
  const handleParameterChange = (equipmentId, paramName, value, isValid) => {
    const equipment = equipmentList.find((eq) => eq.id === equipmentId);
    if (!equipment) return;

    // Detect composite stream key: "streamId_fieldName" (e.g. "column_feed_temperature_K")
    // Feed stream IDs are available on equipment.inputs[].streamId
    const feedStreamIds = (equipment.inputs || [])
      .filter((s) => s.editable)
      .map((s) => s.streamId);

    // Check if paramName starts with any known feed stream ID
    const matchedStreamId = feedStreamIds.find(
      (sid) => paramName === `${sid}_temperature_K` ||
               paramName === `${sid}_pressure_Pa` ||
               paramName === `${sid}_flow_rate`,
    );

    if (matchedStreamId) {
      // Stream property edit — store under the stream ID, not the equipment ID
      const fieldName = paramName.slice(matchedStreamId.length + 1); // strip "streamId_"
      const constraint = {}; // stream field constraints are numeric
      const error = validateParameter(matchedStreamId, fieldName, value, constraint);
      if (!error) {
        updateParameter(matchedStreamId, fieldName, value);
      }
      return;
    }

    // Equipment parameter edit — original path
    const constraint = equipment.constraints?.find((c) => c.key === paramName);

    // String parameters (dropdowns) - skip numeric validation, update directly
    if (
      constraint?.type === "string" ||
      (typeof value === "string" && isNaN(parseFloat(value)))
    ) {
      updateParameter(equipmentId, paramName, value);
      return;
    }

    // Numeric parameters - validate against min/max
    const constraints = constraint
      ? { min: constraint.min, max: constraint.max }
      : {};
    const error = validateParameter(equipmentId, paramName, value, constraints);

    if (!error) {
      updateParameter(equipmentId, paramName, value);
    }
  };

  return (
    <div className="equipment-browser flex flex-col gap-3 p-2">
      {/* Compound Selector for single-equipment templates with generic compounds */}
      {showCompoundSelector && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-1">
          <CompoundSelector
            genericCompounds={genericCompounds}
            compoundMapping={compoundMapping}
            onMappingChange={updateCompoundMapping}
            errors={compoundMappingErrors}
          />
        </div>
      )}

      {/* Single-equipment mode label */}
      {isSingleEquipment && equipmentList.length > 0 && (
        <div
          className="flex items-center gap-2 px-1"
          data-testid="single-equipment-badge"
        >
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border border-blue-200 text-blue-600 bg-blue-50">
            <span>⚡</span>
            <span>Single Equipment</span>
          </span>
        </div>
      )}

      {equipmentList.length === 0 ? (
        // Show empty state if no equipment
        <NoEquipmentFound />
      ) : (
        // Show actual equipment cards
        equipmentList.map((equipment, index) => (
          <EquipmentCard
            key={equipment.id}
            ref={(el) => (cardRefs.current[equipment.id] = el)}
            equipment={equipment}
            index={index + 1}
            isExpanded={expandedId === equipment.id}
            isSelected={selectedEquipmentId === equipment.id}
            onToggle={() => handleToggle(equipment.id)}
            onClick={() => handleCardClick(equipment.id)}
            editedValues={editedParams[equipment.id] || {}}
            allEditedParams={editedParams}
            validationErrors={validationErrors[equipment.id] || {}}
            onParameterChange={(paramName, value, isValid) =>
              handleParameterChange(equipment.id, paramName, value, isValid)
            }
          />
        ))
      )}
    </div>
  );
}
