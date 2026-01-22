/**
 * Warnings Panel
 * 
 * Displays all simulation warnings grouped by equipment.
 * Allows users to quickly identify and navigate to issues.
 */

import { useState } from 'react';
import WarningCard from './WarningCard';
import { NoWarnings } from '../common/EmptyState';

export default function WarningsPanel({ warningsData }) {
  const [filter, setFilter] = useState('all'); // 'all', 'warnings', 'info'
  
  const { equipmentWarnings, globalWarnings, totalCount } = warningsData;
  
  // Empty state
  if (totalCount === 0) {
    return <NoWarnings />;
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Warnings List - with padding around cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                <span className="text-sm font-semibold text-gray-900">
                  Process-Level Warnings
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border border-blue-300 text-blue-600 bg-blue-50">
                {globalWarnings.length}
              </span>
            </div>
            <div className="space-y-2">
              {globalWarnings.map((warning, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700 leading-relaxed"
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
