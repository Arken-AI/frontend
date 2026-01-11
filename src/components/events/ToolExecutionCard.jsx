/**
 * ToolExecutionCard Component
 * 
 * Displays tool execution status with collapsible details.
 * States: running, success, error
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, Check, X, Loader2 } from 'lucide-react';
import { formatDuration, getStatusColor } from '../../utils/formatters';

export default function ToolExecutionCard({
  toolName,
  status = 'running', // 'running' | 'success' | 'error'
  duration = null,
  summary = null,
  error = null,
  arguments: args = null,
  estimatedDuration = null,
}) {
  const [expanded, setExpanded] = useState(false);
  
  const statusConfig = {
    running: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      label: 'Running...',
    },
    success: {
      icon: <Check className="w-4 h-4" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      label: 'Success',
    },
    error: {
      icon: <X className="w-4 h-4" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      label: 'Error',
    },
  };
  
  const config = statusConfig[status] || statusConfig.running;
  
  // Format tool name for display
  const displayName = toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Wrench className={`w-4 h-4 ${config.text}`} />
          <span className={`font-medium ${config.text}`}>{displayName}</span>
          
          {/* Status badge */}
          <span className={`flex items-center gap-1 text-xs ${config.text}`}>
            {config.icon}
            {status !== 'running' && duration && (
              <span className="ml-1">{formatDuration(duration)}</span>
            )}
          </span>
        </div>
        
        {/* Expand/collapse icon */}
        <div className={`${config.text}`}>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>
      
      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-200/50">
          {/* Arguments */}
          {args && Object.keys(args).length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Arguments:</p>
              <pre className="text-xs bg-white/70 p-2 rounded overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Summary */}
          {summary && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Result:</p>
              <p className="text-sm text-gray-700">{summary}</p>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-500 mb-1">Error:</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {/* Estimated duration for running tools */}
          {status === 'running' && estimatedDuration && (
            <p className="text-xs text-gray-500 mt-2">
              Estimated: ~{formatDuration(estimatedDuration)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
