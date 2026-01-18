import { ChevronRight } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

export function ExpandSidebarButton() {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  if (!isSidebarCollapsed) {
    return null;
  }

  return (
    <button
      onClick={toggleSidebar}
      className={cn(
        "absolute top-2 left-2 z-10",
        "p-2 rounded-md bg-secondary border border-border",
        "hover:bg-accent transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring"
      )}
      title="Expand sidebar"
      aria-label="Expand sidebar"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  );
}

export function ExpandChatButton() {
  const isChatCollapsed = useUIStore((state) => state.isChatCollapsed);
  const toggleChat = useUIStore((state) => state.toggleChat);

  if (!isChatCollapsed) {
    return null;
  }

  return (
    <button
      onClick={toggleChat}
      className={cn(
        "absolute top-2 right-2 z-10",
        "p-2 rounded-md bg-secondary border border-border",
        "hover:bg-accent transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring"
      )}
      title="Expand chat"
      aria-label="Expand chat"
    >
      <ChevronRight className="w-4 h-4 rotate-180" />
    </button>
  );
}
