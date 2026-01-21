/**
 * Equipment Browser
 * 
 * Main container for the equipment accordion list.
 * Displays equipment in process sequence order.
 * Syncs with canvas selection via Zustand store.
 */

import { useState, useEffect, useRef } from 'react';
import { mockEquipmentData } from '../../data/mockSimulationData';
import EquipmentCard from './EquipmentCard';
import useSelectionStore from '../../store/useSelectionStore';
import { SkeletonEquipmentCard } from '../common/SkeletonLoader';
import { NoEquipmentFound } from '../common/EmptyState';

export default function EquipmentBrowser() {
  // Track which equipment card is expanded (null = all collapsed)
  const [expandedId, setExpandedId] = useState(null);
  
  // Get selection state from store
  const { selectedEquipmentId, selectEquipment } = useSelectionStore();
  
  // Refs for auto-scroll functionality
  const cardRefs = useRef({});
  
  // Equipment data (will come from API/store in Phase 3)
  const equipmentList = mockEquipmentData;

  // Auto-scroll to selected equipment when selection changes externally (e.g., from canvas)
  useEffect(() => {
    if (selectedEquipmentId && cardRefs.current[selectedEquipmentId]) {
      cardRefs.current[selectedEquipmentId].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      // Auto-expand selected equipment
      setExpandedId(selectedEquipmentId);
    }
  }, [selectedEquipmentId]);

  const handleToggle = (equipmentId) => {
    // Accordion behavior: toggle or switch
    setExpandedId(prev => prev === equipmentId ? null : equipmentId);
  };
  
  const handleCardClick = (equipmentId) => {
    // Update selection in store (this will sync with canvas)
    selectEquipment(equipmentId);
  };

  return (
    <div className="equipment-browser flex flex-col gap-2">
      {equipmentList.length === 0 ? (
        // Show empty state if no equipment
        <NoEquipmentFound />
      ) : (
        // Show actual equipment cards
        equipmentList.map((equipment, index) => (
          <EquipmentCard
            key={equipment.id}
            ref={el => cardRefs.current[equipment.id] = el}
            equipment={equipment}
            index={index + 1}
            isExpanded={expandedId === equipment.id}
            isSelected={selectedEquipmentId === equipment.id}
            onToggle={() => handleToggle(equipment.id)}
            onClick={() => handleCardClick(equipment.id)}
          />
        ))
      )}
    </div>
  );
}
