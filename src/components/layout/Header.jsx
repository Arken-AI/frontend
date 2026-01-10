/**
 * Header Component
 * 
 * Top navigation bar with:
 * - Mobile menu toggle
 * - App title
 * - Health indicator
 */

import { useState, useEffect } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { checkHealth } from '../../api/client';
import { Menu, Settings, Wifi, WifiOff } from 'lucide-react';

export default function Header({ onMenuClick }) {
  const { conversationId, conversations } = useChatContext();
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

    // Check immediately
    checkBackendHealth();

    // Check every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'healthy';

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
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

        {/* App title */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900">
            MCP Chat
          </h1>
          
          {/* Current conversation title (desktop only) */}
          {currentConversation && (
            <span className="hidden lg:block text-sm text-gray-500 max-w-xs truncate">
              / {currentConversation.title || 'Untitled'}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Health indicator */}
        <div
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
            ${healthLoading 
              ? 'bg-gray-100 text-gray-500' 
              : isHealthy 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }
          `}
          title={health?.error || (isHealthy ? 'Backend connected' : 'Backend disconnected')}
        >
          {healthLoading ? (
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          ) : isHealthy ? (
            <Wifi size={12} />
          ) : (
            <WifiOff size={12} />
          )}
          <span className="hidden sm:inline">
            {healthLoading ? 'Checking...' : isHealthy ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Settings button (placeholder for future) */}
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
