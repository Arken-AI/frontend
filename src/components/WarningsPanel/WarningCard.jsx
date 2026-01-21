/**
 * Warning Card
 * 
 * Individual card for equipment with warnings.
 * Shows equipment name, icon, and list of warnings.
 */

export default function WarningCard({ equipmentId, equipmentName, icon, warnings }) {
  const handleViewEquipment = () => {
    // TODO: Navigate to equipment in Equipment Browser
    // Will implement with Zustand state management
    console.log('Navigate to equipment:', equipmentId);
  };
  
  return (
    <div className="border-b border-border p-3 hover:bg-surface-secondary/30 transition-colors">
      {/* Equipment Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold text-content">{equipmentName}</span>
        </div>
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-status-warning/20 text-status-warning">
          {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
        </span>
      </div>
      
      {/* Warnings List */}
      <div className="space-y-2 mb-2">
        {warnings.map((warning, idx) => (
          <div 
            key={idx}
            className="p-2 bg-status-warning/5 border border-status-warning/20 rounded text-xs text-content-secondary leading-relaxed"
          >
            <span className="text-status-warning mr-1.5">⚠️</span>
            {warning}
          </div>
        ))}
      </div>
      
      {/* Action Button */}
      <button
        onClick={handleViewEquipment}
        className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1"
      >
        <span>View Equipment</span>
        <span>→</span>
      </button>
    </div>
  );
}
