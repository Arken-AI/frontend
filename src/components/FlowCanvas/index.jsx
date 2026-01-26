/**
 * Flow Canvas Component
 * 
 * Main React Flow canvas for displaying flowsheet diagram.
 * Shows equipment nodes, feed streams, product streams, and connections.
 * Syncs selection with Equipment Browser via Zustand store.
 * Click on edges to view stream details.
 */

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import toast from 'react-hot-toast';

import EquipmentNode from './EquipmentNode';
import FeedNode from './FeedNode';
import ProductNode from './ProductNode';
import StreamTooltip from './StreamTooltip';
import StreamLegend from './StreamLegend';
import useFlowLayout from './useFlowLayout';
import useSelectionStore from '../../store/useSelectionStore';
import { useParams } from 'react-router-dom';
import { CanvasLoadingOverlay } from '../common/SkeletonLoader';
import { NoFlowsheet } from '../common/EmptyState';

// Register custom node types
const nodeTypes = {
  equipment: EquipmentNode,
  feed: FeedNode,
  product: ProductNode,
};

// MiniMap node colors
const minimapNodeColor = (node) => {
  if (node.type === 'feed') return '#22c55e'; // Green for feeds
  if (node.type === 'product') return '#f97316'; // Orange for products
  if (node.data?.converged) return '#10b981'; // Green for converged equipment
  return '#ef4444'; // Red for not converged
};

// Inner component that uses useReactFlow (must be inside ReactFlowProvider)
function FlowCanvasInner({ equipmentData }) {
  // Get selection state from store
  const { selectedEquipmentId, selectEquipment, clearSelection } = useSelectionStore();
  
  // Get runId for export filename
  const { runId } = useParams();
  
  // Stream tooltip state
  const [selectedEdge, setSelectedEdge] = useState(null);
  
  // Keyboard shortcuts visibility
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Loading state for initial render
  const [isLoading, setIsLoading] = useState(true);
  
  // React Flow instance for camera controls
  const { fitView, setCenter } = useReactFlow();
  
  // Transform data to nodes and edges with layout
  const { nodes: layoutNodes, edges: layoutEdges } = useFlowLayout(equipmentData);
  
  // Use React Flow state management
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  
  // Update nodes when layout changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    
    // Once we have nodes, mark as loaded
    if (layoutNodes.length > 0) {
      setIsLoading(false);
    }
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);
  
  // Update node selection state based on store
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.type === 'equipment' && node.id === selectedEquipmentId,
      }))
    );
  }, [selectedEquipmentId, setNodes]);
  
  // Update edge highlighting based on selected equipment
  useEffect(() => {
    if (!selectedEquipmentId) {
      // No selection: show all edges normally
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            opacity: 1,
            strokeWidth: 2,
          },
        }))
      );
      return;
    }

    // Selection active: highlight connected edges, dim others
    setEdges((eds) =>
      eds.map((edge) => {
        const isConnected =
          edge.source === selectedEquipmentId ||
          edge.target === selectedEquipmentId;

        if (isConnected) {
          // Highlight connected edges with glow effect
          const currentColor = edge.style?.stroke || '#94a3b8';
          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              opacity: 1,
              strokeWidth: 3,
              filter: `drop-shadow(0 0 4px ${currentColor}) drop-shadow(0 0 8px ${currentColor})`,
            },
          };
        } else {
          // Dim non-connected edges
          return {
            ...edge,
            animated: false,
            style: {
              ...edge.style,
              opacity: 0.2,
              strokeWidth: 2,
            },
          };
        }
      })
    );
  }, [selectedEquipmentId, setEdges]);
  
  // Handle node click
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'equipment') {
      // Toggle selection: if already selected, clear it
      if (selectedEquipmentId === node.id) {
        clearSelection();
      } else {
        selectEquipment(node.id);
      }
    }
  }, [selectedEquipmentId, selectEquipment, clearSelection]);
  
  // Handle edge click - show stream details
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
  }, []);
  
  // Close stream tooltip
  const closeTooltip = useCallback(() => {
    setSelectedEdge(null);
  }, []);
  
  // Zoom to selected equipment
  const zoomToSelected = useCallback(() => {
    if (!selectedEquipmentId) return;
    
    const selectedNode = nodes.find(n => n.id === selectedEquipmentId);
    if (!selectedNode) return;
    
    // Center on node with zoom level 1.2
    const x = selectedNode.position.x + (selectedNode.width || 220) / 2;
    const y = selectedNode.position.y + (selectedNode.height || 60) / 2;
    
    setCenter(x, y, { zoom: 1.2, duration: 800 });
  }, [selectedEquipmentId, nodes, setCenter]);
  
  // Reset view to fit all equipment
  const resetView = useCallback(() => {
    fitView({ padding: 0.2, duration: 800 });
  }, [fitView]);
  
  // Get React Flow instance for viewport control
  const reactFlowInstance = useReactFlow();
  
  // Export canvas as PNG - captures FULL flowsheet regardless of current view
  const exportPNG = useCallback(async () => {
    // Find the viewport element inside React Flow
    const viewportElement = document.querySelector('.react-flow__viewport');
    if (!viewportElement) {
      toast.error('Unable to find canvas element');
      return;
    }
    
    // Show loading toast
    const exportToast = toast.loading('Exporting flowsheet...');
    
    try {
      // Calculate bounds of ALL nodes to capture full flowsheet
      const nodesBounds = getNodesBounds(nodes);
      
      // Add minimal padding around the flowsheet
      const padding = 30;
      const imageWidth = nodesBounds.width + padding * 2;
      const imageHeight = nodesBounds.height + padding * 2;
      
      // Calculate the viewport transform needed to show all nodes
      const viewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.5,  // minZoom
        1,    // maxZoom - use exactly 1 for crisp export
        padding
      );
      
      // Store current transform to restore later
      const currentTransform = viewportElement.style.transform;
      
      // Temporarily set viewport to calculated transform
      viewportElement.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
      
      const dataUrl = await toPng(viewportElement, {
        backgroundColor: '#ffffff',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
        },
      });
      
      const link = document.createElement('a');
      link.download = `flowsheet-${runId || 'export'}.png`;
      link.href = dataUrl;
      link.click();
      
      // Restore original transform
      viewportElement.style.transform = currentTransform;
      
      toast.success('Flowsheet exported successfully', { id: exportToast });
      
    } catch (err) {
      console.error('Failed to export PNG:', err);
      toast.error('Failed to export flowsheet', { id: exportToast });
    }
  }, [runId, nodes]);
  
  // Show loading overlay if data is still loading
  if (isLoading) {
    return (
      <div className="w-full h-full relative">
        <CanvasLoadingOverlay />
      </div>
    );
  }
  
  // Show empty state if no equipment data
  if (!equipmentData || equipmentData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <NoFlowsheet />
      </div>
    );
  }
  
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        proOptions={{
          hideAttribution: true,
        }}
      >
        {/* Background Grid */}
        <Background
          variant="dots"
          gap={16}
          size={1}
          color="#cbd5e1"
        />
        
        {/* Zoom Controls */}
        <Controls
          showInteractive={false}
          position="bottom-right"
        />
        
        {/* Mini Map */}
        <MiniMap
          nodeColor={minimapNodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          position="bottom-left"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        />
      </ReactFlow>
      
      {/* Canvas Controls - Top Right */}
      <div className="canvas-controls absolute top-3 right-3 flex flex-col gap-1.5 z-20">
        <button
          onClick={zoomToSelected}
          disabled={!selectedEquipmentId}
          className="px-3 py-1.5 bg-white border-2 border-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-medium text-gray-900"
          title="Zoom to selected equipment"
        >
          <span className="text-sm">🎯</span>
          <span>Focus</span>
        </button>
        
        <button
          onClick={resetView}
          className="px-3 py-1.5 bg-white border-2 border-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-xs font-medium text-gray-900"
          title="Reset view to fit all equipment"
        >
          <span className="text-sm">⟲</span>
          <span>Reset</span>
        </button>
        
        <button
          onClick={exportPNG}
          className="px-3 py-1.5 bg-white border-2 border-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-xs font-medium text-gray-900"
          title="Export flowsheet as PNG"
        >
          <span className="text-sm">📷</span>
          <span>Export</span>
        </button>
      </div>
      
      {/* Keyboard Shortcuts Hint - Collapsible */}
      <div className="keyboard-shortcuts absolute top-3 left-3 z-20">
        {showShortcuts ? (
          <div className="bg-white border-2 border-gray-900 rounded-lg px-3 py-2 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900">Shortcuts</span>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] text-gray-700 space-y-1.5">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono font-semibold shadow-sm min-w-[32px] text-center">Tab</kbd>
                <span>Next equipment</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono font-semibold shadow-sm min-w-[32px] text-center">↑↓</kbd>
                <span>Navigate list</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono font-semibold shadow-sm min-w-[32px] text-center">Esc</kbd>
                <span>Deselect</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowShortcuts(true)}
            className="w-7 h-7 bg-white border-2 border-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center text-sm font-bold text-gray-900"
            title="Show keyboard shortcuts"
          >
            ?
          </button>
        )}
      </div>
      
      {/* Stream Legend - positioned below help button */}
      <StreamLegend showShortcuts={showShortcuts} />
      
      {/* Stream Tooltip - shown when edge is clicked */}
      {selectedEdge && (
        <StreamTooltip 
          edge={selectedEdge}
          equipmentData={equipmentData}
          onClose={closeTooltip}
        />
      )}
    </div>
  );
}

// Wrapper component that provides ReactFlowProvider context
export default function FlowCanvas({ equipmentData }) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner equipmentData={equipmentData} />
    </ReactFlowProvider>
  );
}
