/**
 * NullValue Renderer
 *
 * Renders null/undefined values with a subtle indicator.
 * Shows "—" (em dash) by default, which is standard for "no data".
 */

import PropTypes from 'prop-types';

export default function NullValue({ className = '' }) {
  return (
    <span
      className={`text-content-tertiary select-none ${className}`}
      aria-label="No value"
    >
      —
    </span>
  );
}

NullValue.propTypes = {
  className: PropTypes.string,
};
