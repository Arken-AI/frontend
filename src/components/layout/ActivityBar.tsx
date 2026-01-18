import { 
  FileBox, 
  ClipboardList, 
  Thermometer, 
  AlertTriangle, 
  History 
} from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import type { ActivitySection } from '../../types';

interface ActivityBarItem {
  id: ActivitySection;
  icon: typeof FileBox;
  label: string;
}

const activityItems: ActivityBarItem[] = [
  { id: 'equipment', icon: FileBox, label: 'Equipment Browser' },
  { id: 'details', icon: ClipboardList, label: 'Details' },
  { id: 'thermo', icon: Thermometer, label: 'Thermodynamics' },
  { id: 'warnings', icon: AlertTriangle, label: 'Warnings' },
  { id: 'history', icon: History, label: 'Run History' },
];

export function ActivityBar() {
  const activeSection = useUIStore((state) => state.activeSection);
  const setActiveSection = useUIStore((state) => state.setActiveSection);

  return (
    <div className="w-12 bg-secondary border-r border-border flex flex-col items-center py-2 gap-1">
      {activityItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-md",
              "transition-colors duration-150",
              "hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isActive && "bg-accent text-accent-foreground"
            )}
            title={item.label}
            aria-label={item.label}
            aria-pressed={isActive}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
}
