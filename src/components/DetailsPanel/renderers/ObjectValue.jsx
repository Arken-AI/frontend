/**
 * ObjectValue Renderer
 *
 * Renders objects based on their complexity.
 * - Simple objects (few keys, primitive values): inline table
 * - Complex objects: collapsible section with recursive rendering
 * - Special objects (composition): custom layout
 * - Model notes: info card layout
 */

import PropTypes from 'prop-types';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { isSimpleObject, inferLabel } from '../utils';
import { getMetadataValueRenderer } from './rendererRegistry';

/**
 * Render simple object as inline key-value pairs
 */
function InlineObject({ data, className }) {
  const entries = Object.entries(data);

  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className="text-content-tertiary text-xs">{inferLabel(key)}:</span>
          <span className="text-content-secondary font-mono text-sm">
            {value === null || value === undefined
              ? '—'
              : typeof value === 'boolean'
                ? value
                  ? '✓'
                  : '✗'
                : String(value)}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Render composition object like Equipment Browser - with Molar fractions label and Total row
 */
function CompositionTable({ data, fieldKey, className }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]); // Sort by value descending
  const total = entries.reduce((sum, [, val]) => sum + (typeof val === 'number' ? val : 0), 0);
  const isValidTotal = Math.abs(total - 1.0) < 0.001;

  return (
    <div className={`ml-2 pl-4 border-l-2 border-gray-200 ${className}`}>
      {/* Sub-label */}
      <div className="text-gray-500 text-sm mb-2">Molar fractions</div>
      
      {/* Component rows */}
      <div className="space-y-0 divide-y divide-gray-100">
        {entries.map(([component, fraction]) => {
          const displayValue = typeof fraction === 'number' 
            ? fraction.toFixed(4) 
            : String(fraction);

          return (
            <div key={component} className="flex items-baseline justify-between gap-4 py-2">
              <span className="text-gray-600 text-sm capitalize">{component}</span>
              <span className="text-gray-900 text-sm font-mono">{displayValue}</span>
            </div>
          );
        })}
        
        {/* Total row */}
        <div className="flex items-baseline justify-between gap-4 py-2 border-t border-gray-300">
          <span className="text-gray-600 text-sm font-medium">Total</span>
          <span className={`text-sm font-mono font-medium ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
            {total.toFixed(4)} {isValidTotal ? '✓' : '✗'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Render model notes as info cards - clean, readable format
 */
function ModelNotesCards({ data, className }) {
  const entries = Object.entries(data);

  return (
    <div className={`space-y-2 ${className}`}>
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <span className="text-blue-500 text-sm mt-0.5">ℹ️</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-blue-700 block mb-1">
                {inferLabel(key)}
              </span>
              <p className="text-xs text-gray-700 leading-relaxed">
                {typeof value === 'string' 
                  ? value 
                  : typeof value === 'object' && value !== null
                    ? Object.values(value).join(' • ')
                    : String(value)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Render complex object as collapsible section - expandable link style like Equipment Browser
 */
function CollapsibleObject({ data, label, defaultExpanded, depth }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const keyCount = Object.keys(data).length;

  return (
    <div>
      {/* Expandable link header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 text-sm font-medium">{label}</span>
        <span className="text-gray-500 text-sm">({keyCount} {keyCount === 1 ? 'item' : 'items'})</span>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <div className="overflow-hidden mt-2 ml-2 pl-4 border-l-2 border-gray-200">
            <div className="space-y-2">
              {Object.entries(data).map(([key, val]) => {
                const MetadataValue = getMetadataValueRenderer();
                const isNestedObject = val && typeof val === 'object' && !Array.isArray(val);
                const isNestedArray = Array.isArray(val);
                
                // For nested objects/arrays, render them on their own line
                if (isNestedObject || isNestedArray) {
                  return (
                    <div key={key} className="py-1">
                      {MetadataValue ? (
                        <MetadataValue value={val} fieldKey={key} depth={depth + 1} />
                      ) : (
                        <span className="text-gray-900 text-sm font-mono">
                          {JSON.stringify(val)}
                        </span>
                      )}
                    </div>
                  );
                }
                
                // For primitives, show label: value justified
                return (
                  <div key={key} className="flex items-baseline justify-between gap-4 py-1">
                    <span className="text-gray-600 text-sm">{inferLabel(key)}</span>
                    <div className="text-right">
                      {MetadataValue ? (
                        <MetadataValue value={val} fieldKey={key} depth={depth + 1} />
                      ) : (
                        <span className="text-gray-900 text-sm font-mono">
                          {JSON.stringify(val)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Check if object looks like a composition
 */
function isComposition(data, fieldKey) {
  if (!data || typeof data !== 'object') return false;

  // Key name hints
  if (
    fieldKey.toLowerCase().includes('composition') ||
    fieldKey.toLowerCase().includes('fraction')
  ) {
    // All values should be numbers between 0 and 1
    return Object.values(data).every(
      (v) => typeof v === 'number' && v >= 0 && v <= 1
    );
  }

  return false;
}

/**
 * Check if object looks like model notes/assumptions
 */
function isModelNotes(data, fieldKey) {
  if (!data || typeof data !== 'object') return false;
  
  const key = fieldKey.toLowerCase();
  return (
    key.includes('model_notes') ||
    key.includes('notes') ||
    key.includes('assumptions') ||
    key.includes('model_assumptions')
  );
}

export default function ObjectValue({
  value,
  fieldKey = '',
  renderAs = 'auto',
  defaultExpanded = false,
  depth = 0,
  className = '',
}) {
  // Handle null/undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return <span className="text-content-tertiary">—</span>;
  }

  // Empty object
  if (Object.keys(value).length === 0) {
    return <span className="text-content-tertiary italic text-sm">empty object</span>;
  }

  // Determine render mode
  let mode = renderAs;
  if (mode === 'auto') {
    if (isModelNotes(value, fieldKey)) {
      mode = 'modelnotes';
    } else if (isComposition(value, fieldKey)) {
      mode = 'composition';
    } else {
      // Always use collapsible for objects to match Equipment Browser style
      mode = 'collapsible';
    }
  }

  // Only limit at very deep nesting
  if (depth > 5) {
    mode = 'inline';
  }

  switch (mode) {
    case 'modelnotes':
      return <ModelNotesCards data={value} className={className} />;
    case 'composition':
      return <CompositionTable data={value} fieldKey={fieldKey} className={className} />;
    case 'inline':
      return <InlineObject data={value} className={className} />;
    case 'collapsible':
    default:
      return (
        <CollapsibleObject
          data={value}
          label={inferLabel(fieldKey) || 'Details'}
          defaultExpanded={defaultExpanded}
          depth={depth}
        />
      );
  }
}

ObjectValue.propTypes = {
  value: PropTypes.object,
  fieldKey: PropTypes.string,
  renderAs: PropTypes.oneOf(['auto', 'inline', 'composition', 'collapsible', 'modelnotes']),
  defaultExpanded: PropTypes.bool,
  depth: PropTypes.number,
  className: PropTypes.string,
};
