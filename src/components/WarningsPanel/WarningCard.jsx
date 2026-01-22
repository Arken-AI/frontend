/**
 * Warning Card
 * 
 * Individual card for equipment with warnings.
 * Shows equipment name, icon, and list of warnings.
 * "View Equipment" button syncs selection with canvas and Equipment Browser.
 */

import useSelectionStore from '../../store/useSelectionStore';

/**
 * Warning Badge Component
 * Displays warning count with appropriate styling
 */
function WarningBadge({ count }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border border-orange-300 text-orange-500 bg-orange-50">
      <span>⚠</span>
      <span>{count}</span>
    </span>
  );
}

export default function WarningCard({ equipmentId, equipmentName, icon, warnings }) {
  const { selectEquipment } = useSelectionStore();
  
  const handleViewEquipment = () => {
    // Select equipment and auto-switch to Equipment Browser
    selectEquipment(equipmentId);
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      {/* Equipment Header - Single line */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-900 truncate">{equipmentName}</span>
        </div>
        <WarningBadge count={warnings.length} />
      </div>
      
      {/* Warnings List */}
      <div className="px-4 pb-4 space-y-2">
        {warnings.map((warning, idx) => (
          <div 
            key={idx}
            className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-gray-700 leading-relaxed"
          >
            <span className="text-orange-500 mr-1.5">⚠</span>
            {warning}
          </div>
        ))}
      </div>
      
      {/* Action Button */}
      <div className="px-4 pb-3">
        <button
          onClick={handleViewEquipment}
          className="w-full px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium rounded-lg transition-colors border border-blue-200 flex items-center justify-center gap-1.5"
        >
          <span>View Equipment</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
