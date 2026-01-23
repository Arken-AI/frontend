/**
 * ArrayValue Renderer
 *
 * Renders arrays based on their content type.
 * - Simple arrays (strings/numbers): inline comma-separated or pills
 * - Object arrays: vertical list with cards
 * - Empty arrays: subtle indicator
 */

import PropTypes from 'prop-types';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { isSimpleArray, getArrayContentType } from '../utils';
import { getMetadataValueRenderer } from './rendererRegistry';

/**
 * Render a simple array as inline pills
 */
function SimplePills({ items, className }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs
                     bg-surface-secondary text-content-secondary border border-border-subtle"
        >
          {String(item)}
        </span>
      ))}
    </div>
  );
}

/**
 * Render a simple array as comma-separated values
 */
function SimpleInline({ items, className }) {
  return (
    <span className={`text-content-secondary ${className}`}>
      {items.map((item, index) => (
        <span key={index}>
          <span className="font-mono">{String(item)}</span>
          {index < items.length - 1 && <span className="text-content-tertiary">, </span>}
        </span>
      ))}
    </span>
  );
}

/**
 * Get a friendly label for array items based on field key
 */
function getItemLabel(fieldKey, index) {
  const key = fieldKey.toLowerCase();
  if (key.includes('stage')) return `Stage ${index + 1}`;
  if (key.includes('stream')) return `Stream ${index + 1}`;
  if (key.includes('component')) return `Component ${index + 1}`;
  if (key.includes('layer')) return `Layer ${index + 1}`;
  if (key.includes('zone')) return `Zone ${index + 1}`;
  if (key.includes('effect')) return `Effect ${index + 1}`;
  if (key.includes('tray')) return `Tray ${index + 1}`;
  return `Item ${index + 1}`;
}

/**
 * Render complex arrays as mini-cards
 */
function ComplexList({ items, fieldKey, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasMany = items.length > 3;
  const displayItems = expanded ? items : items.slice(0, 3);

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {displayItems.map((item, index) => (
          <MiniCard
            key={index}
            label={getItemLabel(fieldKey, index)}
            data={item}
            fieldKey={`${fieldKey}[${index}]`}
          />
        ))}
      </AnimatePresence>

      {hasMany && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-accent-primary hover:text-accent-primary-hover
                     flex items-center gap-1 transition-colors mt-1"
        >
          <svg
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? 'Show less' : `Show ${items.length - 3} more`}
        </button>
      )}
    </div>
  );
}

/**
 * Mini-card component for nested items
 */
function MiniCard({ label, data, fieldKey }) {
  const [expanded, setExpanded] = useState(false);
  const MetadataValue = getMetadataValueRenderer();
  
  // For objects, show field count
  const isObject = data && typeof data === 'object' && !Array.isArray(data);
  const fieldCount = isObject ? Object.keys(data).length : null;

  return (
    <div className="bg-surface-secondary/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2
                   hover:bg-surface-secondary transition-colors text-left"
      >
        <span className="text-content-primary text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {fieldCount && (
            <span className="text-content-tertiary text-xs">{fieldCount} fields</span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-content-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}
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
          <div className="px-3 pb-3 space-y-1">
            {isObject ? (
              Object.entries(data).map(([key, val]) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-1.5">
                  <span className="text-content-tertiary text-xs min-w-[100px] shrink-0">
                    {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    {MetadataValue ? (
                      <MetadataValue value={val} fieldKey={key} depth={2} />
                    ) : (
                      <span className="text-content-secondary text-sm">{JSON.stringify(val)}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              MetadataValue ? (
                <MetadataValue value={data} fieldKey={fieldKey} depth={2} />
              ) : (
                <span className="text-content-secondary text-sm">{JSON.stringify(data)}</span>
              )
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ArrayValue({
  value,
  fieldKey = '',
  renderAs = 'auto',
  defaultExpanded = false,
  className = '',
}) {
  // Handle null/undefined
  if (!Array.isArray(value)) {
    return <span className="text-content-tertiary">—</span>;
  }

  // Empty array
  if (value.length === 0) {
    return <span className="text-content-tertiary italic text-sm">empty array</span>;
  }

  // Determine render mode
  const contentType = getArrayContentType(value);
  const isSimple = isSimpleArray(value);

  // Auto-select render mode
  let mode = renderAs;
  if (mode === 'auto') {
    if (isSimple && value.length <= 10) {
      mode = contentType === 'strings' ? 'pills' : 'inline';
    } else {
      mode = 'list';
    }
  }

  switch (mode) {
    case 'pills':
      return <SimplePills items={value} className={className} />;
    case 'inline':
      return <SimpleInline items={value} className={className} />;
    case 'list':
    default:
      return (
        <ComplexList
          items={value}
          fieldKey={fieldKey}
          defaultExpanded={defaultExpanded}
        />
      );
  }
}

ArrayValue.propTypes = {
  value: PropTypes.array,
  fieldKey: PropTypes.string,
  renderAs: PropTypes.oneOf(['auto', 'pills', 'inline', 'list']),
  defaultExpanded: PropTypes.bool,
  className: PropTypes.string,
};
