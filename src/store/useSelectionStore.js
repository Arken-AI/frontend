/**
 * Selection Store
 *
 * Central Zustand store for managing equipment selection and active panel state.
 * Enables bidirectional sync between Canvas, Equipment Browser, and Warnings Panel.
 */

import { create } from "zustand";

const useSelectionStore = create((set, get) => ({
  // State
  selectedEquipmentId: null, // Currently selected equipment ID
  hoveredEquipmentId: null, // Equipment being hovered (for future highlight effects)
  activePanel: "equipment", // Active sidebar panel: 'equipment' | 'warnings' | 'thermo' | 'history'

  // Actions

  /**
   * Select an equipment and auto-switch to Equipment Browser panel
   * @param {string} equipmentId - The equipment ID to select
   */
  selectEquipment: (equipmentId) =>
    set({
      selectedEquipmentId: equipmentId,
      activePanel: "equipment", // Auto-switch to Equipment Browser when selecting
    }),

  /**
   * Clear current selection
   */
  clearSelection: () => set({ selectedEquipmentId: null }),

  /**
   * Set hovered equipment (for future hover effects)
   * @param {string|null} equipmentId - The equipment ID being hovered, or null
   */
  setHoveredEquipment: (equipmentId) =>
    set({ hoveredEquipmentId: equipmentId }),

  /**
   * Switch active sidebar panel
   * @param {string} panel - Panel ID: 'equipment' | 'warnings' | 'thermo' | 'history'
   */
  setActivePanel: (panel) => set({ activePanel: panel }),

  /**
   * Toggle equipment selection (select if not selected, deselect if already selected)
   * @param {string} equipmentId - The equipment ID to toggle
   */
  toggleEquipment: (equipmentId) => {
    const { selectedEquipmentId } = get();
    if (selectedEquipmentId === equipmentId) {
      set({ selectedEquipmentId: null });
    } else {
      set({ selectedEquipmentId: equipmentId, activePanel: "equipment" });
    }
  },
}));

export default useSelectionStore;
