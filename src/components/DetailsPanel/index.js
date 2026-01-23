/**
 * DetailsPanel Component
 *
 * Main export for the DetailsPanel component and its sub-components.
 *
 * Usage:
 *   import { DetailsPanel } from '@/components/DetailsPanel';
 *   // or
 *   import DetailsPanel from '@/components/DetailsPanel';
 *
 * Sub-components are also available:
 *   import { MetadataSection, EquipmentHeader, MetadataCategorizer } from '@/components/DetailsPanel';
 */

// Main component
export { default } from "./DetailsPanel";
export { default as DetailsPanel } from "./DetailsPanel";

// Section components
export {
  MetadataSection,
  EquipmentHeader,
  MetadataCategorizer,
} from "./sections";

// Renderer components (for advanced use)
export {
  MetadataValue,
  NullValue,
  BooleanValue,
  NumberValue,
  StringValue,
  ArrayValue,
  ObjectValue,
} from "./renderers";

// Utility functions (for advanced use)
export {
  inferLabel,
  inferUnit,
  formatNumber,
  formatWithUnit,
  detectType,
  detectCategory,
  categorizeMetadata,
  getCategoryInfo,
} from "./utils";
