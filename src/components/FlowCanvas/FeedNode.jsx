/**
 * Feed Node Component
 * 
 * Small node representing a feed stream entering the process.
 * Shows stream number and name.
 */

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

function FeedNode({ data, selected }) {
  const { streamNumber, name } = data;
  
  const borderColor = selected 
    ? 'border-green-600 shadow-lg' 
    : 'border-green-400 hover:border-green-500';
  
  return (
    <div 
      className={`bg-green-50 border-2 rounded-lg px-3 py-2 transition-all ${borderColor}`}
      style={{ minWidth: 120 }}
    >
      {/* Content */}
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-green-700">
          {streamNumber ? `S${streamNumber}` : 'FEED'}
        </span>
        <span className="text-[9px] text-green-600 truncate max-w-[100px]">
          {name}
        </span>
      </div>
      
      {/* Output Handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-green-500 border-2 border-white"
        style={{ right: -5 }}
      />
    </div>
  );
}

export default memo(FeedNode);
