/**
 * Equipment Card
 * 
 * Accordion card showing equipment details.
 * Collapsed: Shows header with two lines (name row + status row)
 * Expanded: Shows inputs/outputs with collapsible sections
 * Highlights when selected via Zustand store.
 */

import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StreamSection from './StreamSection';

/**
 * Status Badge Component
 * Displays convergence status with appropriate icon and color
 */
function StatusBadge({ status, converged }) {
  // Determine status from converged boolean or explicit status prop
  const statusType = status || (converged ? 'converged' : 'error');
  
  const statusConfig = {
    converged: {
      icon: '✓',
      label: 'Converged',
      className: 'border-green-300 text-green-600 bg-green-50'
    },
    pending: {
      icon: '⏱',
      label: 'Pending',
      className: 'border-orange-300 text-orange-500 bg-orange-50'
    },
    error: {
      icon: '✗',
      label: 'Error',
      className: 'border-red-300 text-red-500 bg-red-50'
    }
  };
  
  const config = statusConfig[statusType] || statusConfig.error;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${config.className}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Warning Badge Component
 * Displays warning count with triangle icon
 */
function WarningBadge({ count }) {
  if (!count || count === 0) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border border-orange-300 text-orange-500 bg-orange-50">
      <span>⚠</span>
      <span>{count}</span>
    </span>
  );
}

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
    status, // Optional explicit status: 'converged' | 'pending' | 'error'
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
  const warningCount = warnings?.length || 0;

  return (
    <div 
      ref={ref}
      className={`equipment-card rounded-xl transition-all duration-200 ${
        isSelected 
          ? 'border-2 border-blue-500 bg-slate-50 shadow-md' 
          : 'border border-gray-200 bg-white shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header - Always Visible - Single Row Layout */}
      <button
        onClick={(e) => {
          onToggle();
          if (onClick) onClick();
        }}
        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          {/* Sequence Number */}
          <span className="text-sm font-medium text-gray-400">
            {index}
          </span>
          
          {/* Icon - Flame */}
          <span className="text-lg text-orange-500" title={type}>🔥</span>
          
          {/* Name */}
          <span className="flex-1 font-semibold text-gray-900 truncate">{name}</span>
          
          {/* Status Badge + Warning Badge - always on same line */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} converged={converged} />
            <WarningBadge count={warningCount} />
          </div>
        </div>
      </button>

      {/* Expanded Content - Animated */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
          {/* INPUTS Section - All input streams */}
          {inputs.length > 0 && (
            <StreamSection 
              title="INPUTS" 
              streams={inputs} 
              type="input"
              constraints={constraints}
              editedValues={editedValues}
              validationErrors={validationErrors}
              onParameterChange={onParameterChange}
              isCollapsible={true}
              defaultExpanded={true}
            />
          )}

          {/* OUTPUTS Section - All output streams */}
          {outputs.length > 0 && (
            <StreamSection 
              title="OUTPUTS" 
              streams={outputs} 
              type="output"
              editedValues={editedValues}
              validationErrors={validationErrors}
              onParameterChange={onParameterChange}
              isCollapsible={true}
              defaultExpanded={true}
            />
          )}

          {/* Energy Streams (for columns, reactors) */}
          {Object.keys(energyStreams).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">⚡ Energy</h4>
              <div className="space-y-1">
                {Object.entries(energyStreams).map(([key, stream]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-gray-600 capitalize">
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

          {/* Warnings - Collapsible */}
          {warnings.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-orange-500 mb-2 uppercase tracking-wide">
                ⚠ Warnings ({warnings.length})
              </h4>
              <ul className="space-y-1">
                {warnings.slice(0, 3).map((warning, idx) => (
                  <li key={idx} className="text-xs text-gray-600 leading-tight">
                    • {warning.length > 80 ? warning.slice(0, 80) + '...' : warning}
                  </li>
                ))}
                {warnings.length > 3 && (
                  <li className="text-xs text-gray-400">
                    +{warnings.length - 3} more warnings
                  </li>
                )}
              </ul>
            </div>
          )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

EquipmentCard.displayName = 'EquipmentCard';

export default EquipmentCard;
