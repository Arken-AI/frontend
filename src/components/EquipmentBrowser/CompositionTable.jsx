/**
 * Composition Table
 * 
 * Expandable table showing component fractions.
 * Shows validation (sum should equal 1.0).
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
    <div className="mt-1">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs py-0.5 hover:bg-surface-secondary/50 rounded px-1 -mx-1"
      >
        <span className="text-content-secondary flex items-center gap-1">
          <span className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
          Composition
          <span className="text-content-tertiary">({nonZeroCount} components)</span>
        </span>
        {locked && <span className="text-content-tertiary opacity-50">🔒</span>}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-1 ml-3 p-2 bg-surface-secondary/30 rounded border border-border">
          <div className="text-xs text-content-tertiary mb-1.5">
            {basis === 'mass' ? 'Mass' : 'Molar'} fractions
          </div>
          
          <div className="space-y-1">
            {components.map((component) => (
              <div key={component.name} className="flex items-center justify-between text-xs">
                <span className="text-content-secondary capitalize">
                  {component.name}
                </span>
                {editable && !locked ? (
                  <input
                    type="text"
                    defaultValue={formatFraction(component.fraction)}
                    className="w-16 px-1 py-0.5 text-right font-mono text-xs border border-border rounded bg-white focus:outline-none focus:border-primary"
                    onChange={(e) => onChange?.(component.name, parseFloat(e.target.value))}
                  />
                ) : (
                  <span className={`font-mono ${locked ? 'text-content-tertiary' : 'text-content'}`}>
                    {formatFraction(component.fraction)}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {/* Total & Validation */}
          <div className="mt-2 pt-1.5 border-t border-border flex items-center justify-between text-xs">
            <span className="text-content-secondary font-medium">Total</span>
            <span className={`font-mono flex items-center gap-1 ${
              isValid ? 'text-status-success' : 'text-status-error'
            }`}>
              {total.toFixed(4)}
              {isValid ? ' ✓' : ' ✗'}
            </span>
          </div>
          
          {!isValid && (
            <div className="mt-1 text-xs text-status-error">
              Fractions must sum to 1.0
            </div>
          )}
        </div>
      )}
    </div>
  );
}
