/**
 * Constraints Section
 * 
 * Displays editable equipment parameters (constraints).
 * Shows parameter name, value input, unit, and validation.
 */

import { useState } from 'react';
import StreamField from './StreamField';

// Format parameter key to display label
function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Pa$/, '(Pa)')
    .replace(/K$/, '(K)')
    .replace(/Kw$/, '(kW)');
}

export default function ConstraintsSection({ constraints, onChange }) {
  return (
    <div className="px-3 py-2 border-t border-border">
      <h4 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
        <span>⚙️</span>
        <span>CONSTRAINTS</span>
      </h4>
      
      <div className="space-y-1.5 bg-surface-secondary/30 rounded-md p-2">
        {constraints.map((constraint) => (
          <StreamField
            key={constraint.key}
            label={formatLabel(constraint.key)}
            value={constraint.value}
            unit={constraint.unit}
            min={constraint.min}
            max={constraint.max}
            description={constraint.description}
            editable={true}
            onChange={(newValue) => onChange?.(constraint.key, newValue)}
          />
        ))}
      </div>
    </div>
  );
}
