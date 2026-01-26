/**
 * Stream Tooltip Component
 * 
 * Displays stream properties when clicking on an edge.
 * Shows temperature, pressure, flow rate, composition, and phase.
 * Press Escape or click outside to close.
 */

import { useState, useEffect } from 'react';

export default function StreamTooltip({ edge, equipmentData, onClose }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  if (!edge) return null;

  // Find stream data from equipment outputs
  const findStreamData = () => {
    // Check if this is a feed stream
    if (edge.id.startsWith('edge-feed-')) {
      const streamId = edge.id.replace('edge-feed-', '');
      // Find the target equipment's input that matches this feed stream
      const targetEquipment = equipmentData.find(eq => eq.id === edge.target);
      const inputStream = targetEquipment?.inputs?.find(inp => 
        inp.streamId === streamId || inp.stream_id === streamId
      );
      
      return {
        streamNumber: edge.label,
        name: inputStream?.name || streamId.replace(/_/g, ' '),
        type: 'Feed Stream',
        source: 'Feed',
        target: targetEquipment?.name || edge.target,
        ...inputStream,
      };
    }
    
    // Check if this is a product stream
    if (edge.id.startsWith('edge-product-')) {
      const streamId = edge.id.replace('edge-product-', '');
      const sourceEquipment = equipmentData.find(eq => eq.id === edge.source);
      // Find the output stream - now outputs use streamId field
      const streamData = sourceEquipment?.outputs?.find(out => 
        out.streamId === streamId || out.stream_id === streamId
      );
      
      return {
        streamNumber: edge.label,
        name: streamData?.name || streamId.replace(/_/g, ' '),
        type: 'Product Stream',
        source: sourceEquipment?.name || edge.source,
        target: 'Product',
        ...streamData,
      };
    }
    
    // Intermediate stream between equipment
    const edgeId = edge.id.replace('edge-', '');
    const sourceEquipment = equipmentData.find(eq => eq.id === edge.source);
    const targetEquipment = equipmentData.find(eq => eq.id === edge.target);
    
    // Find stream data from source equipment's outputs (now keyed by edge ID)
    const streamData = sourceEquipment?.outputs?.find(out => 
      out.streamId === edgeId || out.stream_id === edgeId
    );
    
    // If not found in outputs, try finding in target's inputs
    const inputStreamData = targetEquipment?.inputs?.find(inp =>
      inp.streamId === edgeId || inp.stream_id === edgeId
    );
    
    const finalStreamData = streamData || inputStreamData || {};
    
    return {
      streamNumber: edge.label,
      name: finalStreamData?.name || edgeId.replace(/_/g, ' '),
      type: 'Intermediate Stream',
      source: sourceEquipment?.name || edge.source,
      target: targetEquipment?.name || edge.target,
      ...finalStreamData,
    };
  };

  const streamData = findStreamData();

  // Format property value with unit
  const formatProperty = (value, unit) => {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'number') {
      return `${value.toFixed(2)} ${unit}`;
    }
    return `${value} ${unit}`;
  };

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Tooltip */}
      <div 
        className="fixed z-50 bg-white rounded-xl shadow-2xl max-w-sm border-2 border-gray-900"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b-2 border-gray-900 flex items-center justify-between">
          <div>
            <div className="text-base font-bold text-gray-900">{streamData.streamNumber}</div>
            <div className="text-xs text-gray-600">{streamData.type}</div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          {/* Stream Name */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Stream Name</div>
            <div className="text-sm font-semibold text-gray-900">{streamData.name}</div>
          </div>

          {/* Flow Path */}
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">{streamData.source}</span>
            <span className="text-gray-400">→</span>
            <span className="font-medium">{streamData.target}</span>
          </div>

          {/* Properties Grid */}
          {streamData.properties && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
              {streamData.properties.map((prop) => (
                <div key={prop.name}>
                  <div className="text-xs text-gray-500">{prop.name}</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatProperty(prop.value, prop.unit)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phase (if available) */}
          {streamData.phase && (
            <div className="pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Phase</div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
                {streamData.phase === 'liquid' && '💧'}
                {streamData.phase === 'vapor' && '☁️'}
                {streamData.phase === 'mixed' && '🌫️'}
                <span className="capitalize">{streamData.phase}</span>
              </div>
            </div>
          )}

          {/* Composition (if available) */}
          {streamData.composition && Object.keys(streamData.composition).length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Composition</div>
              <div className="space-y-1.5">
                {Object.entries(streamData.composition).map(([component, fraction]) => (
                  <div key={component} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{component}</span>
                    <span className="font-semibold text-gray-900">
                      {(fraction * 100).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="text-xs text-gray-500 text-center">
            Press <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono shadow-sm">Esc</kbd> or click outside to close
          </div>
        </div>
      </div>
    </>
  );
}
