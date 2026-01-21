/**
 * Stream Section
 * 
 * Displays input or output streams for an equipment.
 * For inputs: Shows equipment constraints first, then feed streams
 * For outputs: Shows calculated streams (locked)
 * 
 * Constraints are shown inline with focus-reveal validation.
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
  hasErrors = false
}) {
  const isOutput = type === 'output';
  const isConfig = type === 'config';
  
  return (
    <div className={showHeader ? "" : ""}>
      {/* Section Header - only if showHeader=true */}
      {showHeader && streams.length > 0 && (
        <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${
          isOutput ? 'text-orange-600' : 'text-green-600'
        }`}>
          <span>{isOutput ? '📤' : '📥'}</span>
          <span>{title}</span>
          <span className="text-content-tertiary font-normal">
            ({streams.length} stream{streams.length !== 1 ? 's' : ''})
          </span>
          {/* Modified Indicator for Feed Streams */}
          {hasEdits && (
            <div className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              <span className="text-[10px] font-medium text-amber-700">Modified</span>
            </div>
          )}
          {/* Error Indicator for Feed Streams */}
          {hasErrors && (
            <div className={hasEdits ? 'ml-2' : 'ml-auto'}>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-300 rounded-full">
                <span className="text-[10px]">⚠️</span>
                <span className="text-[10px] font-medium text-red-700">Errors</span>
              </div>
            </div>
          )}
        </h4>
      )}
      
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
      <div className="space-y-2">
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
 */
function StreamCard({ stream, isOutput, editedValues, validationErrors, onParameterChange }) {
  const streamId = stream.streamId || stream.stream_id;
  const editable = stream.editable && !isOutput;
  const streamNumber = stream.streamNumber;
  
  const borderColor = isOutput ? 'border-l-orange-400' : 'border-l-green-400';
  const bgColor = isOutput ? 'bg-surface-secondary/30' : 'bg-surface';
  
  // Helper to get field key for this stream
  const getFieldKey = (fieldName) => `${streamId}_${fieldName}`;
  
  return (
    <div className={`rounded-md border border-border ${borderColor} border-l-2 ${bgColor} overflow-hidden`}>
      {/* Stream Header */}
      <div className="px-2 py-1.5 border-b border-border bg-surface-secondary/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-content">
            {streamNumber && (
              <span className="text-primary font-semibold mr-1.5">Stream {streamNumber}:</span>
            )}
            {stream.name || streamId}
          </span>
          {isOutput && (
            <span className="text-amber-400 text-[10px]">🔒</span>
          )}
        </div>
      </div>
      
      {/* Stream Properties */}
      <div className="p-2 space-y-0.5">
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
