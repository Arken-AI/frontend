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
 * Render composition object as a mini table
 */
function CompositionTable({ data, className }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]); // Sort by value descending

  return (
    <div className={`space-y-1 ${className}`}>
      {entries.map(([component, fraction]) => {
        const percent = typeof fraction === 'number' ? (fraction * 100).toFixed(2) : fraction;
        const barWidth = typeof fraction === 'number' ? Math.min(fraction * 100, 100) : 0;

        return (
          <div key={component} className="flex items-center gap-2">
            <span className="text-content-secondary text-sm w-24 truncate" title={component}>
              {component}
            </span>
            <div className="flex-1 h-2 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary/60 rounded-full transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="text-content-tertiary text-xs font-mono w-16 text-right">
              {percent}%
            </span>
          </div>
        );
      })}
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
 * Render complex object as collapsible section
 */
function CollapsibleObject({ data, label, defaultExpanded, depth }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const keyCount = Object.keys(data).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-900 text-sm font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">{keyCount} fields</span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <div className="overflow-hidden border-t border-gray-100">
            <div className="p-4 space-y-3 bg-gray-50/50">
              {Object.entries(data).map(([key, val]) => {
                const MetadataValue = getMetadataValueRenderer();
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-gray-500 text-sm">{inferLabel(key)}</span>
                    {MetadataValue ? (
                      <MetadataValue value={val} fieldKey={key} depth={depth + 1} />
                    ) : (
                      <span className="text-gray-900 text-sm">
                        {JSON.stringify(val)}
                      </span>
                    )}
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
    } else if (isSimpleObject(value)) {
      mode = 'inline';
    } else {
      mode = 'collapsible';
    }
  }

  // Limit nesting depth
  if (depth > 3) {
    mode = 'inline';
  }

  switch (mode) {
    case 'modelnotes':
      return <ModelNotesCards data={value} className={className} />;
    case 'composition':
      return <CompositionTable data={value} className={className} />;
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
