/**
 * Core type definitions for ARKEN AI Process Simulation Frontend
 */

// UI State Types
export type SidebarSection = 
  | 'equipment'
  | 'streams'
  | 'properties'
  | 'validation'
  | 'settings';

export type ThemeMode = 'light' | 'dark';

export interface UIState {
  activeSidebarSection: SidebarSection | null;
  collapsedSections: Set<string>;
  theme: ThemeMode;
  leftPanelWidth: number;
  rightPanelWidth: number;
}

// Equipment Types
export interface EquipmentParameter {
  name: string;
  value: number | string | boolean;
  unit?: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  options?: string[];
  min?: number;
  max?: number;
  constraints?: string;
  description?: string;
}

export interface Equipment {
  id: string;
  type: string;
  displayName: string;
  parameters: Record<string, EquipmentParameter>;
  position?: { x: number; y: number };
  status?: 'active' | 'inactive' | 'error';
  validationErrors?: string[];
}

// Stream Types
export interface StreamComposition {
  [component: string]: number;
}

export interface Stream {
  id: string;
  name: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  flowRate?: number;
  flowBasis?: 'mass' | 'molar';
  temperature?: number;
  pressure?: number;
  composition?: StreamComposition;
  phase?: 'liquid' | 'vapor' | 'solid' | 'mixed';
  waypoints?: Array<{ x: number; y: number }>;
}

// Simulation Run Types
export interface SimulationMetadata {
  industry: string;
  process: string;
  operatingMode: 'ideal' | 'realistic';
  timestamp: string;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface SimulationTopology {
  equipment: Equipment[];
  streams: Stream[];
  feed_nodes: Array<{ id: string; name: string; position?: { x: number; y: number } }>;
  product_nodes: Array<{ id: string; name: string; position?: { x: number; y: number } }>;
}

export interface NodeResult {
  equipment_id: string;
  status: 'active' | 'inactive';
  reason?: string;
  mass_balance?: {
    total_mass_in: number;
    total_mass_out: number;
    closure_percent: number;
  };
  energy_balance?: {
    total_energy_in: number;
    total_energy_out: number;
    closure_percent: number;
  };
  computed_properties?: Record<string, any>;
}

export interface StreamResult {
  stream_id: string;
  flow_rate: number;
  flow_basis: 'mass' | 'molar';
  temperature_K: number;
  pressure_Pa: number;
  composition: StreamComposition;
  phase: 'liquid' | 'vapor' | 'solid' | 'mixed';
  properties?: Record<string, any>;
}

export interface SimulationResult {
  overall_mass_balance: {
    total_mass_in: number;
    total_mass_out: number;
    closure_percent: number;
  };
  overall_energy_balance?: {
    total_energy_in: number;
    total_energy_out: number;
    closure_percent: number;
  };
  execution_time_ms: number;
  warnings?: string[];
}

export interface SimulationRun {
  id: string;
  metadata: SimulationMetadata;
  topology: SimulationTopology;
  result: SimulationResult;
  node_results: NodeResult[];
  stream_results: StreamResult[];
  validation?: ValidationResult;
}

// Validation Types
export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  equipment_id?: string;
  parameter?: string;
  suggestion?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  issues: ValidationIssue[];
  timestamp: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    request_id?: string;
    tool_calls?: ToolCall[];
    thinking?: string;
  };
}

export interface ToolCall {
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input?: Record<string, any>;
  output?: any;
  error?: string;
}

// React Flow Types (extended)
export interface FlowsheetNode {
  id: string;
  type: 'equipment' | 'feed' | 'product';
  position: { x: number; y: number };
  data: {
    label: string;
    equipmentType?: string;
    status?: 'active' | 'inactive' | 'error';
    ports?: {
      inlet: string[];
      outlet: string[];
    };
  };
}

export interface FlowsheetEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type?: 'default' | 'smoothstep' | 'step';
  data?: {
    streamId: string;
    flowRate?: number;
    label?: string;
  };
}

// ============================================
// Transition & Loading State Types (v3.0.0)
// ============================================

export type TransitionState = 
  | 'idle'
  | 'loading'
  | 'transitioning'
  | 'error';

export interface LoadingState {
  state: TransitionState;
  progress: number; // 0-100
  message: string;
}

// ============================================
// Run Store Types (v3.0.0)
// ============================================

export interface RunHistoryEntry {
  runId: string;
  timestamp: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'warnings';
  label?: string;
}

export interface RunState {
  currentRunId: string;
  runHistory: RunHistoryEntry[];
  runCache: Record<string, SimulationRun>; // Map of runId -> data
  transitionState: TransitionState;
  loadingProgress: number;
  loadingMessage: string;
  pendingChanges: Record<string, any>;
  hasUnsavedChanges: boolean;
}

// ============================================
// UI Store Types (v3.0.0)
// ============================================

export type ActivitySection = 
  | 'equipment'
  | 'details'
  | 'thermo'
  | 'warnings'
  | 'history';

export interface UIStore {
  // Active section in sidebar
  activeSection: ActivitySection;
  setActiveSection: (section: ActivitySection) => void;
  
  // Sidebar collapsed state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Chat panel collapsed state
  isChatCollapsed: boolean;
  toggleChat: () => void;
  
  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;
  
  // Loading overlay
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (isLoading: boolean, message?: string) => void;
}

// ============================================
// Route Params Types (v3.0.0)
// ============================================

export interface ResultsPageParams {
  runId: string;
}

