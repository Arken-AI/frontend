/**
 * Equipment Browser
 * 
 * Main container for the equipment accordion list.
 * Displays equipment in process sequence order.
 */

import { useState } from 'react';
import { mockEquipmentData } from '../../data/mockSimulationData';
import EquipmentCard from './EquipmentCard';

export default function EquipmentBrowser() {
  // Track which equipment card is expanded (null = all collapsed)
  const [expandedId, setExpandedId] = useState(null);
  
  // Equipment data (will come from API/store in Phase 3)
  const equipmentList = mockEquipmentData;

  const handleToggle = (equipmentId) => {
    // Accordion behavior: toggle or switch
    setExpandedId(prev => prev === equipmentId ? null : equipmentId);
  };

  return (
    <div className="equipment-browser flex flex-col gap-2">
      {equipmentList.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-content-secondary">No equipment found</p>
        </div>
      ) : (
        equipmentList.map((equipment, index) => (
          <EquipmentCard
            key={equipment.id}
            equipment={equipment}
            index={index + 1}
            isExpanded={expandedId === equipment.id}
            onToggle={() => handleToggle(equipment.id)}
          />
        ))
      )}
    </div>
  );
}
