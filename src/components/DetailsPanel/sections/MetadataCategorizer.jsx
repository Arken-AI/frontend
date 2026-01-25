/**
 * MetadataCategorizer - Auto-categorizing Metadata Display
 *
 * Takes a flat metadata object and automatically:
 * 1. Categorizes fields into logical groups (thermal, energy, flow, etc.)
 * 2. Sorts categories by priority
 * 3. Renders each category as a MetadataSection
 *
 * This is the key component for dynamic, schema-free metadata display.
 */

import PropTypes from 'prop-types';
import { categorizeMetadata, getSortedCategories, getCategoryInfo } from '../utils';
import { MetadataSection } from './index';

/**
 * Fields to exclude from categorized display
 * (typically shown elsewhere or not useful)
 */
const EXCLUDED_FIELDS = new Set([
  'id',
  'name',
  'type',
  'equipment_id',
  'equipment_type',
  'stream_id',
  // These are shown in EquipmentHeader
  'converged',
  'feasible',
  'active',
  'warnings',
]);

/**
 * MetadataCategorizer component
 */
export default function MetadataCategorizer({
  metadata,
  excludeFields = [],
  defaultExpandedCategories = [],
  showEmptyCategories = false,
  className = '',
}) {
  // Combine default excluded fields with custom ones
  const allExcluded = new Set([...EXCLUDED_FIELDS, ...excludeFields]);

  // Filter metadata
  const filteredMetadata = {};
  if (metadata && typeof metadata === 'object') {
    for (const [key, value] of Object.entries(metadata)) {
      if (!allExcluded.has(key)) {
        filteredMetadata[key] = value;
      }
    }
  }

  // Categorize the metadata
  const categorized = categorizeMetadata(filteredMetadata);

  // Get sorted categories
  const sortedCategories = getSortedCategories(categorized);

  // Filter out empty categories if needed
  const categoriesToRender = showEmptyCategories
    ? sortedCategories
    : sortedCategories.filter(([, data]) => Object.keys(data).length > 0);

  if (categoriesToRender.length === 0) {
    return (
      <div className={`text-gray-500 text-sm italic p-4 ${className}`}>
        No metadata available
      </div>
    );
  }

  return (
    <div className={className}>
      {categoriesToRender.map(([categoryName, categoryData]) => {
        const categoryInfo = getCategoryInfo(categoryName);
        const isDefaultExpanded = defaultExpandedCategories.includes(categoryName);

        return (
          <MetadataSection
            key={categoryName}
            title={categoryInfo.label}
            icon={categoryInfo.icon}
            data={categoryData}
            defaultExpanded={isDefaultExpanded}
          />
        );
      })}
    </div>
  );
}

MetadataCategorizer.propTypes = {
  /** The metadata object to categorize and display */
  metadata: PropTypes.object,
  /** Additional field keys to exclude from display */
  excludeFields: PropTypes.arrayOf(PropTypes.string),
  /** Category names that should be expanded by default */
  defaultExpandedCategories: PropTypes.arrayOf(PropTypes.string),
  /** Whether to show empty categories */
  showEmptyCategories: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};
