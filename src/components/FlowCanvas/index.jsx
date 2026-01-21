/**
 * Flow Canvas Component
 * 
 * Main React Flow canvas for displaying flowsheet diagram.
 * Shows equipment nodes, feed streams, product streams, and connections.
 * Syncs selection with Equipment Browser via Zustand store.
 */

import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

import EquipmentNode from './EquipmentNode';
import FeedNode from './FeedNode';
import ProductNode from './ProductNode';
import useFlowLayout from './useFlowLayout';
import useSelectionStore from '../../store/useSelectionStore';

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

export default function FlowCanvas({ equipmentData }) {
  // Get selection state from store
  const { selectedEquipmentId, selectEquipment, clearSelection } = useSelectionStore();
  
  // Transform data to nodes and edges with layout
  const { nodes: layoutNodes, edges: layoutEdges } = useFlowLayout(equipmentData);
  
  // Use React Flow state management
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);
  
  // Update nodes when layout changes
  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
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
  
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
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
    </div>
  );
}
