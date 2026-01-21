/**
 * Warnings Panel
 * 
 * Displays all simulation warnings grouped by equipment.
 * Allows users to quickly identify and navigate to issues.
 */

import { useState } from 'react';
import WarningCard from './WarningCard';

export default function WarningsPanel({ warningsData }) {
  const [filter, setFilter] = useState('all'); // 'all', 'warnings', 'info'
  
  const { equipmentWarnings, globalWarnings, totalCount } = warningsData;
  
  // Empty state
  if (totalCount === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-content mb-2">No Warnings</h3>
          <p className="text-sm text-content-secondary">
            All equipment converged successfully with no issues.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none px-3 py-2.5 border-b border-border bg-surface-secondary">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content flex items-center gap-2">
            <span>⚠️</span>
            <span>Warnings</span>
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-status-warning/20 text-status-warning">
              {totalCount}
            </span>
          </h2>
          
          {/* Filter - can be expanded later */}
          {/* <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="warnings">Warnings Only</option>
            <option value="info">Info Only</option>
          </select> */}
        </div>
      </div>
      
      {/* Warnings List */}
      <div className="flex-1 overflow-y-auto">
        {/* Equipment Warnings */}
        {equipmentWarnings.map((item) => (
          <WarningCard 
            key={item.equipmentId}
            equipmentId={item.equipmentId}
            equipmentName={item.equipmentName}
            icon={item.icon}
            warnings={item.warnings}
          />
        ))}
        
        {/* Global/Process-Level Warnings */}
        {globalWarnings.length > 0 && (
          <div className="border-b border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                <span className="text-sm font-semibold text-content-secondary">
                  Process-Level Warnings
                </span>
              </div>
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                {globalWarnings.length}
              </span>
            </div>
            <div className="space-y-2">
              {globalWarnings.map((warning, idx) => (
                <div 
                  key={idx}
                  className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-content-secondary leading-relaxed"
                >
                  <span className="text-blue-600 mr-1.5">ℹ️</span>
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
