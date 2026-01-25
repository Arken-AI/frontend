/**
 * DetailsPanel - Main Equipment Details Component
 *
 * The primary component for displaying equipment metadata in the activity bar.
 * Composes all sub-components:
 * - EquipmentHeader: Name, type, icon, status badges, key metrics
 * - MetadataCategorizer: Auto-categorized metadata sections
 *
 * This component is designed to work with ANY equipment type from ANY industry
 * without hardcoding field names - it dynamically renders whatever data is provided.
 */

import PropTypes from 'prop-types';
import { EquipmentHeader, MetadataCategorizer } from './sections';

/**
 * DetailsPanel component
 */
export default function DetailsPanel({
  equipment,
  metadata,
  className = '',
  onClose,
}) {
  // Extract equipment info
  const equipmentName = equipment?.name || equipment?.id || metadata?.name || metadata?.id;
  const equipmentType = equipment?.type || metadata?.type || metadata?.equipment_type;

  // Handle no data state
  if (!metadata && !equipment) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <span className="text-4xl mb-3">📋</span>
        <p className="text-gray-500 text-sm">Select equipment to view details</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-sm font-semibold text-gray-900">Equipment Details</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close details panel"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Equipment Header */}
        <EquipmentHeader
          name={equipmentName}
          type={equipmentType}
          metadata={metadata}
        />

        {/* Categorized Metadata */}
        <MetadataCategorizer
          metadata={metadata}
        />
      </div>
    </div>
  );
}

DetailsPanel.propTypes = {
  /** Equipment object with id, name, type */
  equipment: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    type: PropTypes.string,
  }),
  /** Full metadata object from simulation results */
  metadata: PropTypes.object,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Callback when close button is clicked */
  onClose: PropTypes.func,
};
