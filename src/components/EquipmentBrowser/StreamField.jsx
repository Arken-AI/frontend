/**
 * Stream Field
 * 
 * Single property row with label, value, and unit.
 * Can be editable (input) or locked (output).
 * 
 * Design D: Focus-Reveal with Border Emphasis
 * - Normal state: Clean, minimal
 * - Focused state: Blue border glow + range hint below
 * - Error state: Red border + error message
 */

import { useState, useEffect } from 'react';

export default function StreamField({ 
  label, 
  value, 
  unit, 
  min, 
  max, 
  defaultValue,
  description,
  editable = false, 
  locked = false,
  onChange 
}) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value when prop changes
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value ?? '');
    }
  }, [value, isFocused]);

  // Format value for display
  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      // Smart formatting based on magnitude
      if (Math.abs(val) >= 10000) return val.toFixed(0);
      if (Math.abs(val) >= 100) return val.toFixed(1);
      if (Math.abs(val) >= 1) return val.toFixed(2);
      if (Math.abs(val) >= 0.01) return val.toFixed(4);
      return val.toExponential(2);
    }
    return String(val);
  };

  // Format min/max for display (compact)
  const formatLimit = (val) => {
    if (val === null || val === undefined) return null;
    if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val;
  };

  // Validate value against constraints
  const validate = (numValue) => {
    if (isNaN(numValue)) {
      return 'Invalid number';
    }
    if (min !== undefined && min !== null && numValue < min) {
      return `Below minimum (${formatLimit(min)})`;
    }
    if (max !== undefined && max !== null && numValue > max) {
      return `Exceeds maximum (${formatLimit(max)})`;
    }
    return null;
  };

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Validate
    const numValue = parseFloat(newValue);
    const validationError = validate(numValue);
    setError(validationError);
    
    // Only call onChange if valid
    if (!validationError) {
      onChange?.(numValue);
    }
  };

  // Handle key press (Enter to confirm, Escape to cancel)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // This will trigger handleBlur
    } else if (e.key === 'Escape') {
      // Cancel edit - reset to original value
      setLocalValue(value ?? '');
      setError(null);
      e.target.blur();
    }
  };

  // Handle blur - clamp to valid range if needed
  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(localValue);
    
    if (isNaN(numValue)) {
      // Reset to original value
      setLocalValue(value ?? '');
      setError(null);
      return;
    }
    
    // Clamp to valid range
    let clampedValue = numValue;
    if (min !== undefined && min !== null && numValue < min) {
      clampedValue = min;
    }
    if (max !== undefined && max !== null && numValue > max) {
      clampedValue = max;
    }
    
    // Always update to clamped value (even if same)
    setLocalValue(clampedValue);
    onChange?.(clampedValue);
    setError(null);
  };

  const hasConstraints = (min !== undefined && min !== null) || (max !== undefined && max !== null);

  // Locked field (output)
  if (locked) {
    return (
      <div className="flex items-center text-xs py-1">
        <span className="flex-1 text-content-secondary">{label}</span>
        <div className="flex items-center gap-1.5 justify-end" style={{ minWidth: '140px' }}>
          <span className="font-mono text-content-tertiary text-right w-24">{formatValue(value)}</span>
          <span className="text-content-tertiary text-[10px] w-14 text-left">{unit || ''}</span>
          <span className="text-amber-400 text-[10px]">🔒</span>
        </div>
      </div>
    );
  }

  // Editable field with Design D: Focus-Reveal
  if (editable) {
    return (
      <div className="py-0.5">
        <div className="flex items-start text-xs gap-2">
          <span 
            className={`flex-1 transition-colors pt-1 ${
              isFocused ? 'text-primary font-medium' : 'text-content-secondary'
            }`}
          >
            {label}
          </span>
          <div className="flex flex-col gap-0.5" style={{ minWidth: '140px' }}>
            <div className="flex items-center gap-1.5 justify-end">
              <div className="relative">
                <input
                  type="text"
                  value={localValue}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={handleBlur}
                  className={`w-24 px-2 py-1 text-right font-mono text-xs rounded transition-all
                    ${isFocused 
                      ? error
                        ? 'border-2 border-status-error bg-red-50 shadow-sm shadow-status-error/20' 
                        : 'border-2 border-primary bg-blue-50 shadow-sm shadow-primary/20'
                      : 'border border-border bg-white hover:border-border-hover'
                    }
                    focus:outline-none`}
                />
              </div>
              <span className={`text-[10px] w-14 text-left ${
                isFocused ? 'text-content' : 'text-content-tertiary'
              }`}>
                {unit || ''}
              </span>
            </div>
            
            {/* Error message - shown when there's an error */}
            {error && (
              <div className="flex justify-end pr-14">
                <span className="text-status-error text-[10px] bg-red-50 px-2 py-0.5 rounded whitespace-nowrap">
                  ⚠️ {error}
                </span>
              </div>
            )}
            
            {/* Constraint range - shown on focus when no error */}
            {isFocused && !error && hasConstraints && (
              <div className="flex justify-end pr-14">
                <span className="text-primary text-[10px] bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">
                  {min !== null && min !== undefined && `${formatLimit(min)}`}
                  {min !== null && min !== undefined && max !== null && max !== undefined && ' – '}
                  {max !== null && max !== undefined && `${formatLimit(max)}`}
                  {unit && ` ${unit}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Read-only field (non-editable, non-locked)
  return (
    <div className="flex items-center text-xs py-1">
      <span className="flex-1 text-content-secondary">{label}</span>
      <div className="flex items-center gap-1.5 justify-end" style={{ minWidth: '140px' }}>
        <span className="font-mono text-content text-right w-24">{formatValue(value)}</span>
        <span className="text-content-tertiary text-[10px] w-14 text-left">{unit || ''}</span>
      </div>
    </div>
  );
}
