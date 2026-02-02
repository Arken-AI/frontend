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

// Future exports (Phase 4):
// export { default as PFDReportModal } from './PFDReportModal';
// export { default as ExportWrapper } from './ExportWrapper';
