/**
 * Composition Table
 * 
 * Expandable accordion showing component fractions.
 * Matches target UI: "› Composition (X components)"
 */

import { useState } from 'react';

export default function CompositionTable({ 
  composition, 
  basis = 'mass', 
  editable = false,
  locked = false,
  onChange 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Convert composition object to array
  const components = Object.entries(composition).map(([name, fraction]) => ({
    name,
    fraction
  }));
  
  // Calculate total
  const total = components.reduce((sum, c) => sum + c.fraction, 0);
  const isValid = Math.abs(total - 1.0) < 0.001;
  
  // Count non-zero components
  const nonZeroCount = components.filter(c => c.fraction > 0.0001).length;

  // Format fraction
  const formatFraction = (val) => {
    if (val === 0) return '0.0000';
    if (val < 0.0001) return val.toExponential(2);
    return val.toFixed(4);
  };

  return (
    <div className="py-1">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
      >
        <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
          ›
        </span>
        <span>Composition</span>
        <span className="text-gray-500">({nonZeroCount} components)</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-gray-200">
          <div className="text-xs text-gray-500 mb-2">
            {basis === 'mass' ? 'Mass' : 'Molar'} fractions
          </div>
          
          <div className="space-y-1.5">
            {components.map((component) => (
              <div key={component.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">
                  {component.name}
                </span>
                {editable && !locked ? (
                  <input
                    type="text"
                    defaultValue={formatFraction(component.fraction)}
                    className="w-20 px-2 py-1 text-right font-mono text-sm bg-gray-100 border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 focus:bg-white"
                    onChange={(e) => onChange?.(component.name, parseFloat(e.target.value))}
                  />
                ) : (
                  <span className={`font-mono ${locked ? 'text-gray-500' : 'text-gray-900'}`}>
                    {formatFraction(component.fraction)}
                    {locked && <span className="ml-2 text-orange-400">🔒</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {/* Total & Validation */}
          <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Total</span>
            <span className={`font-mono flex items-center gap-1 ${
              isValid ? 'text-green-600' : 'text-red-500'
            }`}>
              {total.toFixed(4)}
              {isValid ? ' ✓' : ' ✗'}
            </span>
          </div>
          
          {!isValid && (
            <div className="mt-1 text-xs text-red-500">
              Fractions must sum to 1.0
            </div>
          )}
        </div>
      )}
    </div>
  );
}
