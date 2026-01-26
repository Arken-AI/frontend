/**
 * EquipmentHeader - Equipment Title and Status Component
 *
 * Displays the equipment header with:
 * - Equipment name and type
 * - Dynamic icon based on equipment type
 * - Status indicators (converged, active, warnings)
 * - Key summary metrics
 */

import PropTypes from 'prop-types';
import { inferLabel } from '../utils';

/**
 * Equipment type to icon mapping
 * Uses emoji for simplicity, can be replaced with SVG icons
 */
const EQUIPMENT_ICONS = {
  // Heat Transfer
  heater: '🔥',
  cooler: '❄️',
  heat_exchanger: '🔄',
  condenser: '💧',
  reboiler: '♨️',

  // Separation
  flash_drum: '💨',
  distillation_column: '🏭',
  stripper_column: '📊',
  absorber: '🫧',
  extractor: '🧪',

  // Flow
  pump: '⚙️',
  compressor: '🌀',
  valve: '🔧',
  mixer: '🔀',
  splitter: '↗️',

  // Reactors
  reactor: '⚗️',
  cstr: '🔬',
  pfr: '📏',

  // Evaporation
  evaporator: '☁️',
  multi_effect_evaporator: '☁️',

  // Default
  default: '📦',
};

/**
 * Get icon for equipment type
 */
function getEquipmentIcon(type) {
  if (!type) return EQUIPMENT_ICONS.default;
  const normalizedType = type.toLowerCase().replace(/[-\s]/g, '_');
  return EQUIPMENT_ICONS[normalizedType] || EQUIPMENT_ICONS.default;
}

/**
 * Status badge component
 */
function StatusBadge({ status, label }) {
  const styles = {
    success: 'bg-green-50 text-green-600 border-green-300',
    warning: 'bg-orange-50 text-orange-500 border-orange-300',
    error: 'bg-red-50 text-red-600 border-red-300',
    info: 'bg-blue-50 text-blue-600 border-blue-300',
    neutral: 'bg-gray-50 text-gray-600 border-gray-300',
  };

  const icons = {
    success: '✓',
    warning: '⚠',
    error: '✗',
    info: 'ℹ',
    neutral: '•',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.neutral}`}
    >
      <span>{icons[status] || icons.neutral}</span>
      <span>{label}</span>
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['success', 'warning', 'error', 'info', 'neutral']),
  label: PropTypes.string.isRequired,
};

/**
 * Extract status from metadata
 */
function extractStatus(metadata) {
  const statuses = [];

  // Check converged status
  if (metadata?.converged !== undefined) {
    statuses.push({
      status: metadata.converged ? 'success' : 'error',
      label: metadata.converged ? 'Converged' : 'Not Converged',
    });
  }

  // Check feasibility
  if (metadata?.feasible !== undefined) {
    statuses.push({
      status: metadata.feasible ? 'success' : 'error',
      label: metadata.feasible ? 'Feasible' : 'Infeasible',
    });
  }

  // Check for warnings
  if (metadata?.warnings && Array.isArray(metadata.warnings) && metadata.warnings.length > 0) {
    statuses.push({
      status: 'warning',
      label: `${metadata.warnings.length}`,
    });
  }

  // Check active status
  if (metadata?.active !== undefined) {
    statuses.push({
      status: metadata.active ? 'info' : 'neutral',
      label: metadata.active ? 'Active' : 'Inactive',
    });
  }

  return statuses;
}

/**
 * Extract key metrics for quick summary
 */
function extractKeyMetrics(metadata, equipmentType) {
  const metrics = [];

  // Common metrics by equipment type
  const metricKeys = {
    heater: ['duty_kW', 'efficiency'],
    cooler: ['duty_kW', 'efficiency'],
    pump: ['power_kW', 'head_m', 'efficiency'],
    heat_exchanger: ['duty_kW', 'LMTD_K', 'U_overall_W_m2K'],
    distillation_column: ['num_stages', 'reflux_ratio'],
    stripper_column: ['recovery_percent', 'packed_height_m'],
    flash_drum: ['outlet_vapor_fraction'],
    mixer: ['num_inlets_used'],
    evaporator: ['num_effects', 'total_duty_kW'],
  };

  const keysToCheck = metricKeys[equipmentType] || ['duty_kW', 'efficiency', 'power_kW'];

  for (const key of keysToCheck) {
    if (metadata?.[key] !== undefined) {
      let value = metadata[key];
      let displayValue;

      // Format based on type
      if (typeof value === 'number') {
        if (key.includes('efficiency') || key.includes('percent')) {
          displayValue = `${(value * 100).toFixed(1)}%`;
        } else if (Math.abs(value) >= 1000) {
          displayValue = value.toLocaleString('en-US', { maximumFractionDigits: 0 });
        } else {
          displayValue = value.toLocaleString('en-US', { maximumFractionDigits: 2 });
        }
      } else {
        displayValue = String(value);
      }

      metrics.push({
        label: inferLabel(key),
        value: displayValue,
      });

      // Limit to 3 metrics
      if (metrics.length >= 3) break;
    }
  }

  return metrics;
}

/**
 * EquipmentHeader component
 */
export default function EquipmentHeader({
  name,
  type,
  icon,
  metadata,
  className = '',
}) {
  const displayIcon = icon || getEquipmentIcon(type);
  const statuses = extractStatus(metadata);
  const metrics = extractKeyMetrics(metadata, type);
  const displayName = name || inferLabel(type) || 'Equipment';
  const displayType = type ? inferLabel(type) : null;

  return (
    <div className={`p-4 ${className}`}>
      {/* Top row: Icon, Name, Status badges */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{displayIcon}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
            {displayType && displayType !== displayName && (
              <p className="text-sm text-gray-500">{displayType}</p>
            )}
          </div>
        </div>

        {statuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {statuses.map((s, i) => (
              <StatusBadge key={i} status={s.status} label={s.label} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom row: Key metrics */}
      {metrics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {metrics.map((m, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="text-sm text-gray-500">{m.label}:</span>
                <span className="text-sm font-semibold text-gray-900 font-mono">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

EquipmentHeader.propTypes = {
  /** Equipment name/ID */
  name: PropTypes.string,
  /** Equipment type (heater, pump, etc.) */
  type: PropTypes.string,
  /** Override icon (emoji or component) */
  icon: PropTypes.node,
  /** Equipment metadata for status extraction */
  metadata: PropTypes.object,
  /** Additional CSS classes */
  className: PropTypes.string,
};
