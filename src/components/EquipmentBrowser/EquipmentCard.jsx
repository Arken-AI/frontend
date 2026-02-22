/**
 * Equipment Card
 * 
 * Accordion card showing equipment details.
 * Collapsed: Shows header with two lines (name row + status row)
 * Expanded: Shows inputs/outputs with collapsible sections
 * Highlights when selected via Zustand store.
 */

import { forwardRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StreamSection from './StreamSection';
import StreamField from './StreamField';

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

/**
 * Format constraint key to display label
 */
function formatParamLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/ Pa$/, ' (Pa)')
    .replace(/ K$/, ' (K)')
    .replace(/ Kw$/, ' (kW)');
}

/**
 * Equipment Parameters Section
 * Shows editable equipment parameters like reflux_ratio, num_stages, etc.
 */
function EquipmentParamsSection({ 
  constraints = [], 
  editedValues = {}, 
  validationErrors = {}, 
  onParameterChange,
  defaultExpanded = true,
  isCardExpanded = false
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Reset to default expanded state when card is expanded
  useEffect(() => {
    if (isCardExpanded) {
      setIsExpanded(defaultExpanded);
    }
  }, [isCardExpanded, defaultExpanded]);
  
  // Filter to only show editable parameters
  const editableParams = constraints.filter(c => c.editable !== false);
  
  if (editableParams.length === 0) return null;
  
  // Check if parameter is a dropdown (string type with options OR boolean)
  const isDropdownParam = (param) => {
    // String with allowed values
    if (param.type === 'string' && (param.allowed_values || param.options)) {
      return true;
    }
    // Boolean type or boolean value
    if (param.type === 'boolean' || typeof param.value === 'boolean') {
      return true;
    }
    return false;
  };
  
  // Check if parameter is boolean
  const isBooleanParam = (param) => {
    return param.type === 'boolean' || typeof param.value === 'boolean';
  };
  
  // Get dropdown options
  const getDropdownOptions = (param) => {
    // Boolean params always have true/false options
    if (isBooleanParam(param)) {
      return ['true', 'false'];
    }
    return param.allowed_values || param.options || [];
  };
  
  // Get current value for dropdown (handle boolean conversion)
  const getDropdownValue = (param) => {
    const val = editedValues[param.key] ?? param.value;
    // Convert boolean to string for dropdown
    if (typeof val === 'boolean') {
      return val ? 'true' : 'false';
    }
    return val;
  };
  
  // Handle dropdown change (convert back to boolean if needed)
  const handleDropdownChange = (param, stringValue) => {
    if (onParameterChange) {
      // Convert string back to boolean for boolean params
      if (isBooleanParam(param)) {
        onParameterChange(param.key, stringValue === 'true', true);
      } else {
        onParameterChange(param.key, stringValue, true);
      }
    }
  };
  
  return (
    <div className="mb-3">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 py-2 text-left hover:bg-gray-50 rounded-md -mx-1 px-1 cursor-pointer"
      >
        <span className={`text-gray-400 text-sm transition-transform duration-200 ${
          isExpanded ? 'rotate-90' : ''
        }`}>
          ›
        </span>
        <span className="text-sm font-semibold uppercase tracking-wide text-purple-600">
          ⚙️ PARAMETERS
        </span>
        <span className="text-sm font-medium text-purple-400">
          ({editableParams.length} editable)
        </span>
      </button>
      
      {/* Parameters Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-4 py-2 space-y-1">
              {editableParams.map((param) => (
                isDropdownParam(param) ? (
                  // Dropdown Select for string parameters with options OR booleans
                  <div key={param.key} className="py-1">
                    <div className="grid grid-cols-[1fr_100px_80px] items-center gap-2">
                      <span className="text-sm text-gray-700">{formatParamLabel(param.key)}</span>
                      <select
                        value={getDropdownValue(param)}
                        onChange={(e) => handleDropdownChange(param, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm text-right font-mono rounded-md 
                          bg-gray-100 border border-gray-200 hover:border-gray-300
                          focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-200
                          focus:outline-none transition-all cursor-pointer"
                      >
                        {getDropdownOptions(param).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {/* Empty space to align with unit column */}
                      <span className="text-sm text-gray-500"></span>
                    </div>
                  </div>
                ) : (
                  // Number input for numeric parameters
                  <StreamField
                    key={param.key}
                    label={formatParamLabel(param.key)}
                    value={editedValues[param.key] ?? param.value}
                    unit={param.unit || ''}
                    min={param.min}
                    max={param.max}
                    editable={param.editable !== false}
                    error={validationErrors[param.key]}
                    onChange={(newValue, isValid) => {
                      if (onParameterChange) {
                        onParameterChange(param.key, newValue, isValid);
                      }
                    }}
                  />
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
          
          {/* Name */}
          <span className="flex-1 font-semibold text-gray-900 truncate">{name}</span>
          
          {/* Warning Badge + Status Badge - warning first, then status */}
          <div className="flex items-center gap-2">
            <WarningBadge count={warningCount} />
            <StatusBadge status={status} converged={converged} />
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
          {/* EQUIPMENT PARAMETERS Section */}
          {constraints && constraints.length > 0 && (
            <EquipmentParamsSection
              constraints={constraints}
              editedValues={editedValues}
              validationErrors={validationErrors}
              onParameterChange={onParameterChange}
              isCardExpanded={isExpanded}
            />
          )}

          {/* INPUTS Section - All input streams */}
          {inputs.length > 0 && (
            <StreamSection 
              title="INPUTS" 
              streams={inputs} 
              type="input"
              editedValues={editedValues}
              validationErrors={validationErrors}
              onParameterChange={onParameterChange}
              isCollapsible={true}
              defaultExpanded={true}
              isCardExpanded={isExpanded}
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
              defaultExpanded={false}
              isCardExpanded={isExpanded}
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
