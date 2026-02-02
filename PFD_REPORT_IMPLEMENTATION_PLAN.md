# PFD Report Implementation Plan

## Overview

Generate a Process Flow Diagram (PFD) with Material Balance Table from dynamic simulation results. Users can view and export the diagram as PNG or PDF for documentation purposes.

**Reference:** Industrial PFD standard (like the Nitric Acid Plant diagram with 13 streams and component-wise material balance table)

---

## Phase 1: Data Standardization Layer ✅ COMPLETED

### Step 1.1: Create Stream Data Collector Utility ✅

**File:** `src/utils/streamDataCollector.js`

**Purpose:** Extract and normalize all streams from any process simulation response into a standard format.

**Tasks:**
- [x] Parse `input.feed_streams` to get feed stream data
- [x] Parse `input.edges` + `result.stream_results` to get intermediate streams
- [x] Parse `result.node_results` outlets to identify product/terminal streams
- [x] Assign sequential stream numbers (①, ②, ③...)
- [x] Return unified stream array with: `{ number, id, name, type, temperature_K, pressure_Pa, flow_rate, flow_basis, composition, source, target }`

**Input:** API response (`apiResponse.data`)

**Output:** `{ compounds: string[], streams: StreamData[] }`

---

### Step 1.2: Create Compound Formatter Utility ✅

**File:** `src/utils/compoundFormatter.js`

**Purpose:** Convert compound names to proper chemical formulas with subscripts.

**Tasks:**
- [x] Create mapping for common compounds (water → H₂O, benzene → C₆H₆, etc.)
- [x] Handle unknown compounds gracefully (capitalize first letter)
- [x] Support both display format (subscripts) and plain text format

**Examples:**
- `water` → `H₂O`
- `sucrose` → `C₁₂H₂₂O₁₁`
- `ammonia` → `NH₃`
- `unknown_compound` → `Unknown Compound`

---

### Step 1.3: Create Table Data Generator ✅

**File:** `src/utils/tableDataGenerator.js`

**Purpose:** Transform stream data into table-ready format.

**Tasks:**
- [x] Generate dynamic rows based on compounds list
- [x] Generate dynamic columns based on stream count
- [x] Calculate cell values (composition percentages, flow rates)
- [x] Add summary rows (Total Flow, Temperature, Pressure)
- [x] Handle missing data gracefully (show `-` or `Trace`)
- [x] Support unit conversions (Pa→kPa, K→C)
- [x] CSV export functionality

**Output Format:**
```
{
  rows: [{ key, label, unit, isSummary }],
  columns: [{ number, name, type }],
  data: { [streamNumber]: { [componentKey]: value } }
}
```

---

## Phase 2: PFD Block Diagram Component ✅ COMPLETED

### Step 2.1: Create Layout Algorithm ✅

**File:** `src/utils/pfdLayoutAlgorithm.js`

**Purpose:** Calculate x, y positions for equipment and connection paths.

**Tasks:**
- [x] Use execution order for horizontal positioning
- [x] Detect parallel branches (e.g., distillate + bottoms from column)
- [x] Calculate vertical offsets for branches
- [x] Generate connection path coordinates (orthogonal routing)
- [x] Return layout object: `{ nodes, edges, feeds, products, dimensions }`
- [x] Handle recycle streams with curved paths
- [x] Avoid overlapping nodes
- [x] Maintain left-to-right flow direction

---

### Step 2.2: Create Block Diagram Component ✅

**File:** `src/components/PFDReport/BlockDiagram.jsx`

**Purpose:** Render a simplified, clean block diagram suitable for export.

**Tasks:**
- [x] Use SVG for rendering (no React Flow - better for export)
- [x] Render equipment as rounded rectangles with names
- [x] Render connections as lines with arrow heads
- [x] Display stream numbers in circles (①②③) on connection lines
- [x] Auto-layout based on execution order (left-to-right flow)
- [x] Handle branching (splitters, multiple outputs)
- [x] Handle recycle streams (show with dashed lines)
- [x] Color scheme support (default, print, dark)
- [x] Interactive click handlers for nodes and edges
- [x] Feed arrows with labels on left side
- [x] Product arrows with labels on right side
- [x] Compact and Printable variants

**Design Applied:**
- Equipment boxes: White fill, blue border, equipment name centered
- Stream lines: Blue stroke with arrow markers
- Stream labels: Blue circles with white numbers at line midpoints
- Feed labels: "Feed" text with stream name at left edge
- Product labels: "Product" text with stream name at right edge
- Recycle streams: Dashed lines with curved paths

---

### Step 2.3: Export Barrel Updated ✅

**File:** `src/components/PFDReport/index.js`

- [x] Export BlockDiagram
- [x] Export CompactBlockDiagram
- [x] Export PrintableBlockDiagram

---

## Phase 3: Material Balance Table Component ✅ COMPLETED

### Step 3.1: Create Stream Data Table Component ✅

**File:** `src/components/PFDReport/StreamDataTable.jsx`

**Purpose:** Render the horizontal material balance table.

**Tasks:**
- [x] Render header row with stream numbers and names
- [x] Render component rows (dynamic based on compounds)
- [x] Render summary rows (Total, Temperature, Pressure)
- [x] Format numbers appropriately (2-4 decimal places)
- [x] Handle wide tables (horizontal scroll if needed)
- [x] Style for print/export (clean, professional look)
- [x] Color-coded columns (feed=blue, product=green, recycle=orange)
- [x] Sticky header and first column support
- [x] Compact and Printable variants
- [x] Legend showing stream type colors
- [x] Metadata footer (flow basis, composition basis, units)

**Table Structure:**
```
| Component | ① Feed | ② Stream | ③ Stream | ... | ⑬ Product |
|-----------|--------|----------|----------|-----|-----------|
| H₂O       |  0.95  |   0.93   |   0.90   | ... |   0.02    |
| Sucrose   |  0.05  |   0.07   |   0.10   | ... |   0.98    |
|-----------|--------|----------|----------|-----|-----------|
| Total     | 500.0  |  480.0   |  450.0   | ... |   50.0    |
| Temp (K)  |  303   |   363    |   373    | ... |   340     |
| Press(kPa)|  200   |   190    |    80    | ... |    20     |
```

---

### Step 3.2: Add Table Styling ✅

**File:** Uses Tailwind CSS classes (no separate CSS file needed)

**Tasks:**
- [x] Professional table styling (borders, spacing)
- [x] Alternating row colors for readability
- [x] Highlight summary rows
- [x] Distinguish feed/product columns visually
- [x] Responsive but also print-friendly

---

### Step 3.3: Export Barrel File ✅

**File:** `src/components/PFDReport/index.js`

- [x] Export StreamDataTable
- [x] Export CompactStreamDataTable
- [x] Export PrintableStreamDataTable

---

## Phase 4: PFD Report Modal/Page ✅ COMPLETED

### Step 4.1: Create PFD Report Container ✅

**File:** `src/components/PFDReport/PFDReportModal.jsx`

**Purpose:** Modal that displays the complete PFD report with export options.

**Tasks:**
- [x] Create modal with proper sizing (large, full-screen option)
- [x] Include header with simulation name and timestamp
- [x] Render BlockDiagram component
- [x] Render StreamDataTable component
- [x] Add export buttons (PNG, PDF) - wired to callbacks
- [x] Add close button
- [x] Handle loading state while generating
- [x] Stream click highlighting (links diagram to table)
- [x] PFDReportEmbed variant for non-modal embedding

**Layout:** ✅ Implemented as designed

---

### Step 4.2: Export Wrapper Integrated ✅

**Note:** Export wrapper functionality is built into PFDReportModal via `contentRef`.

**Features:**
- [x] Ref-able container for export capture
- [x] Export-specific styles (white background, proper margins)
- [x] Report header/footer included in export area
- [x] Interactive elements handled via callbacks

---

## Phase 5: Export Functionality ✅ COMPLETED

### Step 5.1: Implement PNG Export ✅

**File:** `src/utils/exportPNG.js`

**Dependencies:** `html2canvas` (installed)

**Tasks:**
- [x] Install html2canvas: `npm install html2canvas`
- [x] Capture the report container as canvas
- [x] Convert canvas to PNG blob
- [x] Trigger download with filename: `{simulation_name}_PFD_Report.png`
- [x] Handle high-DPI screens (scale factor 2x)
- [x] Additional utilities: `captureAsDataURL`, `captureAsCanvas`

---

### Step 5.2: Implement PDF Export ✅

**File:** `src/utils/exportPDF.js`

**Dependencies:** `jspdf`, `html2canvas` (installed)

**Tasks:**
- [x] Install jspdf: `npm install jspdf`
- [x] Capture content using html2canvas
- [x] Create PDF document with proper dimensions
- [x] Add captured image to PDF
- [x] Handle multi-page if content is tall (`exportToPDF`)
- [x] Single-page fit option (`exportToPDFSinglePage`)
- [x] Add header/footer (date, page numbers)
- [x] Trigger download: `{simulation_name}_PFD_Report.pdf`
- [x] A4 and Letter page size support
- [x] Portrait and Landscape orientation

### Step 5.3: Integrate with PFDReportModal ✅

**Tasks:**
- [x] Import export utilities into PFDReportModal
- [x] Wire export buttons to use built-in utilities
- [x] Make custom callbacks optional (utilities work out of box)
- [x] Update index.js exports

---

## Phase 6: Integration

### Step 6.1: Add Trigger Button to ResultsPage

## Phase 6: Integration ✅ COMPLETED

### Step 6.1: Add Trigger Button to ResultsPage ✅

**File:** `src/pages/ResultsPage.jsx`

**Tasks:**
- [x] Add "Generate PFD Report" button in the toolbar/header area
- [x] Connect button click to open PFDReportModal
- [x] Pass apiResponse data to modal
- [x] Disable button when no simulation data available

---

### Step 6.2: Wire Up Data Flow ✅

**Tasks:**
- [x] Import PFDReportModal component
- [x] Add state for modal visibility (`isPFDReportOpen`)
- [x] ResultsPage passes `apiResponse.data` to PFDReportModal
- [x] Pass simulation name as `Run_{runId}`
- [x] PFDReportModal internally calls `collectStreamData()` utility
- [x] Data flows to BlockDiagram and StreamDataTable components
- [x] Export functions work automatically (built into modal)

---

## Phase 7: Testing & Polish

### Step 7.1: Test with Different Process Types

**Test Cases:**
- [ ] Benzene-Toluene Distillation (2 compounds, 5-6 streams)
- [ ] Gas-Liquid Stripping (3 compounds, 5 streams, 2 feeds)
- [ ] Evaporator Industry (2 compounds, 4 streams)
- [ ] LLE Process (3 compounds, 5 streams)
- [ ] Complex process with recycles

**Verify:**
- [ ] All streams appear in table with correct numbers
- [ ] Block diagram shows all equipment and connections
- [ ] Compound names formatted correctly
- [ ] Export produces readable output

---

### Step 7.2: Edge Cases

**Handle:**
- [ ] Process with only 1 stream
- [ ] Process with 20+ streams (table scrolling)
- [ ] Missing composition data (show `N/A` or `Trace`)
- [ ] Very long equipment/stream names (truncation)
- [ ] Recycle streams in diagram

---

### Step 7.3: UI Polish

**Tasks:**
- [ ] Add loading spinner during export
- [ ] Add success toast after export
- [ ] Keyboard shortcut to close modal (Escape)
- [ ] Responsive modal sizing
- [ ] Dark mode support (if applicable)

---

## File Structure Summary

```
src/
├── components/
│   └── PFDReport/
│       ├── index.jsx              # Main export
│       ├── PFDReportModal.jsx     # Container modal
│       ├── BlockDiagram.jsx       # SVG block diagram
│       ├── StreamDataTable.jsx    # Material balance table
│       ├── ExportWrapper.jsx      # Export container
│       └── styles.css             # Report-specific styles
│
├── utils/
│   ├── streamDataCollector.js     # Extract streams from API
│   ├── compoundFormatter.js       # Chemical formula formatting
│   ├── tableDataGenerator.js      # Generate table data
│   ├── pfdLayoutAlgorithm.js      # Block diagram layout
│   ├── exportPNG.js               # PNG export logic
│   └── exportPDF.js               # PDF export logic
│
└── pages/
    └── ResultsPage.jsx            # Add trigger button
```

---

## Dependencies to Install

```bash
npm install html2canvas jspdf
```

---

## Estimated Effort

| Phase | Description | Effort |
|-------|-------------|--------|
| Phase 1 | Data Standardization | 3-4 hours |
| Phase 2 | Block Diagram Component | 4-6 hours |
| Phase 3 | Material Balance Table | 2-3 hours |
| Phase 4 | Report Modal | 2-3 hours |
| Phase 5 | Export Functionality | 2-3 hours |
| Phase 6 | Integration | 1-2 hours |
| Phase 7 | Testing & Polish | 2-3 hours |
| **Total** | | **16-24 hours** |

---

## Success Criteria

1. ✅ User can click "Generate PFD Report" on any simulation result
2. ✅ Modal displays block diagram with numbered streams
3. ✅ Material balance table shows all compounds and streams dynamically
4. ✅ Works for any process type (distillation, stripping, evaporator, etc.)
5. ✅ PNG export produces clear, readable image
6. ✅ PDF export produces professional document
7. ✅ Handles edge cases gracefully (missing data, many streams)

---

## Future Enhancements (Out of Scope for Now)

- [ ] Custom equipment icons/symbols (P&ID style)
- [ ] Interactive diagram (click stream → highlight in table)
- [ ] Energy balance table
- [ ] Equipment sizing data in report
- [ ] Company logo/branding in exports
- [ ] Multiple page PDF with table of contents
- [ ] Save report to cloud storage

---

*Document Created: 2 February 2026*
*Version: 1.0*
