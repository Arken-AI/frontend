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
 * Render complex arrays as expandable list
 */
function ComplexList({ items, fieldKey, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasMany = items.length > 3;
  const displayItems = expanded ? items : items.slice(0, 3);

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {displayItems.map((item, index) => (
          <div
            key={index}
            className="pl-3 border-l-2 border-border-subtle"
          >
            {(() => {
              const MetadataValue = getMetadataValueRenderer();
              return MetadataValue ? (
                <MetadataValue value={item} fieldKey={`${fieldKey}[${index}]`} depth={1} />
              ) : (
                <span className="text-content-secondary">{JSON.stringify(item)}</span>
              );
            })()}
          </div>
        ))}
      </AnimatePresence>

      {hasMany && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-accent-primary hover:text-accent-primary-hover
                     flex items-center gap-1 transition-colors"
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
