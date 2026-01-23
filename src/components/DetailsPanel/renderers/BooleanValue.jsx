/**
 * BooleanValue Renderer
 *
 * Renders boolean values with visual indicators.
 * Uses checkmark/cross icons with appropriate colors.
 */

import PropTypes from 'prop-types';

export default function BooleanValue({ value, showLabel = true, className = '' }) {
  const isTrue = Boolean(value);

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role="status"
      aria-label={isTrue ? 'Yes' : 'No'}
    >
      {isTrue ? (
        <>
          <svg
            className="w-4 h-4 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {showLabel && <span className="text-emerald-600 dark:text-emerald-400">Yes</span>}
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {showLabel && <span className="text-red-600 dark:text-red-400">No</span>}
        </>
      )}
    </span>
  );
}

BooleanValue.propTypes = {
  value: PropTypes.bool,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};
