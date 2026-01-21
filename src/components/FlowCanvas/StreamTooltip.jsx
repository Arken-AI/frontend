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
      return {
        streamNumber: edge.label,
        name: streamId.replace(/_/g, ' '),
        type: 'Feed Stream',
        source: 'Feed',
        target: equipmentData.find(eq => eq.id === edge.target)?.name || edge.target,
      };
    }
    
    // Check if this is a product stream
    if (edge.id.startsWith('edge-product-')) {
      const streamId = edge.id.replace('edge-product-', '');
      const sourceEquipment = equipmentData.find(eq => eq.id === edge.source);
      const streamData = sourceEquipment?.outputs.find(out => out.stream_id === streamId);
      
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
    const streamId = edge.id.replace('edge-', '');
    const sourceEquipment = equipmentData.find(eq => eq.id === edge.source);
    const targetEquipment = equipmentData.find(eq => eq.id === edge.target);
    const streamData = sourceEquipment?.outputs.find(out => out.stream_id === streamId);
    
    return {
      streamNumber: edge.label,
      name: streamData?.name || streamId.replace(/_/g, ' '),
      type: 'Intermediate Stream',
      source: sourceEquipment?.name || edge.source,
      target: targetEquipment?.name || edge.target,
      ...streamData,
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
        className="fixed z-50 bg-white border-2 border-primary rounded-lg shadow-xl max-w-sm"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-primary">{streamData.streamNumber}</div>
            <div className="text-xs text-content-secondary">{streamData.type}</div>
          </div>
          <button 
            onClick={onClose}
            className="text-content-tertiary hover:text-content transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Stream Name */}
          <div>
            <div className="text-xs text-content-tertiary mb-0.5">Stream Name</div>
            <div className="text-sm font-medium text-content">{streamData.name}</div>
          </div>

          {/* Flow Path */}
          <div className="flex items-center gap-2 text-xs text-content-secondary">
            <span className="font-medium">{streamData.source}</span>
            <span>→</span>
            <span className="font-medium">{streamData.target}</span>
          </div>

          {/* Properties Grid */}
          {streamData.properties && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
              {streamData.properties.map((prop) => (
                <div key={prop.name}>
                  <div className="text-xs text-content-tertiary">{prop.name}</div>
                  <div className="text-sm font-medium text-content">
                    {formatProperty(prop.value, prop.unit)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phase (if available) */}
          {streamData.phase && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-content-tertiary mb-0.5">Phase</div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-secondary rounded text-xs font-medium text-content">
                {streamData.phase === 'liquid' && '💧'}
                {streamData.phase === 'vapor' && '☁️'}
                {streamData.phase === 'mixed' && '🌫️'}
                <span className="capitalize">{streamData.phase}</span>
              </div>
            </div>
          )}

          {/* Composition (if available) */}
          {streamData.composition && Object.keys(streamData.composition).length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-content-tertiary mb-1.5">Composition</div>
              <div className="space-y-1">
                {Object.entries(streamData.composition).map(([component, fraction]) => (
                  <div key={component} className="flex items-center justify-between text-xs">
                    <span className="text-content-secondary">{component}</span>
                    <span className="font-medium text-content">
                      {(fraction * 100).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 bg-surface-secondary border-t border-border">
          <div className="text-xs text-content-tertiary text-center">
            Press <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[10px] font-mono">Esc</kbd> or click outside to close
          </div>
        </div>
      </div>
    </>
  );
}
