/**
 * PFD Report Components
 *
 * Export barrel for all PFD Report related components.
 */

// Stream Data Table
export {
  default as StreamDataTable,
  CompactStreamDataTable,
  PrintableStreamDataTable,
} from "./StreamDataTable";

// Block Diagram (SVG-based PFD)
export {
  default as BlockDiagram,
  CompactBlockDiagram,
  PrintableBlockDiagram,
} from "./BlockDiagram";

// PFD Report Modal (container combining diagram + table)
export { default as PFDReportModal, PFDReportEmbed } from "./PFDReportModal";

// Future exports (Phase 5):
// export { exportToPNG } from '../../utils/exportPNG';
// export { exportToPDF } from '../../utils/exportPDF';
