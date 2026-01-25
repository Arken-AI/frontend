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
 * Single field row within the section
 * Uses whitespace separation instead of border lines
 */
function FieldRow({ fieldKey, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 px-1">
      <span className="text-gray-500 text-sm min-w-[140px] shrink-0">
        {inferLabel(fieldKey)}
      </span>
      <div className="flex-1 min-w-0 text-gray-900">
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
        className="w-full flex items-center justify-between px-4 py-3
                   hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-xl">{icon}</span>}
          <span className="text-gray-900 font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-sm">
            {entries.length} {entries.length === 1 ? 'field' : 'fields'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
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
            <div className="px-4 pb-3 space-y-2 bg-gray-50/50">
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
