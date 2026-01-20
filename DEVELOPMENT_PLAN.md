# ARKEN AI Frontend - Development Plan

**Version**: 3.0.0 | **Created**: 16 January 2026 | **Updated**: 17 January 2026 | **Status**: Ready for Implementation

---

## 1. Project Overview

### 1.1 Purpose

Build a modern, interactive UI for the ARKEN AI process simulation platform. The frontend enables users to:

- Start with AI chat for requirement gathering and initial simulation
- Navigate to Results Viewer after first successful simulation
- Visualize process flowsheets with equipment and streams
- Edit equipment parameters with real-time validation
- Run simulations and view results with smooth transitions
- Continue AI interaction within the Results Viewer context
- Compare and manage simulation runs with URL-based navigation

### 1.2 Application Architecture

**Two-Page Application Flow:**

```
┌───────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Chat Interface (localhost:5173/)                                 │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ User: "I want to simulate a sugar mill with 5000 TCD"                │ │
│ │ AI: Collects requirements, validates parameters...                   │ │
│ │ AI: Running simulation...                                            │ │
│ │ AI: ✅ Simulation complete!                                          │ │
│ │      [View Detailed Results →] button appears                        │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
                              ↓
                    User clicks [View Results]
                              ↓
┌───────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Results Viewer (localhost:5173/results/:runId)                   │
│ ┌────┬──────────────────────────────────┬─────────────────────────────┐  │
│ │ [≡]│ LEFT: Equipment Details          │ RIGHT: Contextual Chat      │  │
│ │ E  │ ┌─────────────────────────────┐  │                             │  │
│ │ S  │ │ Mill 1                      │  │ Continue conversation       │  │
│ │ P  │ │ - Imbibition: 25%          │  │ about this run              │  │
│ │    │ └─────────────────────────────┘  │                             │  │
│ │    │                                  │ "Why is extraction          │  │
│ │    │ MIDDLE: Flowsheet Diagram        │  only 96%?"                 │  │
│ │    │ ┌─────────────────────────────┐  │                             │  │
│ │    │ │ [Feed]→[Mill]→[Evap]       │  │                             │  │
│ │    │ │          ↓                 │  │                             │  │
│ │    │ │     [Product]              │  │                             │  │
│ │    │ └─────────────────────────────┘  │                             │  │
│ └────┴──────────────────────────────────┴─────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

**Key Principles:**
1. Chat-first interaction (existing UI at `/`)
2. Results Viewer opens after successful simulation (`/results/:runId`)
3. URL always reflects current run ID
4. Browser history works for navigation between runs
5. Smooth transitions when switching runs
6. Run data cached in memory for instant switching

### 1.3 Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React 18+ with TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Diagram | React Flow |
| State Management | Zustand |
| Animations | Framer Motion |
| API Client | Fetch with SSE support |
| Layout Algorithm | Dagre (for auto-layout) |

### 1.4 Backend Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Calculation Engine | 8000 | Physics simulations, equipment calculations |
| Backend (Chat) | 8001 | AI chat with SSE streaming, MCP orchestration |
| MCP Server | stdio | Tool execution (called by backend) |

### 1.5 Route Structure

| Route | Component | Purpose |
|-------|-----------|--------|
| `/` | `ChatPage` | Existing chat interface (unchanged) |
| `/results/:runId` | `ResultsPage` | 3-panel results viewer (new) |

### 1.6 Integration Points

**Chat → Results Navigation:**
- After successful simulation, AI response includes `[View Results]` button
- Button links to `/results/{run_id}`
- Optional: Header button "View Results" enabled when ≥1 run exists

**Results → New Simulation:**
- User edits parameters or requests via chat
- New simulation generates new `run_id`
- URL updates smoothly: `/results/run-001` → `/results/run-002`
- Browser back button returns to previous run
- Run history dropdown allows switching between runs

---

## 2. UI Layout Architecture

### 2.1 Results Viewer Layout (3-Panel)

This layout is used for `/results/:runId` page:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ARKEN AI Results    [Run: run-003 ▼]    [← Back to Chat]    [Simulate]             │
├────┬─────────────────────┬────────────────────────────────┬─────────────────────────┤
│ A  │                     │                                │                         │
│ c  │   LEFT PANEL        │      MIDDLE PANEL              │     RIGHT PANEL         │
│ t  │   (Sidebar)         │      (Flowsheet Canvas)        │     (Chat)              │
│ i  │                     │                                │                         │
│ v  │   - Equipment       │   [Equipment Nodes]            │   [Message List]        │
│ i  │     Browser         │         │                      │                         │
│ t  │   - Details         │   [Stream Edges]               │   [Input Field]         │
│ y  │   - Thermo          │         │                      │                         │
│    │   - Warnings        │   [Selection Highlight]        │   [Send Button]         │
│ B  │   - Run History     │                                │                         │
│ a  │                     │                                │                         │
│ r  │                     │                                │                         │
└────┴─────────────────────┴────────────────────────────────┴─────────────────────────┘
```

### 2.2 Header Bar Components

| Component | Description | Behavior |
|-----------|-------------|----------|
| Logo/Title | "ARKEN AI Results" | Click to go home |
| Run Selector | Dropdown: "Run: run-003 ▼" | Switch between cached runs |
| Back to Chat | "← Back to Chat" link | Navigate to `/` |
| Simulate Button | Primary action button | Run simulation with current params |

### 2.3 Panel Behavior

| Panel | Resizable | Collapsible | Min Width | Default Width |
|-------|-----------|-------------|-----------|---------------|
| Activity Bar | No | No | 48px | 48px |
| Left Sidebar | Yes | Yes | 200px | 300px |
| Middle Canvas | Yes | No | 400px | Flex |
| Right Chat | Yes | Yes | 280px | 350px |

### 2.4 Activity Bar Sections

| Icon | Section | Description |
|------|---------|-------------|
| 📁 | Equipment Browser | Tree view of all equipment in flowsheet |
| 📋 | Details | Selected item's inputs, outputs, streams |
| 🌡️ | Thermodynamics | Property package info, compound data |
| ⚠️ | Warnings | Simulation warnings and errors |
| 📊 | Run History | List of simulation runs with status |

---

## 3. Core Features

### 3.1 Flowsheet Diagram

**Display:**
- Equipment rendered as custom nodes with icons and status indicators
- Feed nodes rendered as visible input sources on left side
- Product nodes rendered as visible output sinks on right side
- Streams rendered as directed edges with labels
- Ports (connection points) visible as small circles on equipment nodes
- Left-to-right flow direction by default
- Dashed line style for edges (matching design reference)
- Grid background with dotted pattern

**Node Types:**
| Type | Description | Position |
|------|-------------|----------|
| `feed` | Input source nodes | Left edge of canvas |
| `equipment` | Processing equipment | Center of canvas |
| `product` | Output sink nodes | Right edge of canvas |

**Port Positions:**
| Position Value | Location |
|----------------|----------|
| `left-top` | Left side, upper 25% |
| `left` | Left side, centered |
| `left-bottom` | Left side, lower 25% |
| `right-top` | Right side, upper 25% |
| `right` | Right side, centered |
| `right-bottom` | Right side, lower 25% |

**Interaction:**
- Click equipment → Select and show details in left panel
- Click stream → Select and show stream properties
- Hover stream → Tooltip with flow rate, temperature
- Zoom in/out with mouse wheel or controls
- Pan by dragging canvas
- Minimap for navigation on large flowsheets

**Editing (Phase 6):**
- Drag equipment to rearrange (when unlocked)
- Lock/unlock toggle in toolbar (default: locked)
- Auto-layout button for automatic positioning
- Reset layout to restore original positions
- Drag from port to port to create connections

**Edge Routing:**
- Simple connections: Straight lines when source/target Y are same
- Complex connections: Use waypoints from JSON for orthogonal routing
- Waypoints create right-angle turns (horizontal → vertical → horizontal)
- Multiple ports: Distribute evenly on node side, connect each with dedicated edge

### 3.2 Equipment Details Panel

**Inputs Section (Editable):**
- Dynamic form generated from simulation request data (included in run)
- Each field shows:
  - Label with unit
  - Editable input control (number, select, etc.)
  - Constraint range displayed below (e.g., "Range: 2.0 - 10.0 RPM")
  - Warning indicator when at constraint limit
- Input validation:
  - Enforce min/max constraints (user cannot enter values beyond constraints)
  - Type validation (numbers only for numeric fields)
  - Required field validation

**Outputs Section (Read-only):**
- Data from `result.node_results[id].outlets`
- Each outlet stream shows: flow_rate, temperature_K, composition
- Formatted with appropriate precision and units
- Updates when run data changes

**Metadata/KPIs Section (Read-only):**
- Data from `result.node_results[id].metadata`
- Equipment-specific calculated values (e.g., heat_duty, efficiency)
- Balance closures (mass_balance_closure_pct, energy_balance_closure_pct)

**Connected Streams:**
- Data from `topology.nodes[].ports`
- List of inlet streams (port name + edge label)
- List of outlet streams (port name + edge label)
- Click stream name to view stream details

### 3.3 Stream Details

When a stream is selected (from `result.stream_results[id].stream_data`):
- Stream label (from `topology.edges[].label`)
- Stream type (feed, process, product, recycle)
- Flow rate (kg/hr or kmol/hr)
- Flow basis (mass or molar)
- Temperature (K or °C)
- Pressure (Pa or bar)
- Phase (vapor, liquid, solid, two-phase)
- Composition breakdown by component (with percentages)
- Connection info (source node/port → target node/port)

### 3.4 Simulation Workflow

**Trigger Methods:**
1. Manual: Click "Simulate" button after editing parameters
2. Chat: AI triggers simulation via tool call

**Simulation Flow with Smooth Transitions:**

```
User clicks "Simulate"
      ↓ (immediate - 0ms)
Button shows spinner, disables
Progress overlay appears on diagram
      ↓ (real-time via SSE)
Progress updates: "Running mass balance..." 15% → 45% → 95%
      ↓ (simulation completes)
New run_id generated by backend
      ↓ (150ms fade)
Current results fade out
      ↓ (0ms - instant)
URL changes: /results/run-001 → /results/run-002
Browser history entry created
      ↓ (100ms)
New data loads into stores (often cached)
      ↓ (200ms fade-in)
New equipment params appear
New diagram renders
Stream results populate
      ↓ (300ms total transition)
User sees new results
Run selector shows updated list
```

**Loading States:**

| State | Visual |
|-------|--------|
| Idle | Normal UI |
| Loading | Progress bar + "Simulating..." overlay |
| Transitioning | Fade out → skeleton → fade in |
| Error | Error toast + message in warnings panel |

### 3.5 Run History & URL Management

**Dropdown Display:**
```
Run: [run_20260116_143052 ▼]
     ├─ run_20260116_143052 ✅  (current)
     ├─ run_20260116_142830 ✅
     ├─ run_20260116_141505 ⚠️  (warnings)
     └─ run_20260116_140012 ❌  (failed)
```

**URL-Based Navigation:**

| Action | URL Change | History |
|--------|------------|--------|
| Initial load | `/results/run-001` | Entry point |
| New simulation | `/results/run-001` → `/results/run-002` | Push (back works) |
| Select from dropdown | `/results/run-002` → `/results/run-001` | Push (back works) |
| Browser back | `/results/run-002` → `/results/run-001` | Pop |
| Direct URL entry | `/results/run-003` | Replace |

**Run Data Caching:**
```typescript
// In-memory cache for instant switching
const runCache = new Map<string, SimulationRun>();

// When user switches runs:
1. Check cache first → instant display (no loading)
2. If not cached → show skeleton → fetch → cache → display
3. Cache limited to last 10 runs (LRU eviction)
```

**Behavior:**
- Shows recent runs with status icons
- Selecting a run updates URL and loads that run's data
- Current run clearly marked (from URL param)
- Failed runs show error indicator
- Browser back/forward buttons work correctly
- Cached runs switch instantly (no network delay)

### 3.6 Chat Interface

**Display:**
- Message list with user/AI message distinction
- Streaming text display as AI responds
- Thinking/tool execution indicators
- Auto-scroll to latest message

**Capabilities:**
- Update equipment parameters ("Set mill speed to 6 RPM")
- Trigger simulations ("Run the simulation")
- Query results ("What's the extraction efficiency?")
- Add/remove equipment ("Add a heater after the mill")
- General questions about the process

**SSE Events Handled:**
| Event | UI Response |
|-------|-------------|
| `thinking.start` | Show thinking indicator |
| `thinking.end` | Hide thinking indicator |
| `tool.start` | Show tool name being executed |
| `tool.end` | Update UI if parameter changed |
| `message.delta` | Append text to current message |
| `message.final` | Finalize message display |
| `run.status` | Update run indicator |
| `run.progress` | Show progress percentage |

### 3.7 Validation Behavior

**Input Constraints:**
- Range constraints: Cannot type values outside min/max
- Type constraints: Numeric fields reject non-numeric input
- Required fields: Visual indicator, block simulation if empty

**Visual Feedback:**
- Valid input: Normal border
- At limit: Warning-colored border and constraint text
- Invalid: Red border (if somehow bypassed)

**Constraint Display:**
- Always visible below input field
- Muted text showing "Range: X - Y unit"
- Becomes warning-colored when at limit

---

## 4. State Management

### 4.1 Store Structure

| Store | Purpose |
|-------|---------|
| `flowsheetStore` | Equipment nodes, stream edges, positions |
| `selectionStore` | Currently selected equipment/stream |
| `runStore` | Current run, run history, run cache, pending changes, transition state |
| `chatStore` | Message history, streaming state |
| `uiStore` | Panel sizes, active sidebar section, loading states |

### 4.2 Run Store Details

```typescript
interface RunStore {
  // Current state
  currentRunId: string;
  runHistory: string[];
  runCache: Map<string, SimulationRun>; // Cached run data
  
  // Transition state
  transitionState: 'idle' | 'loading' | 'transitioning' | 'error';
  loadingProgress: number; // 0-100
  loadingMessage: string;
  
  // Pending changes
  pendingChanges: Map<string, any>; // Parameter changes not yet simulated
  hasUnsavedChanges: boolean;
  
  // Actions
  setCurrentRun: (runId: string) => void;
  addRun: (runId: string, data: SimulationRun) => void;
  switchRun: (runId: string) => Promise<void>;
  startSimulation: () => Promise<string>; // Returns new runId
  updateParameter: (path: string, value: any) => void;
  clearPendingChanges: () => void;
}
```

### 4.3 Data Flow with Transitions

```
User Action (edit/click/chat)
        │
        ▼
    Store Update
        │
        ├──────────────────┐
        ▼                  ▼
  Left Panel Update   Diagram Update
        │                  │
        └──────────────────┘
                │
                ▼
        (If Simulate clicked)
                │
                ▼
    transitionState = 'loading'
        Show progress overlay
                │
                ▼
          API Request (SSE)
          Update progress %
                │
                ▼
          Run Results
          New runId received
                │
                ▼
    transitionState = 'transitioning'
         Fade out current
                │
                ▼
       Update URL (pushState)
       /results/old → /results/new
                │
                ▼
      Cache new run data
      Update runHistory
                │
                ▼
    transitionState = 'idle'
         Fade in new data
                │
        ├───────┼───────┐
        ▼       ▼       ▼
    Outputs  Streams  Warnings
```

---

## 5. API Integration

### 5.1 Simulation Response Structure

The backend returns a comprehensive JSON response with all data needed for the UI:

```
{
  "status": "success" | "error",
  "flowsheet_id": "FS-001",
  
  "result": {
    "converged": true,
    "iterations": 1,
    "max_residual": 0.0,
    "execution_order": ["mixer1", "air_heater", "dryer1"],
    "execution_time_s": 0.045,
    
    "node_results": {
      "<equipment_id>": {
        "state": "calculated" | "pending" | "error",
        "outlets": {
          "<port_name>": {
            "flow_rate": 200.0,
            "temperature_K": 300.65,
            "composition": {"water": 0.15, "salt": 0.85}
          }
        },
        "metadata": { ... equipment-specific KPIs ... },
        "warnings": []
      }
    },
    
    "stream_results": {
      "<edge_id>": {
        "edge_id": "e1",
        "type": "feed" | "process" | "product" | "recycle",
        "source": {"node": "mixer1", "port": "outlet"},
        "target": {"node": "dryer1", "port": "inlet"},
        "stream_data": {
          "flow_rate": 200.0,
          "flow_basis": "mass",
          "temperature_K": 300.65,
          "pressure_Pa": 101325,
          "composition": {"water": 0.15, "salt": 0.85},
          "phase": "solid"
        }
      }
    },
    
    "warnings": [],
    "errors": []
  },
  
  "topology": {
    "nodes": [
      {
        "id": "mixer1",
        "type": "mixer",
        "name": "Salt Mixer",
        "category": "mixing",
        "icon": "merge",
        "ports": {
          "inlet": [{"name": "inlet_1", "edge": "wet_salt_1", "position": "left-top"}],
          "outlet": [{"name": "outlet", "edge": "e1", "position": "right"}]
        },
        "position": {"x": 150, "y": 200, "width": 80, "height": 60},
        "state": "calculated",
        "has_warnings": false,
        "has_errors": false
      }
    ],
    
    "edges": [
      {
        "id": "e1",
        "type": "process",
        "from": {"node": "mixer1", "port": "outlet", "x": 230, "y": 210},
        "to": {"node": "dryer1", "port": "wet_solids", "x": 400, "y": 315},
        "waypoints": [{"x": 300, "y": 210}, {"x": 300, "y": 315}],
        "label": "Mixed Salt",
        "style": {"color": "#4CAF50", "width": 3, "dashed": false}
      }
    ],
    
    "layout": {
      "type": "hierarchical",
      "direction": "left-to-right",
      "node_spacing": 150,
      "rank_spacing": 100,
      "bounds": {"min_x": 0, "min_y": 0, "max_x": 650, "max_y": 500}
    },
    
    "legend": {
      "edge_types": {
        "feed": {"color": "#2196F3", "label": "Feed Stream"},
        "process": {"color": "#4CAF50", "label": "Process Stream"},
        "product": {"color": "#4CAF50", "label": "Product Stream"},
        "recycle": {"color": "#FF5722", "label": "Recycle Stream", "dashed": true}
      },
      "node_states": {
        "calculated": {"color": "#4CAF50", "label": "Calculated"},
        "pending": {"color": "#FFC107", "label": "Pending"},
        "error": {"color": "#F44336", "label": "Error"}
      }
    }
  }
}
```

### 5.2 Data Mapping to UI Components

| UI Component | Data Source |
|--------------|-------------|
| Equipment Browser | `topology.nodes[]` → id, name, type, category |
| Diagram Nodes | `topology.nodes[]` → position, ports, state |
| Diagram Edges | `topology.edges[]` → from, to, waypoints, style |
| Equipment Outputs | `result.node_results[id].outlets` |
| Equipment Metadata | `result.node_results[id].metadata` |
| Stream Details | `result.stream_results[id].stream_data` |
| Warnings Panel | `result.node_results[id].warnings` + `result.warnings` |
| Status Indicators | `topology.nodes[].state`, `has_warnings`, `has_errors` |
| Run Status | `status`, `result.converged`, `result.iterations` |

### 5.3 Calculation Engine Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/simulate/dynamic` | POST | Run flowsheet simulation |
| `/equipment/types` | GET | List available equipment |
| `/equipment/{type}/info` | GET | Get equipment schema |
| `/health` | GET | Health check |

### 5.4 Backend (Chat) Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/chat` | POST | Send chat message (SSE response) |
| `/api/v1/conversations` | GET | List conversations |
| `/api/v1/runs/{run_id}` | GET | Get run details |

### 5.5 Error Handling

| Scenario | UI Response |
|----------|-------------|
| Network error | Toast with retry option |
| Validation error (422) | Inline field errors |
| Simulation error | Error toast + details in warnings panel |
| Chat error | Error message in chat |

---

## 6. Diagram Rendering

### 6.1 JSON to React Flow Transformation

**Node Transformation:**
```
topology.nodes[] → React Flow nodes[]

{
  id: node.id,
  type: "equipmentNode",
  position: { x: node.position.x, y: node.position.y },
  data: {
    name: node.name,
    equipmentType: node.type,
    category: node.category,
    icon: node.icon,
    width: node.position.width,
    height: node.position.height,
    state: node.state,
    hasWarnings: node.has_warnings,
    hasErrors: node.has_errors,
    ports: node.ports
  }
}
```

**Edge Transformation:**
```
topology.edges[] → React Flow edges[]

{
  id: edge.id,
  source: edge.from.node,
  sourceHandle: edge.from.port,
  target: edge.to.node,
  targetHandle: edge.to.port,
  type: "streamEdge",
  label: edge.label,
  data: {
    streamType: edge.type,
    color: edge.style.color,
    width: edge.style.width,
    dashed: edge.style.dashed,
    waypoints: edge.waypoints,
    fromCoords: { x: edge.from.x, y: edge.from.y },
    toCoords: { x: edge.to.x, y: edge.to.y }
  }
}
```

### 6.2 Port Position Calculation

For equipment with multiple ports on same side, distribute evenly:

| Port Count | Position Distribution |
|------------|----------------------|
| 1 port | Center (50%) |
| 2 ports | Top (25%), Bottom (75%) |
| 3 ports | Top (20%), Center (50%), Bottom (80%) |

### 6.3 Edge Routing with Waypoints

**Simple (same Y level):**
```
Start → End (straight line)
```

**With waypoints (different Y levels):**
```
Start → Waypoint1 → Waypoint2 → End (orthogonal segments)

Example:
(230, 210) → (300, 210) → (300, 315) → (400, 315)
    └─ horizontal ──┘└─── vertical ───┘└─ horizontal ─┘
```

### 6.4 Node Styling by State

| State | Border Color | Background |
|-------|--------------|------------|
| `calculated` | Green (#4CAF50) | White |
| `pending` | Yellow (#FFC107) | Light yellow |
| `error` | Red (#F44336) | Light red |
| `has_warnings` | Amber (#FF9800) | White |

---

## 7. Implementation Phases

### Phase 1: Foundation & Layout Shell

**Objective:** Basic 3-panel layout with routing and navigation

**Deliverables:**
- Project configuration (Vite, TypeScript, Tailwind, React Router, Framer Motion)
- Route setup: `/` (existing chat) and `/results/:runId` (new)
- Main app shell with resizable panels
- Header bar with run selector dropdown and navigation
- Activity bar with clickable icons (VS Code style)
- Sidebar sections (placeholder content)
- Panel collapse/expand functionality
- Skeleton loading components
- Basic transition animations

**Acceptance Criteria:**
- [ ] Route `/results/:runId` renders 3-panel layout
- [ ] Route `/` continues to work (existing chat)
- [ ] Header shows run selector dropdown
- [ ] "Back to Chat" link works
- [ ] Layout matches design specification
- [ ] Panels resize smoothly with drag handles
- [ ] Activity bar switches sidebar content
- [ ] Responsive on different screen sizes
- [ ] Skeleton loaders display during data fetch

---

### Phase 2: Flowsheet Diagram (Static)

**Objective:** Display equipment and streams visually from JSON response

**Deliverables:**
- React Flow canvas integration
- Custom equipment node component (rounded rectangle with ports)
- Custom feed/product node components (input/output sources)
- Custom stream edge component (dashed lines with labels)
- Port rendering as small circles
- Node position from `topology.nodes[].position`
- Edge routing using `topology.edges[].waypoints`
- Edge styling from `topology.edges[].style`
- Selection highlighting (border change on click)
- Zoom, pan, minimap controls
- Grid background (dotted pattern)
- Mock flowsheet data for development

**Acceptance Criteria:**
- [ ] Equipment nodes render at correct positions
- [ ] Feed nodes appear on left side, Product nodes on right
- [ ] Ports render as small circles on correct sides
- [ ] Edges connect correct ports with proper routing
- [ ] Waypoints create orthogonal edge paths
- [ ] Edge labels display at midpoint
- [ ] Click selection works on nodes and edges
- [ ] Zoom/pan controls function correctly
- [ ] Minimap shows overview

---

### Phase 3: Left Panel - Equipment Details

**Objective:** Display and edit equipment parameters with validation

**Deliverables:**
- Equipment browser tree view (from `topology.nodes[]`)
- Equipment details section:
  - Inputs (editable) - from simulation request
  - Outputs (read-only) - from `result.node_results[].outlets`
  - Metadata/KPIs - from `result.node_results[].metadata`
- Input validation with constraints (block invalid values)
- Constraint display below inputs (always visible)
- Stream list with click navigation
- Stream details view (from `result.stream_results[]`)
- Selection sync between diagram and panel
- Warnings display per equipment

**Acceptance Criteria:**
- [ ] Clicking equipment in diagram updates left panel
- [ ] Clicking equipment in browser selects it in diagram
- [ ] Inputs enforce min/max constraints (cannot exceed)
- [ ] Constraint ranges visible below inputs
- [ ] Outputs display formatted values from node_results
- [ ] Metadata/KPIs display correctly
- [ ] Stream selection works from both diagram and list
- [ ] Warnings show for equipment with warnings

---

### Phase 4: Simulation & Run Management with Smooth Transitions

**Objective:** Backend integration with URL-based run history and smooth transitions

**Deliverables:**
- API client for calculation engine
- Simulate button with progress state (SSE-based)
- Run history dropdown synced with URL
- URL updates on new simulation (`/results/old` → `/results/new`)
- Browser history support (back/forward buttons work)
- Run data caching (instant switching for cached runs)
- Smooth fade transitions between runs (Framer Motion)
- Progress overlay during simulation
- Pending changes indicator (visual diff from last run)
- Toast notifications for success/error/warning
- Warnings panel population from `result.warnings`
- Status indicators on diagram nodes

**Acceptance Criteria:**
- [ ] Simulation request succeeds and returns new run_id
- [ ] URL updates to new run_id after simulation
- [ ] Browser back button returns to previous run
- [ ] Response data populates all UI sections
- [ ] Switching runs has smooth fade transition (≤300ms)
- [ ] Cached runs switch instantly (no network delay)
- [ ] New run appears in dropdown with correct status icon
- [ ] Progress overlay shows during simulation with percentage
- [ ] Errors display appropriate toast messages
- [ ] Pending changes indicator shows when edits made
- [ ] Direct URL entry (`/results/run-xyz`) loads correct run

---

### Phase 5: Chat Integration

**Objective:** AI-powered chat with parameter updates

**Deliverables:**
- Chat UI with message list (right panel)
- SSE streaming integration with backend
- Thinking/tool indicators during AI response
- Parameter updates from chat (reflected in left panel)
- Simulation triggers from chat
- Context-aware responses (selected equipment)
- Message history (session-based)
- Error handling in chat

**Acceptance Criteria:**
- [ ] Chat messages stream in real-time
- [ ] AI can update parameters (form updates immediately)
- [ ] AI can trigger simulations (new run appears)
- [ ] AI can answer questions about results
- [ ] Thinking indicator shows during processing
- [ ] Tool execution indicator shows tool name
- [ ] Errors handled gracefully with user message
- [ ] Message history persists in session

---

### Phase 6: Diagram Editing & Polish

**Objective:** User-modifiable flowsheet with polish

**Deliverables:**
- Draggable equipment nodes (when unlocked)
- Lock/unlock toggle in toolbar (default: locked)
- Auto-layout button (using dagre algorithm)
- Reset layout function (restore to original positions)
- Connection creation via port drag
- Smooth animations (selection, layout changes)
- Keyboard shortcuts (Escape to deselect, Delete to remove)
- Performance optimization for large flowsheets

**Acceptance Criteria:**
- [ ] Lock icon toggles drag capability
- [ ] Nodes draggable when unlocked, fixed when locked
- [ ] Auto-layout arranges nodes left-to-right by topology
- [ ] Reset layout restores original positions from JSON
- [ ] Dragging from port shows connection preview
- [ ] Dropping on valid port creates edge
- [ ] Animations smooth (60fps)
- [ ] Large flowsheets (50+ nodes) perform well

---

## 8. Visual Design Guidelines

### 8.1 Color Palette

| Purpose | Color |
|---------|-------|
| Background | #FFFFFF |
| Surface | #F5F5F5 |
| Primary | #0066CC |
| Success | #28A745 |
| Warning | #FFC107 |
| Error | #DC3545 |
| Text Primary | #212529 |
| Text Secondary | #6C757D |

### 8.2 Status Indicators

| Status | Icon | Color | Usage |
|--------|------|-------|-------|
| Success | ✅ | Green | Simulation completed successfully |
| Warning | ⚠️ | Amber | Simulation completed with warnings |
| Error | ❌ | Red | Simulation failed |
| Running | ⏳ | Blue | Simulation in progress |
| Pending | ○ | Gray | Not yet simulated |

### 8.3 Equipment Icons

Each equipment type has a distinct icon (from `topology.nodes[].icon`):
- `merge` → Mixer/combiner
- `flame` → Heater
- `wind` → Dryer/fan
- `filter` → Clarifier/separator
- `steam` → Evaporator
- `crystal` → Crystallizer
- `spinner` → Centrifuge
- `arrow-right` → Feed/Product nodes

### 8.4 Node Visual Style (Matching Reference Image)

- Shape: Rounded rectangle (border-radius ~8px)
- Fill: White/light gray
- Border: 1px solid gray (changes color on state)
- Shadow: Subtle drop shadow
- Ports: Small empty circles (○) on sides
- Text: Centered node name

### 8.5 Edge Visual Style

- Style: Dashed lines (matching reference image)
- Color: From `topology.edges[].style.color`
- Width: From `topology.edges[].style.width`
- Labels: Positioned at edge midpoint
- Arrows: Direction indicator at target end

### 8.6 Animation Guidelines

| Action | Animation | Duration |
|--------|-----------|----------|
| Selection | Border highlight fade-in | 150ms |
| Panel resize | Smooth width transition | 200ms |
| Node drag | Follow cursor (no delay) | Immediate |
| Layout change | Smooth position interpolation | 300ms |
| Toast appear | Slide in from top | 200ms |
| Toast dismiss | Fade out | 150ms |

---

## 9. Testing Strategy

### 9.1 Unit Tests

- Store actions and selectors
- Validation functions
- Utility functions
- Component rendering

### 9.2 Integration Tests

- API client with mock server
- Form submission flow
- Selection synchronization

### 9.3 E2E Tests

- Complete simulation workflow
- Chat interaction flow
- Run history navigation

---

## 10. Resolved Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Run history persist to localStorage? | Session-based (in-memory) for now |
| 2 | Equipment selection mode? | **Single selection only** (multi-select later) |
| 3 | Activity bar icons? | **Fixed set** (Equipment, Details, Thermo, Warnings, History) |
| 4 | Flow direction? | **Left-to-right** following process topology |
| 5 | Zoom/Pan enabled? | **Yes** |
| 6 | Layout mode? | **Both**: Auto-layout default + user-draggable when unlocked |
| 7 | Chat API? | Use existing backend SSE implementation |
| 8 | Constraint display? | **Always visible** below input (label style) |
| 9 | Validation behavior? | **Block invalid values** - user cannot exceed constraints |
| 10 | Equipment inputs source? | Include in original simulation request (display those) |
| 11 | Feed/Product nodes? | **Visible nodes** on left/right edges (not floating edges) |
| 12 | Edge routing? | **Straight lines** for simple, **waypoints** for complex routing |
| 13 | Application architecture? | **Two-page app**: `/` (chat), `/results/:runId` (3-panel viewer) |
| 14 | Results page navigation? | **Route-based** with URL reflecting current run ID |
| 15 | Run switching behavior? | **URL updates** (`pushState`), browser back/forward works |
| 16 | Run caching? | **In-memory cache** (last 10 runs) for instant switching |
| 17 | Transition animations? | **Framer Motion** for smooth fade transitions (≤300ms) |
| 18 | Chat trigger from results page? | User can simulate via chat, URL auto-updates to new run |
| 19 | Integration with existing chat? | Results page is **new route**, existing chat unchanged |

---

## 11. Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-16 | 1.0.0 | Initial development plan created |
| 2026-01-17 | 2.0.0 | Added JSON response structure, diagram rendering details, resolved all open questions, updated phases with detailed acceptance criteria |
| 2026-01-17 | 3.0.0 | **Major update**: Added two-page application architecture (chat → results viewer), URL-based run navigation with `pushState`, smooth transitions using Framer Motion, run data caching, header bar with run selector, browser history support. Updated Phase 1 and Phase 4 with routing and transition requirements. |

---

**Next Step:** Begin Phase 1 implementation.
