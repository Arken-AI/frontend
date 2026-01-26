/**
 * Stream Legend Component
 * 
 * Shows color-coding legend for stream phases and types
 * Displayed as a floating panel on the canvas
 */

export default function StreamLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
        Stream Legend
      </h3>
      
      {/* Phase Colors */}
      <div className="space-y-1.5 mb-3">
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
      <div className="pt-2 border-t border-gray-200 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-gray-400 rounded"></div>
          <span className="text-xs text-gray-600">Process Stream</span>
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
          <span className="text-xs text-gray-600">Recycle Stream</span>
        </div>
      </div>
      
      {/* Selection State */}
      <div className="pt-2 mt-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-0.5 bg-blue-500 rounded">
            <div className="absolute inset-0 bg-blue-300 rounded animate-pulse"></div>
          </div>
          <span className="text-xs text-gray-600">Selected Flow</span>
        </div>
      </div>
    </div>
  );
}
