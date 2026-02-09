/**
 * Header Component
 *
 * Top navigation bar with:
 * - App branding
 * - Page title/breadcrumb
 * - Health indicator (styled as badge)
 * - Action buttons
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChatContext } from "../../context/ChatContext";
import { useAuth } from "../../context/AuthContext";
import { checkHealth } from "../../api/client";
import { Menu, Settings, ChevronRight, Eye, LogOut, User } from "lucide-react";

/**
 * Health Badge - Consistent with Equipment Browser badges
 */
function HealthBadge({ status, loading }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-gray-50 text-gray-400">
        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" />
        <span className="hidden sm:inline">Checking...</span>
      </span>
    );
  }

  const isHealthy = status?.status === "healthy";

  return (
    <span
      className={`
      inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors
      ${isHealthy ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}
    `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-red-400 animate-pulse"}`}
      />
      <span className="hidden sm:inline">
        {isHealthy ? "Connected" : "Disconnected"}
      </span>
    </span>
  );
}

export default function Header({
  onMenuClick,
  title = "ARKEN AI",
  subtitle,
  showBackButton = false,
  onBackClick,
}) {
  const navigate = useNavigate();
  const { conversationId, conversations, latestRunId } = useChatContext();
  const { username, logout } = useAuth();
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Get current conversation info
  const currentConversation = conversations.find(
    (c) => c.conversation_id === conversationId,
  );

  // Check backend health on mount and periodically
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const healthData = await checkHealth();
        setHealth(healthData);
      } catch (error) {
        setHealth({ status: "unhealthy", error: error.message });
      } finally {
        setHealthLoading(false);
      }
    };

    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-gray-400 hover:text-gray-600 
                   hover:bg-gray-50 rounded-xl transition-all duration-200"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        {/* App branding + breadcrumb */}
        <div className="flex items-center gap-2.5">
          <img
            src="/arken-logo.svg"
            alt="Arken AI"
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <h1 className="text-sm font-bold tracking-tight text-gray-900">
            {title}
          </h1>

          {/* Breadcrumb separator + subtitle */}
          {subtitle && (
            <>
              <ChevronRight size={14} className="text-gray-300" />
              <span className="text-sm font-medium text-gray-500">
                {subtitle}
              </span>
            </>
          )}

          {/* Current conversation title (if no subtitle) */}
          {!subtitle && currentConversation && (
            <>
              <ChevronRight size={14} className="text-gray-300" />
              <span className="hidden lg:block text-sm text-gray-400 max-w-xs truncate">
                {currentConversation.title || "Untitled"}
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium
                     text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100
                     rounded-xl transition-all duration-200 shadow-sm"
            title="View latest simulation results"
          >
            <Eye size={15} />
            <span className="hidden sm:inline">View Flowsheet</span>
          </button>
        )}

        {/* Health indicator */}
        <HealthBadge status={health} loading={healthLoading} />

        {/* Settings button */}
        <button
          className="p-2 text-gray-400 hover:text-gray-600 
                   hover:bg-gray-50 rounded-xl transition-all duration-200"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        {/* User display & logout */}
        {username && (
          <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-200">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <User size={15} className="text-gray-400" />
              <span
                className="hidden sm:inline font-medium max-w-[120px] truncate"
                title={username}
              >
                {username}
              </span>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 
                       hover:bg-red-50 rounded-lg transition-all duration-200"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
