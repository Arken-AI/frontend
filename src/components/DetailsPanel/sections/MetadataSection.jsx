/**
 * MetadataSection - Collapsible Section Component
 *
 * Groups related metadata fields into a collapsible section with:
 * - Icon and title header
 * - Expand/collapse animation
 * - Field count indicator
 * - Iterates over all keys in data (no hardcoding)
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';

import { inferLabel } from '../utils';
import { MetadataValue } from '../renderers';

/**
 * Check if value is a nested object (not array, not null)
 */
function isNestedObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Single field row within the section
 * Justified layout: label left, value right-aligned
 * For nested objects, render full-width without duplicate label
 */
function FieldRow({ fieldKey, value }) {
  // For nested objects, render full-width (the object renderer handles its own header)
  if (isNestedObject(value) && Object.keys(value).length > 0) {
    return (
      <div className="py-2">
        <MetadataValue value={value} fieldKey={fieldKey} />
      </div>
    );
  }

  // For primitives and arrays, use standard left-right layout
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-gray-600 text-sm">
        {inferLabel(fieldKey)}
      </span>
      <div className="text-right">
        <MetadataValue value={value} fieldKey={fieldKey} />
      </div>
    </div>
  );
}

FieldRow.propTypes = {
  fieldKey: PropTypes.string.isRequired,
  value: PropTypes.any,
};

/**
 * MetadataSection component
 */
export default function MetadataSection({
  title,
  icon,
  data,
  defaultExpanded = false,
  className = '',
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Get all entries from data
  const entries = data ? Object.entries(data) : [];

  // Don't render empty sections
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={`border-b border-gray-100 last:border-b-0 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3
                   hover:bg-gray-50 transition-colors text-left"
        aria-expanded={expanded}
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
            expanded ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-gray-900 font-semibold">{title}</span>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 ml-6 space-y-0 divide-y divide-gray-100">
              {entries.map(([key, value]) => (
                <FieldRow
                  key={key}
                  fieldKey={key}
                  value={value}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

MetadataSection.propTypes = {
  /** Section title */
  title: PropTypes.string.isRequired,
  /** Icon emoji or component */
  icon: PropTypes.node,
  /** Object containing the fields to display */
  data: PropTypes.object,
  /** Whether section is expanded by default */
  defaultExpanded: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};
