/**
 * Stream Section
 * 
 * Collapsible section displaying input or output streams for equipment.
 * Features accordion behavior with orange header text and chevron indicator.
 * 
 * For inputs: Shows feed streams with editable fields
 * For outputs: Shows calculated streams (locked)
 */

import { useState } from 'react';
import StreamField from './StreamField';
import CompositionTable from './CompositionTable';

// Format constraint key to display label
function formatConstraintLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/ Pa$/, '')
    .replace(/ K$/, '')
    .replace(/ Kw$/, '');
}

export default function StreamSection({ 
  title, 
  streams, 
  type, 
  constraints = [], 
  showHeader = true,
  editedValues = {},
  validationErrors = {},
  onParameterChange,
  hasEdits = false,
  hasErrors = false,
  isCollapsible = false,
  defaultExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isOutput = type === 'output';
  const isConfig = type === 'config';
  
  // Count streams for display
  const streamCount = streams.length;
  
  // Handle header click for accordion
  const handleHeaderClick = () => {
    if (isCollapsible) {
      setIsExpanded(!isExpanded);
    }
  };
  
  return (
    <div className="mt-3 first:mt-0">
      {/* Section Header - Clickable accordion style */}
      {showHeader && (
        <button
          onClick={handleHeaderClick}
          className={`w-full flex items-center gap-2 py-2 text-left transition-colors ${
            isCollapsible ? 'hover:bg-gray-50 rounded-md -mx-1 px-1 cursor-pointer' : ''
          }`}
          disabled={!isCollapsible}
        >
          {/* Chevron */}
          {isCollapsible && (
            <span className={`text-gray-400 text-sm transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}>
              ›
            </span>
          )}
          
          {/* Title */}
          <span className={`text-sm font-semibold uppercase tracking-wide ${
            isOutput ? 'text-orange-500' : 'text-blue-500'
          }`}>
            {title}
          </span>
          
          {/* Stream count */}
          <span className={`text-sm font-medium ${
            isOutput ? 'text-orange-400' : 'text-blue-400'
          }`}>
            ({streamCount} stream{streamCount !== 1 ? 's' : ''})
          </span>
          
          {/* Modified Indicator */}
          {hasEdits && (
            <div className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              <span className="text-[10px] font-medium text-amber-700">Modified</span>
            </div>
          )}
          
          {/* Error Indicator */}
          {hasErrors && (
            <div className={hasEdits ? 'ml-2' : 'ml-auto'}>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-300 rounded-full">
                <span className="text-[10px]">⚠️</span>
                <span className="text-[10px] font-medium text-red-700">Errors</span>
              </div>
            </div>
          )}
        </button>
      )}
      
      {/* Content - Collapsible */}
      {(!isCollapsible || isExpanded) && (
        <div className="mt-1">
          {/* Equipment Constraints (only for config type) */}
          {isConfig && constraints.length > 0 && (
            <ConstraintsCard 
              constraints={constraints}
              editedValues={editedValues}
              validationErrors={validationErrors}
              onParameterChange={onParameterChange}
            />
          )}
          
          {/* Streams */}
          <div className="space-y-4">
            {streams.map((stream) => (
              <StreamCard 
                key={stream.streamId || stream.stream_id} 
                stream={stream} 
                isOutput={isOutput}
                editedValues={editedValues}
                validationErrors={validationErrors}
                onParameterChange={onParameterChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Constraints Card - Equipment parameters with inline validation
 */
function ConstraintsCard({ constraints, editedValues, validationErrors, onParameterChange }) {
  return (
    <div className="rounded-md border border-border border-l-2 border-l-primary bg-primary/5 overflow-hidden mb-2">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border bg-primary/10">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">⚙️</span>
          <span className="text-xs font-medium text-primary">Equipment Parameters</span>
        </div>
      </div>
      
      {/* Constraint Fields */}
      <div className="p-2 space-y-1">
        {constraints.map((constraint) => (
          <StreamField
            key={constraint.key}
            label={formatConstraintLabel(constraint.key)}
            value={editedValues[constraint.key] ?? constraint.value}
            unit={constraint.unit}
            min={constraint.min}
            max={constraint.max}
            defaultValue={constraint.default}
            description={constraint.description}
            editable={true}
            error={validationErrors[constraint.key]}
            onChange={(newValue, isValid) => {
              if (onParameterChange) {
                onParameterChange(constraint.key, newValue, isValid);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual Stream Card
 * Clean layout with left border accent (green for inputs, orange for outputs)
 */
function StreamCard({ stream, isOutput, editedValues, validationErrors, onParameterChange }) {
  const streamId = stream.streamId || stream.stream_id;
  const editable = stream.editable && !isOutput;
  const streamNumber = stream.streamNumber;
  
  // Border color based on stream type
  const borderColor = isOutput ? 'border-l-orange-400' : 'border-l-green-500';
  
  // Helper to get field key for this stream
  const getFieldKey = (fieldName) => `${streamId}_${fieldName}`;
  
  return (
    <div className={`border-l-4 ${borderColor} pl-4 py-1`}>
      {/* Stream Name */}
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-900">
          {stream.name || streamId}
        </span>
      </div>
      
      {/* Stream Properties */}
      <div className="space-y-3">
        <StreamField
          label="Temperature"
          value={editedValues[getFieldKey('temperature_K')] ?? stream.temperature_K}
          unit="K"
          editable={editable}
          locked={isOutput}
          min={200}
          max={1000}
          error={validationErrors[getFieldKey('temperature_K')]}
          onChange={(newValue, isValid) => {
            if (onParameterChange) {
              onParameterChange(getFieldKey('temperature_K'), newValue, isValid);
            }
          }}
        />
        <StreamField
          label="Pressure"
          value={editedValues[getFieldKey('pressure_Pa')] ?? stream.pressure_Pa}
          unit="Pa"
          editable={editable}
          locked={isOutput}
          min={1000}
          max={10000000}
          error={validationErrors[getFieldKey('pressure_Pa')]}
          onChange={(newValue, isValid) => {
            if (onParameterChange) {
              onParameterChange(getFieldKey('pressure_Pa'), newValue, isValid);
            }
          }}
        />
        <StreamField
          label="Flow Rate"
          value={editedValues[getFieldKey('flow_rate')] ?? stream.flow_rate}
          unit={stream.flow_basis === 'mass' ? 'kg/h' : 'kmol/h'}
          editable={editable}
          locked={isOutput}
          min={0}
          max={1000000}
          error={validationErrors[getFieldKey('flow_rate')]}
          onChange={(newValue, isValid) => {
            if (onParameterChange) {
              onParameterChange(getFieldKey('flow_rate'), newValue, isValid);
            }
          }}
        />
        <StreamField
          label="Phase"
          value={stream.phase}
          editable={false}
          locked={isOutput}
        />
        
        {/* Composition */}
        {stream.composition && (
          <CompositionTable
            composition={stream.composition}
            basis={stream.composition_basis}
            editable={editable}
            locked={isOutput}
          />
        )}
      </div>
    </div>
  );
}
