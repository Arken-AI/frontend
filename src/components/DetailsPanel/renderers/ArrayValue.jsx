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
 * Collapsible array item - for object items in arrays
 */
function CollapsibleArrayItem({ item, label, index, fieldKey }) {
  const [expanded, setExpanded] = useState(false);
  const keyCount = typeof item === 'object' && item !== null 
    ? (Array.isArray(item) ? item.length : Object.keys(item).length)
    : 0;

  return (
    <div>
      {/* Expandable header */}
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
              {Object.entries(item).map(([key, val]) => {
                const MetadataValue = getMetadataValueRenderer();
                const isNestedObject = val && typeof val === 'object' && !Array.isArray(val);
                const isNestedArray = Array.isArray(val);
                
                // For nested objects/arrays, render on own line
                if (isNestedObject || isNestedArray) {
                  return (
                    <div key={key} className="py-1">
                      {MetadataValue ? (
                        <MetadataValue value={val} fieldKey={key} depth={2} />
                      ) : (
                        <span className="text-gray-900 text-sm font-mono">
                          {JSON.stringify(val)}
                        </span>
                      )}
                    </div>
                  );
                }
                
                // For primitives, justified layout
                return (
                  <div key={key} className="flex items-baseline justify-between gap-4 py-1">
                    <span className="text-gray-600 text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <div className="text-right">
                      {MetadataValue ? (
                        <MetadataValue value={val} fieldKey={key} depth={2} />
                      ) : (
                        <span className="text-gray-900 text-sm font-mono">
                          {String(val)}
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
 * Collapsible array header - for arrays of objects shown with expandable header
 */
function CollapsibleArrayHeader({ items, fieldKey, defaultExpanded, className }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const label = fieldKey.split('.').pop()?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Array';

  return (
    <div className={className}>
      {/* Expandable header */}
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
        <span className="text-gray-500 text-sm">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
      </button>

      {/* Expanded content - show individual items */}
      <AnimatePresence initial={false}>
        {expanded && (
          <div className="overflow-hidden mt-2 ml-2 pl-4 border-l-2 border-gray-200 space-y-2">
            {items.map((item, index) => {
              const itemLabel = `[${index}]`;
              
              // For object items, render as collapsible
              if (item && typeof item === 'object') {
                return (
                  <CollapsibleArrayItem
                    key={index}
                    item={item}
                    label={itemLabel}
                    index={index}
                    fieldKey={fieldKey}
                  />
                );
              }
              
              // For primitive items
              const MetadataValue = getMetadataValueRenderer();
              return (
                <div key={index} className="flex items-baseline justify-between gap-4 py-1">
                  <span className="text-gray-600 text-sm">{itemLabel}</span>
                  <div className="text-right">
                    {MetadataValue ? (
                      <MetadataValue value={item} fieldKey={`${fieldKey}[${index}]`} depth={1} />
                    ) : (
                      <span className="text-gray-900 font-mono text-sm">{JSON.stringify(item)}</span>
                    )}
                  </div>
                </div>
              );
            })}
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
        <CollapsibleArrayHeader
          items={value}
          fieldKey={fieldKey}
          defaultExpanded={defaultExpanded}
          className={className}
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
