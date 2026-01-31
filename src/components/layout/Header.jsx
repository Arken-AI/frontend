/**
 * Header Component
 * 
 * Top navigation bar with:
 * - App branding
 * - Page title/breadcrumb
 * - Health indicator (styled as badge)
 * - Action buttons
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '../../context/ChatContext';
import { checkHealth } from '../../api/client';
import { Menu, Settings, Wifi, WifiOff, ChevronRight, Eye } from 'lucide-react';

/**
 * Health Badge - Consistent with Equipment Browser badges
 */
function HealthBadge({ status, loading }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border border-gray-300 text-gray-500 bg-gray-50">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="hidden sm:inline">Checking...</span>
      </span>
    );
  }
  
  const isHealthy = status?.status === 'healthy';
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border
      ${isHealthy 
        ? 'border-green-300 text-green-600 bg-green-50' 
        : 'border-red-300 text-red-500 bg-red-50'
      }
    `}>
      {isHealthy ? <Wifi size={12} /> : <WifiOff size={12} />}
      <span className="hidden sm:inline">
        {isHealthy ? 'Connected' : 'Disconnected'}
      </span>
    </span>
  );
}

export default function Header({ 
  onMenuClick, 
  title = 'ARKEN AI',
  subtitle,
  showBackButton = false,
  onBackClick
}) {
  const navigate = useNavigate();
  const { conversationId, conversations, latestRunId } = useChatContext();
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Get current conversation info
  const currentConversation = conversations.find(
    (c) => c.conversation_id === conversationId
  );

  // Check backend health on mount and periodically
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const healthData = await checkHealth();
        setHealth(healthData);
      } catch (error) {
        setHealth({ status: 'unhealthy', error: error.message });
      } finally {
        setHealthLoading(false);
      }
    };

    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-12 bg-white border-b border-gray-100 px-4 flex items-center justify-between shrink-0 shadow-sm">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 
                   hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* App branding + breadcrumb */}
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-gray-900">
            {title}
          </h1>
          
          {/* Breadcrumb separator + subtitle */}
          {subtitle && (
            <>
              <ChevronRight size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                {subtitle}
              </span>
            </>
          )}
          
          {/* Current conversation title (if no subtitle) */}
          {!subtitle && currentConversation && (
            <>
              <ChevronRight size={16} className="text-gray-400" />
              <span className="hidden lg:block text-sm text-gray-500 max-w-xs truncate">
                {currentConversation.title || 'Untitled'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* View Flowsheet button - only show if there's a recent simulation */}
        {latestRunId && (
          <button
            onClick={() => navigate(`/results/${latestRunId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100
                     border border-blue-200 rounded-lg transition-colors"
            title="View latest simulation results"
          >
            <Eye size={16} />
            <span className="hidden sm:inline">View Flowsheet</span>
          </button>
        )}
        
        {/* Health indicator */}
        <HealthBadge status={health} loading={healthLoading} />

        {/* Settings button */}
        <button
          className="p-2 text-gray-500 hover:text-gray-700 
                   hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
