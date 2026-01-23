/**
 * Renderer Registry
 *
 * Solves circular dependency between ArrayValue/ObjectValue and MetadataValue.
 * MetadataValue registers itself here, and child renderers retrieve it.
 */

let metadataValueRenderer = null;

/**
 * Register the MetadataValue component
 * Called by MetadataValue on module load
 */
export function registerMetadataValueRenderer(renderer) {
  metadataValueRenderer = renderer;
}

/**
 * Get the registered MetadataValue component
 * Returns null if not yet registered
 */
export function getMetadataValueRenderer() {
  return metadataValueRenderer;
}
