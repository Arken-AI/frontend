/**
 * Results Page
 * 
 * The 3-panel results viewer at route "/results/:runId"
 * Displays flowsheet diagram, equipment details, and contextual chat.
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// Sidebar sections configuration
const SIDEBAR_SECTIONS = [
  { id: 'equipment', icon: '📁', label: 'Equipment Browser', title: 'Equipment' },
  { id: 'details', icon: '📋', label: 'Details', title: 'Details' },
  { id: 'thermodynamics', icon: '🌡️', label: 'Thermodynamics', title: 'Thermodynamics' },
  { id: 'warnings', icon: '⚠️', label: 'Warnings', title: 'Warnings' },
  { id: 'history', icon: '📊', label: 'Run History', title: 'Run History' },
];

export default function ResultsPage() {
  const { runId } = useParams();
  
  // Left sidebar state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('equipment');

  // Handle activity bar icon click
  const handleActivityBarClick = (sectionId) => {
    if (activeSection === sectionId && isLeftSidebarOpen) {
      // Clicking active section when open → close sidebar
      setIsLeftSidebarOpen(false);
    } else {
      // Clicking different section OR clicking when closed → open and switch
      setActiveSection(sectionId);
      setIsLeftSidebarOpen(true);
    }
  };

  // Get current section config
  const currentSection = SIDEBAR_SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-surface">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-content">ARKEN AI Results</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-secondary rounded-md border border-border">
            <span className="text-sm text-content-secondary">Run:</span>
            <span className="text-sm font-medium text-content">{runId}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="text-sm text-primary hover:text-primary-hover transition-colors"
          >
            ← Back to Chat
          </Link>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors text-sm font-medium disabled:opacity-50"
            disabled
          >
            Simulate
          </button>
        </div>
      </header>

      {/* Main Content - 3 Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-surface-secondary border-r border-border flex flex-col items-center py-2 gap-1">
          {SIDEBAR_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => handleActivityBarClick(section.id)}
              className={`activity-bar-item w-10 h-10 flex items-center justify-center rounded ${
                activeSection === section.id && isLeftSidebarOpen ? 'active' : ''
              }`}
              title={section.title}
            >
              <span className="text-lg">{section.icon}</span>
            </button>
          ))}
        </div>

        {/* Left Sidebar - Collapsible */}
        <div 
          className={`bg-surface border-r border-border flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${
            isLeftSidebarOpen ? 'w-72' : 'w-0'
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-3 border-b border-border min-w-[288px]">
            <h2 className="text-sm font-semibold text-content">{currentSection?.label}</h2>
          </div>
          
          {/* Sidebar Content */}
          <div className="flex-1 p-4 overflow-auto min-w-[288px]">
            <SidebarContent section={activeSection} />
          </div>
        </div>

        {/* Middle Canvas */}
        <div className="flex-1 canvas-grid flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔬</div>
            <h3 className="text-lg font-medium text-content mb-2">Flowsheet Diagram</h3>
            <p className="text-sm text-content-secondary">
              Run ID: <code className="bg-surface-secondary px-2 py-1 rounded">{runId}</code>
            </p>
            <p className="text-sm text-content-tertiary mt-2">
              Equipment and streams will render here
            </p>
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="w-80 bg-surface border-l border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold text-content">Chat</h2>
          </div>
          <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
            <p className="text-sm text-content-secondary text-center">
              Continue conversation about this run
            </p>
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ask about results..."
                className="flex-1 px-3 py-2 border border-border rounded-md bg-surface text-sm text-content placeholder:text-content-tertiary focus:outline-none focus:border-primary"
                disabled
              />
              <button 
                className="px-4 py-2 bg-primary text-white rounded-md text-sm disabled:opacity-50"
                disabled
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sidebar Content Component
 * Renders different content based on active section
 */
function SidebarContent({ section }) {
  switch (section) {
    case 'equipment':
      return (
        <>
          <p className="text-sm text-content-secondary">Equipment list will appear here</p>
          <div className="mt-4 space-y-2">
            <div className="skeleton h-8 w-full rounded"></div>
            <div className="skeleton h-8 w-full rounded"></div>
            <div className="skeleton h-8 w-full rounded"></div>
            <div className="skeleton h-8 w-3/4 rounded"></div>
          </div>
        </>
      );
    
    case 'details':
      return (
        <>
          <p className="text-sm text-content-secondary">Select equipment to view details</p>
          <div className="mt-4 p-4 border border-border rounded-md bg-surface-secondary">
            <p className="text-xs text-content-tertiary text-center">No equipment selected</p>
          </div>
        </>
      );
    
    case 'thermodynamics':
      return (
        <>
          <p className="text-sm text-content-secondary">Thermodynamic properties</p>
          <div className="mt-4 space-y-2">
            <div className="p-2 border border-border rounded bg-surface-secondary">
              <span className="text-xs text-content-tertiary">Property Package</span>
              <p className="text-sm text-content">Ideal</p>
            </div>
            <div className="p-2 border border-border rounded bg-surface-secondary">
              <span className="text-xs text-content-tertiary">Compounds</span>
              <p className="text-sm text-content">—</p>
            </div>
          </div>
        </>
      );
    
    case 'warnings':
      return (
        <>
          <p className="text-sm text-content-secondary">Simulation warnings</p>
          <div className="mt-4 p-4 border border-border rounded-md bg-surface-secondary">
            <p className="text-xs text-content-tertiary text-center">No warnings</p>
          </div>
        </>
      );
    
    case 'history':
      return (
        <>
          <p className="text-sm text-content-secondary">Recent simulation runs</p>
          <div className="mt-4 space-y-2">
            <div className="p-2 border border-border rounded bg-surface-secondary flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-content">Current run</span>
            </div>
          </div>
        </>
      );
    
    default:
      return null;
  }
}
