/**
 * Results Page
 * 
 * The 3-panel results viewer at route "/results/:runId"
 * Displays flowsheet diagram, equipment details, and contextual chat.
 * Panel switching controlled by Zustand store.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import FlowCanvas from '../components/FlowCanvas';
import { mockEquipmentData } from '../data/mockSimulationData';
import useSelectionStore from '../store/useSelectionStore';

// Sidebar sections configuration
const SIDEBAR_SECTIONS = [
  { id: 'equipment', icon: '📁', label: 'Equipment Browser', title: 'Equipment' },
  { id: 'details', icon: '📋', label: 'Details', title: 'Details' },
  { id: 'thermodynamics', icon: '🌡️', label: 'Thermodynamics', title: 'Thermodynamics' },
  { id: 'warnings', icon: '⚠️', label: 'Warnings', title: 'Warnings' },
  { id: 'history', icon: '📊', label: 'Run History', title: 'Run History' },
];

// Sidebar size constraints
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 500;
const SIDEBAR_DEFAULT_WIDTH = 288;
const SIDEBAR_COLLAPSE_THRESHOLD = 150;

// Right chat panel size constraints
const CHAT_MIN_WIDTH = 280;
const CHAT_MAX_WIDTH = 500;
const CHAT_DEFAULT_WIDTH = 320;
const CHAT_COLLAPSE_THRESHOLD = 200;

export default function ResultsPage() {
  const { runId } = useParams();
  
  // Get active panel and selection from Zustand store
  const { activePanel, setActivePanel, selectedEquipmentId, selectEquipment, clearSelection } = useSelectionStore();
  
  // Left sidebar state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  
  // Right chat panel state
  const [isRightChatOpen, setIsRightChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT_WIDTH);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  
  // Ensure sidebar opens when active panel changes (e.g., from Warnings "View Equipment")
  useEffect(() => {
    if (activePanel) {
      setIsLeftSidebarOpen(true);
    }
  }, [activePanel]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.key) {
        case 'Escape':
          // Clear selection
          clearSelection();
          break;
          
        case 'Tab':
          e.preventDefault();
          // Cycle through equipment
          if (mockEquipmentData.length === 0) return;
          
          const currentIndex = selectedEquipmentId 
            ? mockEquipmentData.findIndex(eq => eq.id === selectedEquipmentId)
            : -1;
          
          let nextIndex;
          if (e.shiftKey) {
            // Shift+Tab: previous equipment
            nextIndex = currentIndex <= 0 ? mockEquipmentData.length - 1 : currentIndex - 1;
          } else {
            // Tab: next equipment
            nextIndex = currentIndex >= mockEquipmentData.length - 1 ? 0 : currentIndex + 1;
          }
          
          selectEquipment(mockEquipmentData[nextIndex].id);
          break;
          
        case 'ArrowDown':
        case 'ArrowUp':
          e.preventDefault();
          // Navigate through equipment list
          if (mockEquipmentData.length === 0) return;
          
          const currentIdx = selectedEquipmentId 
            ? mockEquipmentData.findIndex(eq => eq.id === selectedEquipmentId)
            : -1;
          
          let newIdx;
          if (e.key === 'ArrowDown') {
            newIdx = currentIdx >= mockEquipmentData.length - 1 ? 0 : currentIdx + 1;
          } else {
            newIdx = currentIdx <= 0 ? mockEquipmentData.length - 1 : currentIdx - 1;
          }
          
          selectEquipment(mockEquipmentData[newIdx].id);
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEquipmentId, selectEquipment, clearSelection]);

  // Handle activity bar icon click
  const handleActivityBarClick = (sectionId) => {
    if (activePanel === sectionId && isLeftSidebarOpen) {
      // Clicking active section when open → close sidebar
      setIsLeftSidebarOpen(false);
    } else {
      // Clicking different section OR clicking when closed → open and switch
      setActivePanel(sectionId);
      setIsLeftSidebarOpen(true);
    }
  };

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    
    // Add event listeners for drag
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [sidebarWidth]);

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    const delta = e.clientX - dragStartX.current;
    let newWidth = dragStartWidth.current + delta;
    
    // Collapse if dragged below threshold
    if (newWidth < SIDEBAR_COLLAPSE_THRESHOLD) {
      setIsLeftSidebarOpen(false);
      return;
    }
    
    // Ensure sidebar is open when dragging
    if (!isLeftSidebarOpen && newWidth >= SIDEBAR_COLLAPSE_THRESHOLD) {
      setIsLeftSidebarOpen(true);
    }
    
    // Clamp to min/max
    newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, newWidth));
    setSidebarWidth(newWidth);
  }, [isLeftSidebarOpen]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  // Handle double-click to toggle
  const handleDoubleClick = () => {
    setIsLeftSidebarOpen(!isLeftSidebarOpen);
  };

  // Handle chat panel drag start
  const handleChatDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDraggingChat(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = chatWidth;
    
    document.addEventListener('mousemove', handleChatDragMove);
    document.addEventListener('mouseup', handleChatDragEnd);
  }, [chatWidth]);

  // Handle chat panel drag move
  const handleChatDragMove = useCallback((e) => {
    // For right panel, dragging left increases width
    const delta = dragStartX.current - e.clientX;
    let newWidth = dragStartWidth.current + delta;
    
    // Collapse if dragged below threshold
    if (newWidth < CHAT_COLLAPSE_THRESHOLD) {
      setIsRightChatOpen(false);
      return;
    }
    
    // Ensure panel is open when dragging
    if (!isRightChatOpen && newWidth >= CHAT_COLLAPSE_THRESHOLD) {
      setIsRightChatOpen(true);
    }
    
    // Clamp to min/max
    newWidth = Math.max(CHAT_MIN_WIDTH, Math.min(CHAT_MAX_WIDTH, newWidth));
    setChatWidth(newWidth);
  }, [isRightChatOpen]);

  // Handle chat panel drag end
  const handleChatDragEnd = useCallback(() => {
    setIsDraggingChat(false);
    document.removeEventListener('mousemove', handleChatDragMove);
    document.removeEventListener('mouseup', handleChatDragEnd);
  }, [handleChatDragMove]);

  // Handle chat double-click to toggle
  const handleChatDoubleClick = () => {
    setIsRightChatOpen(!isRightChatOpen);
  };

  // Get current section config
  const currentSection = SIDEBAR_SECTIONS.find(s => s.id === activePanel);

  return (
    <div className={`h-screen flex flex-col bg-surface ${isDragging || isDraggingChat ? 'select-none' : ''}`}>
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
        <div className="w-12 bg-surface-secondary border-r border-border flex flex-col items-center py-2 gap-1 flex-shrink-0">
          {SIDEBAR_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => handleActivityBarClick(section.id)}
              className={`activity-bar-item w-10 h-10 flex items-center justify-center rounded ${
                activePanel === section.id && isLeftSidebarOpen ? 'active' : ''
              }`}
              title={section.title}
            >
              <span className="text-lg">{section.icon}</span>
            </button>
          ))}
        </div>

        {/* Left Sidebar - Resizable */}
        <div 
          className="bg-surface flex flex-shrink-0 relative"
          style={{ 
            width: isLeftSidebarOpen ? sidebarWidth : 0,
            transition: isDragging ? 'none' : 'width 200ms ease-in-out'
          }}
        >
          {/* Sidebar Content Container */}
          <div 
            className="flex flex-col overflow-hidden h-full"
            style={{ width: sidebarWidth }}
          >
            {/* Sidebar Header */}
            <div className="p-3 border-b border-border">
              <h2 className="text-sm font-semibold text-content whitespace-nowrap">{currentSection?.label}</h2>
            </div>
            
            {/* Sidebar Content */}
            <div className={`flex-1 overflow-auto ${activePanel === 'warnings' ? '' : 'p-4'}`}>
              <SidebarContent section={activePanel} />
            </div>
          </div>

          {/* Resize Handle */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group z-10
              ${isDragging ? 'bg-primary' : 'bg-transparent hover:bg-primary'}
              transition-colors duration-150`}
            onMouseDown={handleDragStart}
            onDoubleClick={handleDoubleClick}
          >
            {/* Wider hit area for easier grabbing */}
            <div className="absolute -left-1 -right-1 top-0 bottom-0" />
          </div>
        </div>

        {/* Border between sidebar and canvas (only when sidebar is open) */}
        {isLeftSidebarOpen && <div className="w-px bg-border flex-shrink-0" />}

        {/* Middle Canvas */}
        <div className="flex-1 canvas-grid relative">
          <FlowCanvas equipmentData={mockEquipmentData} />
          
          {/* Chat Toggle Button - shown when chat is closed */}
          {!isRightChatOpen && (
            <button
              onClick={() => setIsRightChatOpen(true)}
              className="absolute top-3 right-3 w-10 h-10 bg-primary text-white rounded-lg shadow-lg hover:bg-primary-hover transition-colors flex items-center justify-center z-10"
              title="Open Chat"
            >
              <span className="text-lg">💬</span>
            </button>
          )}
        </div>

        {/* Border between canvas and chat (only when chat is open) */}
        {isRightChatOpen && <div className="w-px bg-border flex-shrink-0" />}

        {/* Right Chat Panel - Resizable */}
        <div 
          className="bg-surface flex flex-shrink-0 relative"
          style={{ 
            width: isRightChatOpen ? chatWidth : 0,
            transition: isDraggingChat ? 'none' : 'width 200ms ease-in-out'
          }}
        >
          {/* Resize Handle */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group z-10
              ${isDraggingChat ? 'bg-primary' : 'bg-transparent hover:bg-primary'}
              transition-colors duration-150`}
            onMouseDown={handleChatDragStart}
            onDoubleClick={handleChatDoubleClick}
          >
            {/* Wider hit area for easier grabbing */}
            <div className="absolute -left-1 -right-1 top-0 bottom-0" />
          </div>

          {/* Chat Content Container */}
          <div 
            className="flex flex-col overflow-hidden h-full"
            style={{ width: chatWidth }}
          >
            {/* Chat Header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content whitespace-nowrap">💬 Chat</h2>
              <button
                onClick={() => setIsRightChatOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-secondary text-content-secondary hover:text-content transition-colors"
                title="Close Chat"
              >
                ✕
              </button>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center">
              <p className="text-sm text-content-secondary text-center">
                Continue conversation about this run
              </p>
            </div>
            
            {/* Chat Input */}
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
    </div>
  );
}

/**
 * Sidebar Content Component
 * Renders different content based on active section
 */
import EquipmentBrowser from '../components/EquipmentBrowser';
import WarningsPanel from '../components/WarningsPanel';
import { mockWarningsData } from '../data/mockSimulationData';

function SidebarContent({ section }) {
  switch (section) {
    case 'equipment':
      return <EquipmentBrowser />;
    
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
      return <WarningsPanel warningsData={mockWarningsData} />;
    
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
