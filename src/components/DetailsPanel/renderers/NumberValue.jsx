/**
 * NumberValue Renderer
 *
 * Renders numeric values with proper formatting.
 * Handles unit display, precision, and scientific notation.
 */

import PropTypes from 'prop-types';
import { formatWithUnit } from '../utils';

export default function NumberValue({
  value,
  fieldKey = '',
  unit: overrideUnit,
  className = '',
}) {
  // Handle invalid numbers
  if (value === null || value === undefined) {
    return <span className="text-content-tertiary">—</span>;
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return <span className="text-content-secondary">{String(value)}</span>;
  }

  // Handle special cases
  if (!isFinite(value)) {
    return (
      <span className="text-amber-600 dark:text-amber-400 font-mono">
        {value > 0 ? '∞' : '-∞'}
      </span>
    );
  }

  // Format the number with unit inference
  const { formatted, unit: inferredUnit } = formatWithUnit(value, fieldKey);
  const displayUnit = overrideUnit ?? inferredUnit;

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      <span className="text-content-primary">{formatted}</span>
      {displayUnit && (
        <span className="text-content-tertiary ml-1 text-sm">{displayUnit}</span>
      )}
    </span>
  );
}

NumberValue.propTypes = {
  value: PropTypes.number,
  fieldKey: PropTypes.string,
  unit: PropTypes.string,
  className: PropTypes.string,
};
