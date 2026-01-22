/**
 * Stream Field
 * 
 * Single property row with label, value, and unit.
 * Layout: Label (left) | Input/Value (right) | Unit + Lock icon
 * 
 * Editable: Shows input field with gray background
 * Locked/Output: Shows value as text with lock icon
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
  error: externalError,
  onChange 
}) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [internalError, setInternalError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Use external error if provided, otherwise internal
  const error = externalError || internalError;

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
    setInternalError(validationError);
  };

  // Handle key press (Enter to confirm, Escape to cancel)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      setLocalValue(value ?? '');
      setInternalError(null);
      e.target.blur();
    }
  };

  // Handle blur - clamp to valid range if needed
  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(localValue);
    
    if (isNaN(numValue)) {
      setLocalValue(value ?? '');
      setInternalError(null);
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
    
    if (clampedValue !== value) {
      setLocalValue(clampedValue);
      onChange?.(clampedValue);
    } else {
      setLocalValue(value ?? '');
    }
    setInternalError(null);
  };

  // Locked field (output) - value with lock icon
  if (locked) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-900">{formatValue(value)}</span>
          <span className="text-sm text-gray-500 w-12">{unit || ''}</span>
          <span className="text-orange-400 text-sm">🔒</span>
        </div>
      </div>
    );
  }

  // Editable field - input box with gray background
  if (editable) {
    return (
      <div className="py-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">{label}</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={localValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              className={`w-24 px-3 py-1.5 text-right font-mono text-sm rounded-md transition-all
                ${error
                  ? 'bg-red-50 border-2 border-red-400 focus:ring-2 focus:ring-red-200' 
                  : isFocused
                    ? 'bg-white border-2 border-blue-400 focus:ring-2 focus:ring-blue-200'
                    : 'bg-gray-100 border border-gray-200 hover:border-gray-300'
                }
                focus:outline-none`}
            />
            <span className="text-sm text-gray-500 w-12">{unit || ''}</span>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="flex justify-end mt-1 mr-14">
            <span className="text-xs text-red-500">⚠ {error}</span>
          </div>
        )}
      </div>
    );
  }

  // Read-only field (non-editable, non-locked) - like Phase
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-900">{formatValue(value)}</span>
        {locked && <span className="text-orange-400 text-sm">🔒</span>}
      </div>
    </div>
  );
}
