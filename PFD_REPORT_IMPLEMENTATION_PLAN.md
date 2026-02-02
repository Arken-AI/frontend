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

## Phase 2: PFD Block Diagram Component

### Step 2.1: Create Simple Block Diagram Component

**File:** `src/components/PFDReport/BlockDiagram.jsx`

**Purpose:** Render a simplified, clean block diagram suitable for export.

**Tasks:**
- [ ] Use SVG or HTML/CSS for rendering (no React Flow - too complex for export)
- [ ] Render equipment as simple rectangles with names
- [ ] Render connections as lines with arrow heads
- [ ] Display stream numbers in circles (①②③) on connection lines
- [ ] Auto-layout based on execution order (left-to-right flow)
- [ ] Handle branching (splitters, multiple outputs)
- [ ] Handle recycle streams (show with different line style)

**Design Decisions:**
- Equipment boxes: White fill, black border, equipment name centered
- Stream lines: Black, 1-2px stroke, with arrow markers
- Stream labels: Circled numbers positioned at midpoint of lines
- Feed labels: Show "Feed" text at left edge
- Product labels: Show "Product" text at right edge

---

### Step 2.2: Create Layout Algorithm

**File:** `src/utils/pfdLayoutAlgorithm.js`

**Purpose:** Calculate x, y positions for equipment and connection paths.

**Tasks:**
- [ ] Use execution order for horizontal positioning
- [ ] Detect parallel branches (e.g., distillate + bottoms from column)
- [ ] Calculate vertical offsets for branches
- [ ] Generate connection path coordinates (orthogonal routing)
- [ ] Return layout object: `{ nodes: [{id, x, y, width, height}], edges: [{...}] }`

**Constraints:**
- Maintain left-to-right flow direction
- Avoid overlapping nodes
- Keep stream lines from crossing when possible

---

## Phase 3: Material Balance Table Component

### Step 3.1: Create Stream Data Table Component

**File:** `src/components/PFDReport/StreamDataTable.jsx`

**Purpose:** Render the horizontal material balance table.

**Tasks:**
- [ ] Render header row with stream numbers and names
- [ ] Render component rows (dynamic based on compounds)
- [ ] Render summary rows (Total, Temperature, Pressure)
- [ ] Format numbers appropriately (2-4 decimal places)
- [ ] Handle wide tables (horizontal scroll if needed)
- [ ] Style for print/export (clean, professional look)

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

### Step 3.2: Add Table Styling

**File:** `src/components/PFDReport/StreamDataTable.css` (or Tailwind classes)

**Tasks:**
- [ ] Professional table styling (borders, spacing)
- [ ] Alternating row colors for readability
- [ ] Highlight summary rows
- [ ] Distinguish feed/product columns visually
- [ ] Responsive but also print-friendly

---

## Phase 4: PFD Report Modal/Page

### Step 4.1: Create PFD Report Container

**File:** `src/components/PFDReport/PFDReportModal.jsx`

**Purpose:** Modal that displays the complete PFD report with export options.

**Tasks:**
- [ ] Create modal with proper sizing (large, possibly full-screen option)
- [ ] Include header with simulation name and timestamp
- [ ] Render BlockDiagram component
- [ ] Render StreamDataTable component
- [ ] Add export buttons (PNG, PDF)
- [ ] Add close button
- [ ] Handle loading state while generating

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  PFD Report: [Simulation Name]              [✕] Close      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PROCESS FLOW DIAGRAM                    │   │
│  │    [Block Diagram with Stream Numbers]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MATERIAL BALANCE TABLE                  │   │
│  │    [Dynamic Table with All Streams]                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [📷 Download PNG]  [📄 Download PDF]                       │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 4.2: Create Export Wrapper Component

**File:** `src/components/PFDReport/ExportWrapper.jsx`

**Purpose:** Wrapper component that captures content for export.

**Tasks:**
- [ ] Wrap diagram and table in a ref-able container
- [ ] Apply export-specific styles (white background, proper margins)
- [ ] Handle page sizing for PDF (A4 or Letter)
- [ ] Remove interactive elements before capture

---

## Phase 5: Export Functionality

### Step 5.1: Implement PNG Export

**File:** `src/utils/exportPNG.js`

**Dependencies:** `html2canvas`

**Tasks:**
- [ ] Install html2canvas: `npm install html2canvas`
- [ ] Capture the report container as canvas
- [ ] Convert canvas to PNG blob
- [ ] Trigger download with filename: `{simulation_name}_PFD_Report.png`
- [ ] Handle high-DPI screens (scale factor)

---

### Step 5.2: Implement PDF Export

**File:** `src/utils/exportPDF.js`

**Dependencies:** `jspdf`, `html2canvas`

**Tasks:**
- [ ] Install jspdf: `npm install jspdf`
- [ ] Capture content using html2canvas
- [ ] Create PDF document with proper dimensions
- [ ] Add captured image to PDF
- [ ] Handle multi-page if content is tall
- [ ] Add header/footer (optional: date, page numbers)
- [ ] Trigger download: `{simulation_name}_PFD_Report.pdf`

---

## Phase 6: Integration

### Step 6.1: Add Trigger Button to ResultsPage

**File:** `src/pages/ResultsPage.jsx`

**Tasks:**
- [ ] Add "Generate PFD Report" button in the toolbar/header area
- [ ] Connect button click to open PFDReportModal
- [ ] Pass apiResponse data to modal

---

### Step 6.2: Wire Up Data Flow

**Tasks:**
- [ ] ResultsPage passes `apiResponse.data` to PFDReportModal
- [ ] PFDReportModal calls `collectStreamData()` utility
- [ ] Data flows to BlockDiagram and StreamDataTable components
- [ ] Export functions receive the report container ref

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
