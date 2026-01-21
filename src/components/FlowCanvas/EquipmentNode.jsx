/**
 * Equipment Node Component
 * 
 * Custom React Flow node for displaying equipment.
 * Dynamically generates handles based on input/output counts.
 * Distributes handles across left (inputs) and top/right/bottom (outputs).
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

/**
 * Calculate handle positions for multiple connections
 * Distributes handles across available sides
 */
function getOutputHandlePositions(outputIds) {
  const count = outputIds.length;
  const handles = [];
  
  if (count === 0) return handles;
  
  if (count === 1) {
    // Single output: right center
    handles.push({ id: outputIds[0], position: Position.Right, style: { top: '50%' } });
  } else if (count === 2) {
    // Two outputs: right side, distributed vertically
    handles.push({ id: outputIds[0], position: Position.Right, style: { top: '33%' } });
    handles.push({ id: outputIds[1], position: Position.Right, style: { top: '66%' } });
  } else if (count === 3) {
    // Three outputs: top + right + bottom
    handles.push({ id: outputIds[0], position: Position.Top, style: { left: '50%' } });
    handles.push({ id: outputIds[1], position: Position.Right, style: { top: '50%' } });
    handles.push({ id: outputIds[2], position: Position.Bottom, style: { left: '50%' } });
  } else if (count === 4) {
    // Four outputs: top + right (2) + bottom
    handles.push({ id: outputIds[0], position: Position.Top, style: { left: '50%' } });
    handles.push({ id: outputIds[1], position: Position.Right, style: { top: '33%' } });
    handles.push({ id: outputIds[2], position: Position.Right, style: { top: '66%' } });
    handles.push({ id: outputIds[3], position: Position.Bottom, style: { left: '50%' } });
  } else {
    // 5+ outputs: top (spread) + right (spread) + bottom (spread)
    const topCount = Math.ceil(count / 3);
    const rightCount = Math.ceil((count - topCount) / 2);
    const bottomCount = count - topCount - rightCount;
    
    let idx = 0;
    
    // Top handles
    for (let i = 0; i < topCount; i++) {
      const leftPercent = ((i + 1) / (topCount + 1)) * 100;
      handles.push({ id: outputIds[idx++], position: Position.Top, style: { left: `${leftPercent}%` } });
    }
    
    // Right handles
    for (let i = 0; i < rightCount; i++) {
      const topPercent = ((i + 1) / (rightCount + 1)) * 100;
      handles.push({ id: outputIds[idx++], position: Position.Right, style: { top: `${topPercent}%` } });
    }
    
    // Bottom handles
    for (let i = 0; i < bottomCount; i++) {
      const leftPercent = ((i + 1) / (bottomCount + 1)) * 100;
      handles.push({ id: outputIds[idx++], position: Position.Bottom, style: { left: `${leftPercent}%` } });
    }
  }
  
  return handles;
}

function getInputHandlePositions(inputIds) {
  const count = inputIds.length;
  const handles = [];
  
  if (count === 0) return handles;
  
  if (count === 1) {
    // Single input: left center
    handles.push({ id: inputIds[0], position: Position.Left, style: { top: '50%' } });
  } else if (count === 2) {
    // Two inputs: left side, distributed vertically
    handles.push({ id: inputIds[0], position: Position.Left, style: { top: '33%' } });
    handles.push({ id: inputIds[1], position: Position.Left, style: { top: '66%' } });
  } else {
    // 3+ inputs: distribute evenly on left side
    for (let i = 0; i < count; i++) {
      const topPercent = ((i + 1) / (count + 1)) * 100;
      handles.push({ id: inputIds[i], position: Position.Left, style: { top: `${topPercent}%` } });
    }
  }
  
  return handles;
}

function EquipmentNode({ data, selected }) {
  const { name, inputHandles = [], outputHandles = [] } = data;
  
  // Enhanced border styling with glow effect for selection
  const borderColor = selected 
    ? 'border-primary shadow-lg ring-2 ring-primary/30' 
    : 'border-border hover:border-border-hover';
  
  // Calculate handle positions
  const inputPositions = getInputHandlePositions(inputHandles);
  const outputPositions = getOutputHandlePositions(outputHandles);
  
  return (
    <div 
      className={`bg-surface border-2 rounded-lg overflow-hidden transition-all ${borderColor}`}
      style={{ width: 220, minHeight: 60 }}
    >
      {/* Content */}
      <div className="px-3 py-3 flex items-center justify-center">
        <span className="text-sm font-medium text-content truncate">
          {name}
        </span>
      </div>
      
      {/* Dynamic Input Handles (Left side) */}
      {inputPositions.map((handle) => (
        <Handle
          key={`input-${handle.id}`}
          type="target"
          position={handle.position}
          id={handle.id}
          className="w-3 h-3 bg-green-500 border-2 border-white"
          style={handle.style}
        />
      ))}
      
      {/* Dynamic Output Handles (Top/Right/Bottom) */}
      {outputPositions.map((handle) => (
        <Handle
          key={`output-${handle.id}`}
          type="source"
          position={handle.position}
          id={handle.id}
          className="w-3 h-3 bg-orange-500 border-2 border-white"
          style={handle.style}
        />
      ))}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(EquipmentNode);
