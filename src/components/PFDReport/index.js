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

// Export utilities (PNG and PDF)
export {
  exportToPNG,
  captureAsDataURL,
  captureAsCanvas,
} from "../../utils/exportPNG";

export { exportToPDF, exportToPDFSinglePage } from "../../utils/exportPDF";
