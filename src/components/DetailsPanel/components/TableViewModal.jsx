/**
 * TableViewModal Component
 *
 * Displays array data in a table format for easy comparison.
 * Features:
 * - Fixed header row with sortable columns
 * - Grouped headers for nested objects (e.g., Liquid Composition → benzene, toluene)
 * - Scrollable body
 * - Clean modal design
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Format a value for table display
 */
function formatCellValue(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'number') {
    // Format numbers with appropriate precision
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    // For decimals, show up to 4 significant digits
    if (Math.abs(value) < 0.01 && value !== 0) {
      return value.toExponential(2);
    }
    return value.toFixed(4).replace(/\.?0+$/, '');
  }
  if (typeof value === 'boolean') {
    return value ? '✓' : '✗';
  }
  if (typeof value === 'object') {
    // For arrays or deeply nested objects, show summary
    if (Array.isArray(value)) {
      return `[${value.length}]`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Format column header from key
 */
function formatHeader(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Check if a value is a simple object (not array, not null)
 */
function isNestedObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Build column structure with grouped headers for nested objects
 * Returns: { columns: [...], groups: [...] }
 * 
 * columns = flat list of { key, parentKey, subKey, label }
 * groups = list of { key, label, span } for the top header row
 */
function buildColumnStructure(items) {
  const columnMap = new Map(); // key -> { isNested, subKeys: Set }
  
  // Analyze all items to find nested structures
  items.forEach(item => {
    if (!item || typeof item !== 'object') return;
    
    Object.entries(item).forEach(([key, value]) => {
      if (!columnMap.has(key)) {
        columnMap.set(key, { isNested: false, subKeys: new Set() });
      }
      
      const colInfo = columnMap.get(key);
      
      if (isNestedObject(value)) {
        colInfo.isNested = true;
        Object.keys(value).forEach(subKey => colInfo.subKeys.add(subKey));
      }
    });
  });
  
  // Build flat columns and groups
  const columns = [];
  const groups = [];
  
  // Add row number column
  groups.push({ key: '#', label: '#', span: 1, isRowNum: true });
  columns.push({ key: '#', parentKey: null, subKey: null, label: '#', isRowNum: true });
  
  columnMap.forEach((colInfo, key) => {
    if (colInfo.isNested && colInfo.subKeys.size > 0) {
      // Grouped column with sub-columns
      const subKeys = Array.from(colInfo.subKeys);
      groups.push({ key, label: formatHeader(key), span: subKeys.length, isNested: true });
      
      subKeys.forEach(subKey => {
        columns.push({
          key: `${key}.${subKey}`,
          parentKey: key,
          subKey,
          label: formatHeader(subKey),
        });
      });
    } else {
      // Simple column (spans both header rows)
      groups.push({ key, label: formatHeader(key), span: 1, isNested: false });
      columns.push({
        key,
        parentKey: null,
        subKey: null,
        label: formatHeader(key),
      });
    }
  });
  
  return { columns, groups };
}

/**
 * Get cell value, handling nested paths
 */
function getCellValue(item, column) {
  if (column.isRowNum) return null; // Handled separately
  
  if (column.parentKey) {
    // Nested value: item[parentKey][subKey]
    return item?.[column.parentKey]?.[column.subKey];
  }
  // Direct value
  return item?.[column.key];
}

export default function TableViewModal({ isOpen, onClose, data, title }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Build column structure with groups
  const { columns, groups } = useMemo(() => buildColumnStructure(data), [data]);
  
  // Check if we have any nested columns (need two header rows)
  const hasNestedColumns = groups.some(g => g.isNested);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const col = columns.find(c => c.key === sortConfig.key);
    if (!col) return data;

    return [...data].sort((a, b) => {
      const aVal = getCellValue(a, col);
      const bVal = getCellValue(b, col);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig, columns]);

  // Handle column sort
  const handleSort = (columnKey) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-xl shadow-2xl w-full h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Table Container */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                  {/* Table Header - Two rows for grouped columns */}
                  <thead className="sticky top-0 z-10">
                    {/* Top row: Group headers - simple columns are sortable here */}
                    <tr className="bg-gray-100">
                      {groups.map((group, idx) => {
                        // Simple columns (not nested) are sortable from top row
                        const isSimpleSortable = !group.isNested && !group.isRowNum;
                        const sortKey = isSimpleSortable ? group.key : null;
                        
                        return (
                          <th
                            key={group.key}
                            colSpan={group.span}
                            onClick={sortKey ? () => handleSort(sortKey) : undefined}
                            className={`px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 bg-gray-100 text-center
                              ${idx > 0 ? 'border-l border-gray-200' : ''}
                              ${group.isNested ? 'bg-blue-50 text-blue-700' : ''}
                              ${isSimpleSortable ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {group.label}
                              {sortKey && sortConfig.key === sortKey && (
                                <svg
                                  className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                    
                    {/* Bottom row: Sub-column headers (only if nested columns exist) */}
                    {hasNestedColumns && (
                      <tr className="bg-gray-50">
                        {columns.map((col, idx) => {
                          // Only nested sub-columns are clickable in bottom row
                          const isNestedSortable = col.parentKey && !col.isRowNum;
                          
                          return (
                            <th
                              key={col.key}
                              onClick={isNestedSortable ? () => handleSort(col.key) : undefined}
                              className={`px-3 py-2 text-xs font-medium text-gray-600 border-b border-gray-300 bg-gray-50 whitespace-nowrap
                                ${isNestedSortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                                ${idx > 0 ? 'border-l border-gray-200' : ''}
                                ${col.parentKey ? 'text-center' : 'text-left'}`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {col.parentKey ? col.label : ''}
                                {isNestedSortable && sortConfig.key === col.key && (
                                  <svg
                                    className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    )}
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-100">
                    {sortedData.map((item, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        {columns.map((col, colIndex) => (
                          <td
                            key={col.key}
                            className={`px-3 py-2 text-sm font-mono whitespace-nowrap
                              ${col.isRowNum ? 'text-gray-400 bg-gray-50/50' : 'text-gray-900'}
                              ${colIndex > 0 ? 'border-l border-gray-100' : ''}
                              ${col.parentKey ? 'text-center' : 'text-left'}`}
                          >
                            {col.isRowNum ? rowIndex + 1 : formatCellValue(getCellValue(item, col))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
                Click column header to sort • Grouped columns shown in blue
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

TableViewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  title: PropTypes.string,
};

TableViewModal.defaultProps = {
  title: 'Table View',
};
