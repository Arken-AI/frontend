/**
 * Equipment Card
 * 
 * Accordion card showing equipment details.
 * Collapsed: Shows header only (icon, name, status)
 * Expanded: Shows inputs (with constraints inline), outputs
 * Highlights when selected via Zustand store.
 */

import { forwardRef } from 'react';
import StreamSection from './StreamSection';

const EquipmentCard = forwardRef(({ 
  equipment, 
  index, 
  isExpanded, 
  isSelected = false, 
  onToggle, 
  onClick,
  editedValues = {},
  validationErrors = {},
  onParameterChange
}, ref) => {
  const {
    id,
    name,
    type,
    icon,
    converged,
    warnings,
    constraints,
    inputs,
    outputs,
    energyStreams,
    metadata
  } = equipment;
  
  // Check if this equipment has any edits
  const hasEdits = Object.keys(editedValues).length > 0;
  const hasErrors = Object.keys(validationErrors).length > 0;

  // Status badge
  const getStatusBadge = () => {
    if (converged) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-status-success/10 text-status-success">
          ✓ Converged
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-status-error/10 text-status-error">
        ✗ Not Converged
      </span>
    );
  };

  return (
    <div 
      ref={ref}
      className={`equipment-card border-2 rounded-lg overflow-hidden transition-all duration-200 ${
        isSelected 
          ? 'border-primary shadow-lg ring-2 ring-primary/20' 
          : isExpanded 
            ? 'border-primary shadow-sm' 
            : 'border-border hover:border-border-hover'
      }`}
    >
      {/* Header - Always Visible */}
      <button
        onClick={(e) => {
          onToggle();
          if (onClick) onClick();
        }}
        className="w-full px-3 py-2.5 flex items-center gap-3 bg-surface hover:bg-surface-secondary transition-colors text-left"
      >
        {/* Sequence Number */}
        <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-content-tertiary bg-surface-secondary rounded">
          {index}
        </span>
        
        {/* Icon */}
        <span className="text-lg" title={type}>{icon}</span>
        
        {/* Name */}
        <span className="flex-1 font-medium text-sm text-content truncate">{name}</span>
        
        {/* Status Badge */}
        {getStatusBadge()}
        
        {/* Chevron */}
        <span className={`text-content-tertiary transition-transform duration-200 ${
          isExpanded ? 'rotate-90' : ''
        }`}>
          ▶
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Separate editable vs read-only streams */}
          {(() => {
            const editableInputs = inputs.filter(s => s.editable);
            const readonlyInputs = inputs.filter(s => !s.editable);
            
            // Check which sections have edits
            const equipmentParamKeys = constraints.map(c => c.key);
            const hasEquipmentParamEdits = equipmentParamKeys.some(key => editedValues[key] !== undefined);
            const hasEquipmentParamErrors = equipmentParamKeys.some(key => validationErrors[key] !== undefined);
            
            // Check feed stream edits (keys start with stream ID)
            const feedStreamKeys = editableInputs.flatMap(stream => {
              const streamId = stream.streamId || stream.stream_id;
              return [
                `${streamId}_temperature_K`,
                `${streamId}_pressure_Pa`,
                `${streamId}_flow_rate`
              ];
            });
            const hasFeedStreamEdits = feedStreamKeys.some(key => editedValues[key] !== undefined);
            const hasFeedStreamErrors = feedStreamKeys.some(key => validationErrors[key] !== undefined);
            
            return (
              <>
                {/* SECTION 1: Editable Configuration */}
                {(constraints.length > 0 || editableInputs.length > 0) && (
                  <div className="bg-blue-50 border-b border-blue-200 p-3">
                    <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>EQUIPMENT CONFIGURATION</span>
                      <span className="text-content-tertiary font-normal text-[10px]">(editable)</span>
                      {/* Modified Indicator for Equipment Parameters */}
                      {hasEquipmentParamEdits && (
                        <div className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                          <span className="text-[10px] font-medium text-amber-700">Modified</span>
                        </div>
                      )}
                      {/* Error Indicator for Equipment Parameters */}
                      {hasEquipmentParamErrors && (
                        <div className={hasEquipmentParamEdits ? 'ml-2' : 'ml-auto'}>
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-300 rounded-full">
                            <span className="text-[10px]">⚠️</span>
                            <span className="text-[10px] font-medium text-red-700">Errors</span>
                          </div>
                        </div>
                      )}
                    </h3>
                    
                    {/* Equipment Parameters */}
                    {constraints.length > 0 && (
                      <StreamSection 
                        streams={[]} 
                        type="config"
                        constraints={constraints}
                        editedValues={editedValues}
                        validationErrors={validationErrors}
                        onParameterChange={onParameterChange}
                        showHeader={false}
                      />
                    )}
                    
                    {/* Editable Feed Streams */}
                    {editableInputs.length > 0 && (
                      <StreamSection 
                        title="FEED STREAMS" 
                        streams={editableInputs} 
                        type="input"
                        editedValues={editedValues}
                        validationErrors={validationErrors}
                        onParameterChange={onParameterChange}
                        showHeader={true}
                        hasEdits={hasFeedStreamEdits}
                        hasErrors={hasFeedStreamErrors}
                      />
                    )}
                  </div>
                )}

                {/* SECTION 2: Calculated Results */}
                {(readonlyInputs.length > 0 || outputs.length > 0) && (
                  <div className="bg-gray-50 border-b border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <span>📊</span>
                      <span>SIMULATION RESULTS</span>
                      <span className="text-content-tertiary font-normal text-[10px]">(read-only)</span>
                    </h3>
                    
                    {/* Read-only Inputs (intermediate streams) */}
                    {readonlyInputs.length > 0 && (
                      <StreamSection 
                        title="INPUTS" 
                        streams={readonlyInputs} 
                        type="input"
                        showHeader={true}
                      />
                    )}

                    {/* Outputs */}
                    {outputs.length > 0 && (
                      <StreamSection 
                        title="OUTPUTS" 
                        streams={outputs} 
                        type="output"
                        showHeader={true}
                      />
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Energy Streams (for columns, reactors) */}
          {Object.keys(energyStreams).length > 0 && (
            <div className="px-3 py-2 border-t border-border bg-surface-secondary/50">
              <h4 className="text-xs font-semibold text-content-secondary mb-2">⚡ ENERGY</h4>
              <div className="space-y-1">
                {Object.entries(energyStreams).map(([key, stream]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-content-secondary capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className={`font-mono ${
                      stream.energy_type === 'cooling' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      {stream.duty_kW?.toFixed(2)} kW
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="px-3 py-2 border-t border-border bg-status-warning/5">
              <h4 className="text-xs font-semibold text-status-warning mb-1">⚠️ Warnings ({warnings.length})</h4>
              <ul className="space-y-1">
                {warnings.slice(0, 3).map((warning, idx) => (
                  <li key={idx} className="text-xs text-content-secondary leading-tight">
                    • {warning.length > 80 ? warning.slice(0, 80) + '...' : warning}
                  </li>
                ))}
                {warnings.length > 3 && (
                  <li className="text-xs text-content-tertiary">
                    +{warnings.length - 3} more warnings
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

EquipmentCard.displayName = 'EquipmentCard';

export default EquipmentCard;
