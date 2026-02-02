/**
 * Product Node Component
 * 
 * Small node representing a product stream leaving the process.
 * Shows stream number and product name.
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

function ProductNode({ data, selected }) {
  const { streamNumber, name } = data;
  
  const borderColor = selected 
    ? 'border-orange-600 shadow-lg' 
    : 'border-orange-400 hover:border-orange-500';
  
  return (
    <div 
      className={`bg-orange-50 border-2 rounded-lg px-3 py-2 transition-all ${borderColor}`}
      style={{ minWidth: 140 }}
    >
      {/* Input Handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-orange-500 border-2 border-white"
        style={{ left: -5 }}
      />
      
      {/* Content */}
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-orange-700">
          {streamNumber ? streamNumber : 'PRODUCT'}
        </span>
        <span className="text-[9px] text-orange-600 truncate max-w-[120px]">
          {name}
        </span>
      </div>
    </div>
  );
}

export default memo(ProductNode);
