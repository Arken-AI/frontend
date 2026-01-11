/**
 * ThinkingIndicator Component
 * 
 * Animated indicator shown when LLM is processing.
 * Shows elapsed time.
 */

import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

export default function ThinkingIndicator({ startTime = null }) {
  const [elapsed, setElapsed] = useState(0);
  
  // Update elapsed time every 100ms
  useEffect(() => {
    if (!startTime) return;
    
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  const elapsedSeconds = (elapsed / 1000).toFixed(1);
  
  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
      <div className="relative">
        <Brain className="w-5 h-5 text-blue-500" />
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-blue-700">Thinking</span>
        
        {/* Animated dots */}
        <span className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </span>
        
        {/* Elapsed time */}
        {startTime && elapsed > 500 && (
          <span className="text-xs text-blue-500 ml-2">
            {elapsedSeconds}s
          </span>
        )}
      </div>
    </div>
  );
}
