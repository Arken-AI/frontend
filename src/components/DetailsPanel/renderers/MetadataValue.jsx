/**
 * MetadataValue - Master Renderer Component
 *
 * The "traffic controller" that routes any value to the appropriate renderer.
 * Detects value type and delegates to specialized renderers.
 *
 * This component registers itself in the rendererRegistry so that
 * ArrayValue and ObjectValue can recursively render nested values.
 */

import PropTypes from 'prop-types';

import { detectType, inferTypeFromKey } from '../utils';
import {
  NullValue,
  BooleanValue,
  NumberValue,
  StringValue,
  ArrayValue,
  ObjectValue,
  registerMetadataValueRenderer,
} from './index';

/**
 * Main MetadataValue component
 * Automatically detects type and renders appropriately
 */
function MetadataValue({
  value,
  fieldKey = '',
  depth = 0,
  className = '',
  // Override options
  forceType,
  renderOptions = {},
}) {
  // Detect the value type
  let type = forceType || detectType(value);

  // Check if key name suggests a different type
  const keyTypeHint = inferTypeFromKey(fieldKey);
  if (keyTypeHint && type === 'string') {
    // Key suggests boolean but we got string "true"/"false"
    if (keyTypeHint.expectedType === 'boolean') {
      const lower = String(value).toLowerCase();
      if (lower === 'true' || lower === 'false') {
        type = 'boolean';
      }
    }
  }

  // Route to appropriate renderer
  switch (type) {
    case 'null':
      return <NullValue className={className} />;

    case 'boolean':
      return (
        <BooleanValue
          value={typeof value === 'string' ? value.toLowerCase() === 'true' : Boolean(value)}
          showLabel={renderOptions.showBooleanLabel !== false}
          className={className}
        />
      );

    case 'number':
      return (
        <NumberValue
          value={value}
          fieldKey={fieldKey}
          unit={renderOptions.unit}
          className={className}
        />
      );

    case 'string':
      return (
        <StringValue
          value={value}
          maxLength={renderOptions.maxStringLength}
          asStatus={renderOptions.asStatus}
          className={className}
        />
      );

    case 'array':
      return (
        <ArrayValue
          value={value}
          fieldKey={fieldKey}
          renderAs={renderOptions.arrayRenderAs}
          defaultExpanded={renderOptions.defaultExpanded || depth === 0}
          className={className}
        />
      );

    case 'object':
      return (
        <ObjectValue
          value={value}
          fieldKey={fieldKey}
          renderAs={renderOptions.objectRenderAs}
          defaultExpanded={renderOptions.defaultExpanded || depth === 0}
          depth={depth}
          className={className}
        />
      );

    default:
      // Fallback: render as string
      return (
        <span className={`text-content-secondary ${className}`}>
          {String(value)}
        </span>
      );
  }
}

MetadataValue.propTypes = {
  /** The value to render */
  value: PropTypes.any,
  /** The key/field name (used for type/unit inference) */
  fieldKey: PropTypes.string,
  /** Current nesting depth (used to limit recursion) */
  depth: PropTypes.number,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Force a specific type instead of auto-detecting */
  forceType: PropTypes.oneOf(['null', 'boolean', 'number', 'string', 'array', 'object']),
  /** Options to pass to child renderers */
  renderOptions: PropTypes.shape({
    /** Show Yes/No label next to boolean checkmarks */
    showBooleanLabel: PropTypes.bool,
    /** Override unit for numbers */
    unit: PropTypes.string,
    /** Max length before truncating strings */
    maxStringLength: PropTypes.number,
    /** Force string to render as status badge */
    asStatus: PropTypes.bool,
    /** How to render arrays: 'auto', 'pills', 'inline', 'list' */
    arrayRenderAs: PropTypes.oneOf(['auto', 'pills', 'inline', 'list']),
    /** How to render objects: 'auto', 'inline', 'composition', 'collapsible' */
    objectRenderAs: PropTypes.oneOf(['auto', 'inline', 'composition', 'collapsible']),
    /** Whether nested items should be expanded by default */
    defaultExpanded: PropTypes.bool,
  }),
};

// Register this component so ArrayValue and ObjectValue can use it
registerMetadataValueRenderer(MetadataValue);

export default MetadataValue;
