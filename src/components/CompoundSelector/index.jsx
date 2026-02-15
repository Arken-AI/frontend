/**
 * Compound Selector Component
 *
 * Shows compound mapping UI for single-equipment templates.
 * Maps generic placeholders (compound_1, compound_2, ...) to real compound names.
 * Validates uniqueness and provides search/dropdown selection.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { COMMON_COMPOUNDS, formatPlaceholder } from "./constants";

/**
 * Single compound row with search/select input
 */
function CompoundRow({ placeholder, value, onChange, error, usedCompounds }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Derive display value: use local search state (tracks typing), but fall back
  // to value prop when search is empty and value is set (e.g. after external reset)
  const displayValue = search || value || "";

  // Filter compounds based on current display value and exclude already-selected ones
  const filteredCompounds = COMMON_COMPOUNDS.filter((c) => {
    const matchesSearch =
      !displayValue || c.toLowerCase().includes(displayValue.toLowerCase());
    const notUsedElsewhere = !usedCompounds.includes(c) || c === value;
    return matchesSearch && notUsedElsewhere;
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (compound) => {
      setSearch(compound);
      onChange(placeholder, compound);
      setIsOpen(false);
    },
    [placeholder, onChange],
  );

  const handleInputChange = useCallback(
    (e) => {
      const val = e.target.value;
      setSearch(val);
      setIsOpen(true);
      // Commit trimmed value, or empty string if cleared
      if (val.trim()) {
        onChange(placeholder, val.trim());
      } else {
        onChange(placeholder, "");
      }
    },
    [placeholder, onChange],
  );

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      if (e.key === "Enter" && filteredCompounds.length > 0) {
        handleSelect(filteredCompounds[0]);
      }
    },
    [filteredCompounds, handleSelect],
  );

  return (
    <div className="flex items-center gap-2 group">
      {/* Placeholder label */}
      <div className="w-28 flex-shrink-0">
        <span className="text-xs font-medium text-gray-500">
          {formatPlaceholder(placeholder)}
        </span>
      </div>

      {/* Arrow */}
      <span className="text-gray-400 text-xs">→</span>

      {/* Search/Select input */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Select or type compound..."
          className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors
            ${
              error
                ? "border-red-300 focus:ring-red-200 bg-red-50"
                : "border-gray-300 focus:ring-blue-200 hover:border-gray-400"
            }`}
          data-testid={`compound-input-${placeholder}`}
        />

        {/* Dropdown */}
        {isOpen && filteredCompounds.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full max-h-40 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg"
            data-testid={`compound-dropdown-${placeholder}`}
          >
            {filteredCompounds.map((compound) => (
              <button
                key={compound}
                type="button"
                onClick={() => handleSelect(compound)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors
                  ${compound === value ? "bg-blue-50 font-medium text-blue-700" : "text-gray-700"}`}
              >
                {compound}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error indicator */}
      {error && (
        <span className="text-red-500 text-xs flex-shrink-0" title={error}>
          ⚠
        </span>
      )}
    </div>
  );
}

CompoundRow.propTypes = {
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  usedCompounds: PropTypes.arrayOf(PropTypes.string),
};

/**
 * Main CompoundSelector component.
 * Shows mapping UI for all generic compound placeholders.
 */
export default function CompoundSelector({
  genericCompounds = [],
  compoundMapping = {},
  onMappingChange,
  errors = {},
}) {
  if (!genericCompounds || genericCompounds.length === 0) {
    return null;
  }

  // Get list of currently used (selected) compound names for uniqueness validation
  const usedCompounds = Object.values(compoundMapping).filter(Boolean);

  return (
    <div className="compound-selector" data-testid="compound-selector">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">🧪</span>
        <h3 className="text-sm font-semibold text-gray-900">
          Compound Mapping
        </h3>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mb-3">
        This template uses generic placeholders. Select real compounds for each:
      </p>

      {/* Mapping rows */}
      <div className="space-y-2">
        {genericCompounds.map((placeholder) => (
          <CompoundRow
            key={placeholder}
            placeholder={placeholder}
            value={compoundMapping[placeholder] || ""}
            onChange={onMappingChange}
            error={errors[placeholder]}
            usedCompounds={usedCompounds}
          />
        ))}
      </div>

      {/* Summary / status */}
      {genericCompounds.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {Object.values(compoundMapping).filter(Boolean).length} /{" "}
              {genericCompounds.length} mapped
            </span>
            {Object.keys(errors).length > 0 && (
              <span className="text-red-500 font-medium">
                {Object.keys(errors).length} error
                {Object.keys(errors).length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

CompoundSelector.propTypes = {
  genericCompounds: PropTypes.arrayOf(PropTypes.string),
  compoundMapping: PropTypes.object,
  onMappingChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
};
