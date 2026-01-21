/**
 * Equipment Parameters Store
 *
 * Manages equipment parameter edits, validation, and pending changes.
 * Tracks original values from simulation vs user modifications.
 *
 * State Structure:
 * - originalParams: { equipmentId: { paramName: value } } - From last simulation
 * - editedParams: { equipmentId: { paramName: value } } - User modifications only
 * - validationErrors: { equipmentId: { paramName: errorMessage } }
 * - hasUnsavedChanges: boolean - Quick check if any edits exist
 */

import { create } from "zustand";

const useEquipmentStore = create((set, get) => ({
  // State
  originalParams: {},
  editedParams: {},
  validationErrors: {},
  hasUnsavedChanges: false,

  /**
   * Initialize store with simulation response data
   * Called when new simulation results arrive
   */
  setOriginalParams: (equipmentParamsMap) => {
    set({
      originalParams: equipmentParamsMap,
      editedParams: {}, // Clear edits on new simulation
      validationErrors: {},
      hasUnsavedChanges: false,
    });
  },

  /**
   * Update a single parameter for an equipment
   * @param {string} equipmentId - Equipment identifier
   * @param {string} paramName - Parameter name (e.g., 'imbibition_percent', 'rpm')
   * @param {number} newValue - New parameter value
   */
  updateParameter: (equipmentId, paramName, newValue) => {
    set((state) => {
      const originalValue = state.originalParams[equipmentId]?.[paramName];

      // If new value equals original, remove from edited params
      if (originalValue !== undefined && newValue === originalValue) {
        const { [paramName]: removed, ...restParams } =
          state.editedParams[equipmentId] || {};
        const updatedEquipmentParams =
          Object.keys(restParams).length > 0 ? restParams : undefined;

        const newEditedParams = { ...state.editedParams };
        if (updatedEquipmentParams) {
          newEditedParams[equipmentId] = updatedEquipmentParams;
        } else {
          delete newEditedParams[equipmentId];
        }

        return {
          editedParams: newEditedParams,
          hasUnsavedChanges: Object.keys(newEditedParams).length > 0,
        };
      }

      // Otherwise, track the edit
      const newEditedParams = {
        ...state.editedParams,
        [equipmentId]: {
          ...(state.editedParams[equipmentId] || {}),
          [paramName]: newValue,
        },
      };

      return {
        editedParams: newEditedParams,
        hasUnsavedChanges: true,
      };
    });
  },

  /**
   * Set validation error for a parameter
   * @param {string} equipmentId - Equipment identifier
   * @param {string} paramName - Parameter name
   * @param {string|null} errorMessage - Error message or null to clear
   */
  setValidationError: (equipmentId, paramName, errorMessage) => {
    set((state) => {
      if (!errorMessage) {
        // Clear error
        const { [paramName]: removed, ...restErrors } =
          state.validationErrors[equipmentId] || {};
        const updatedEquipmentErrors =
          Object.keys(restErrors).length > 0 ? restErrors : undefined;

        const newValidationErrors = { ...state.validationErrors };
        if (updatedEquipmentErrors) {
          newValidationErrors[equipmentId] = updatedEquipmentErrors;
        } else {
          delete newValidationErrors[equipmentId];
        }

        return { validationErrors: newValidationErrors };
      }

      // Set error
      return {
        validationErrors: {
          ...state.validationErrors,
          [equipmentId]: {
            ...(state.validationErrors[equipmentId] || {}),
            [paramName]: errorMessage,
          },
        },
      };
    });
  },

  /**
   * Validate a parameter value against constraints
   * @param {string} equipmentId - Equipment identifier
   * @param {string} paramName - Parameter name
   * @param {number} value - Value to validate
   * @param {object} constraints - { min, max, type }
   * @returns {string|null} - Error message or null if valid
   */
  validateParameter: (equipmentId, paramName, value, constraints = {}) => {
    const { min, max } = constraints;

    // Check if value is a valid number
    if (isNaN(value) || value === null || value === undefined) {
      const error = "Invalid number";
      get().setValidationError(equipmentId, paramName, error);
      return error;
    }

    // Check minimum constraint
    if (min !== undefined && min !== null && value < min) {
      const error = `Below minimum (${min})`;
      get().setValidationError(equipmentId, paramName, error);
      return error;
    }

    // Check maximum constraint
    if (max !== undefined && max !== null && value > max) {
      const error = `Exceeds maximum (${max})`;
      get().setValidationError(equipmentId, paramName, error);
      return error;
    }

    // Valid - clear any existing error
    get().setValidationError(equipmentId, paramName, null);
    return null;
  },

  /**
   * Reset all edits for a specific equipment
   * @param {string} equipmentId - Equipment identifier
   */
  resetEquipment: (equipmentId) => {
    set((state) => {
      const newEditedParams = { ...state.editedParams };
      delete newEditedParams[equipmentId];

      const newValidationErrors = { ...state.validationErrors };
      delete newValidationErrors[equipmentId];

      return {
        editedParams: newEditedParams,
        validationErrors: newValidationErrors,
        hasUnsavedChanges: Object.keys(newEditedParams).length > 0,
      };
    });
  },

  /**
   * Reset all edits across all equipment
   */
  resetAll: () => {
    set({
      editedParams: {},
      validationErrors: {},
      hasUnsavedChanges: false,
    });
  },

  /**
   * Get list of equipment IDs that have been edited
   * @returns {string[]} - Array of equipment IDs with changes
   */
  getEditedEquipmentIds: () => {
    return Object.keys(get().editedParams);
  },

  /**
   * Get edited equipment with their changed parameters
   * @returns {Array<{id: string, params: object}>}
   */
  getEditedEquipment: () => {
    const { editedParams } = get();
    return Object.entries(editedParams).map(([id, params]) => ({
      id,
      params,
    }));
  },

  /**
   * Check if any validation errors exist
   * @returns {boolean}
   */
  hasValidationErrors: () => {
    const { validationErrors } = get();
    return Object.keys(validationErrors).some(
      (equipmentId) => Object.keys(validationErrors[equipmentId]).length > 0
    );
  },

  /**
   * Get count of edited equipment
   * @returns {number}
   */
  getEditedCount: () => {
    return Object.keys(get().editedParams).length;
  },

  /**
   * Get current value for a parameter (edited or original)
   * @param {string} equipmentId - Equipment identifier
   * @param {string} paramName - Parameter name
   * @returns {number|undefined}
   */
  getParameterValue: (equipmentId, paramName) => {
    const { editedParams, originalParams } = get();
    return (
      editedParams[equipmentId]?.[paramName] ??
      originalParams[equipmentId]?.[paramName]
    );
  },

  /**
   * Check if a specific parameter has been edited
   * @param {string} equipmentId - Equipment identifier
   * @param {string} paramName - Parameter name
   * @returns {boolean}
   */
  isParameterEdited: (equipmentId, paramName) => {
    const { editedParams } = get();
    return editedParams[equipmentId]?.[paramName] !== undefined;
  },
}));

export default useEquipmentStore;
