/**
 * Stream Legend Component
 * 
 * Shows color-coding legend for stream phases and types
 * Collapsible panel below the help button
 * Adjusts position when help shortcuts are expanded
 */

import { useState } from 'react';

export default function StreamLegend({ showShortcuts = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate top position based on help button state
  // Help button collapsed: 40px (7px button height + 12px gap)
  // Help button expanded: ~138px (expanded panel height + gap)
  const topPosition = showShortcuts ? 'top-[138px]' : 'top-[46px]';

  return (
    <div className={`absolute ${topPosition} left-3 z-20 transition-all duration-200`}>
      {isExpanded ? (
        <div className="bg-white border-2 border-gray-900 rounded-lg px-3 py-2 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900">Stream Legend</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-900 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
          
          {/* Phase Colors */}
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-600">Liquid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-500 rounded"></div>
              <span className="text-xs text-gray-600">Vapor/Gas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-purple-500 rounded"></div>
              <span className="text-xs text-gray-600">Two-Phase</span>
            </div>
          </div>
          
          {/* Line Styles */}
          <div className="pt-2 border-t border-gray-200 space-y-1.5 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-400 rounded"></div>
              <span className="text-xs text-gray-600">Process</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="32" height="2" className="overflow-visible">
                <line 
                  x1="0" 
                  y1="1" 
                  x2="32" 
                  y2="1" 
                  stroke="#94a3b8" 
                  strokeWidth="2" 
                  strokeDasharray="5,5"
                />
              </svg>
              <span className="text-xs text-gray-600">Recycle</span>
            </div>
          </div>
          
          {/* Selection State */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-0.5 bg-blue-500 rounded">
                <div className="absolute inset-0 bg-blue-300 rounded animate-pulse"></div>
              </div>
              <span className="text-xs text-gray-600">Selected</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-7 h-7 bg-white border-2 border-gray-900 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center text-sm font-bold text-gray-900"
          title="Show stream legend"
        >
          🏁
        </button>
      )}
    </div>
  );
}
