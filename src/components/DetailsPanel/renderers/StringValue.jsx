/**
 * StringValue Renderer
 *
 * Renders string values with appropriate styling.
 * Handles empty strings, long text, and special formats.
 */

import PropTypes from 'prop-types';
import { truncateString } from '../utils';

/**
 * Check if string looks like a status/enum value
 */
function isStatusLike(str) {
  return /^[a-z_]+$/.test(str) && str.length < 30;
}

/**
 * Get status color based on common status values
 */
function getStatusColor(str) {
  const lower = str.toLowerCase();

  // Success states
  if (['converged', 'success', 'ok', 'valid', 'active', 'completed', 'feasible'].includes(lower)) {
    return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
  }

  // Warning states
  if (['warning', 'pending', 'partial', 'constrained'].includes(lower)) {
    return 'text-amber-600 dark:text-amber-400 bg-amber-500/10';
  }

  // Error states
  if (['error', 'failed', 'invalid', 'inactive', 'infeasible'].includes(lower)) {
    return 'text-red-600 dark:text-red-400 bg-red-500/10';
  }

  // Default for other status-like values
  return 'text-content-secondary bg-surface-secondary';
}

export default function StringValue({
  value,
  maxLength = 100,
  asStatus = false,
  className = '',
}) {
  // Handle empty/null
  if (value === null || value === undefined) {
    return <span className="text-content-tertiary">—</span>;
  }

  const str = String(value);

  // Empty string
  if (str.trim() === '') {
    return <span className="text-content-tertiary italic">empty</span>;
  }

  // Determine if this should be rendered as a status badge
  const renderAsStatus = asStatus || isStatusLike(str);

  if (renderAsStatus) {
    const colorClass = getStatusColor(str);
    // Format: snake_case → Title Case
    const displayStr = str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass} ${className}`}
      >
        {displayStr}
      </span>
    );
  }

  // Long text - truncate with tooltip
  if (str.length > maxLength) {
    const truncated = truncateString(str, maxLength);
    return (
      <span className={`text-gray-900 ${className}`} title={str}>
        {truncated}
      </span>
    );
  }

  // Normal string
  return <span className={`text-gray-900 ${className}`}>{str}</span>;
}

StringValue.propTypes = {
  value: PropTypes.string,
  maxLength: PropTypes.number,
  asStatus: PropTypes.bool,
  className: PropTypes.string,
};
