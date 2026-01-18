import { ChevronLeft } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const activeSection = useUIStore((state) => state.activeSection);

  // Map section IDs to readable titles
  const sectionTitles: Record<string, string> = {
    equipment: 'Equipment Browser',
    details: 'Details',
    thermo: 'Thermodynamics',
    warnings: 'Warnings',
    history: 'Run History',
  };

  const title = sectionTitles[activeSection] || 'Sidebar';

  if (isSidebarCollapsed) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/50">
        <h2 className="text-sm font-semibold text-foreground truncate">
          {title}
        </h2>
        <button
          onClick={toggleSidebar}
          className={cn(
            "p-1 rounded-md hover:bg-accent transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring"
          )}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </div>
  );
}
