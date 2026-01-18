import { 
  Panel, 
  Group, 
  Separator 
} from 'react-resizable-panels';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { SidebarContent } from '../sidebar/SidebarContent';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

interface ThreePanelLayoutProps {
  leftPanel?: React.ReactNode;
  middlePanel: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function ThreePanelLayout({
  leftPanel,
  middlePanel,
  rightPanel,
}: ThreePanelLayoutProps) {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const isChatCollapsed = useUIStore((state) => state.isChatCollapsed);
  const leftPanelWidth = useUIStore((state) => state.leftPanelWidth);
  const rightPanelWidth = useUIStore((state) => state.rightPanelWidth);
  const setLeftPanelWidth = useUIStore((state) => state.setLeftPanelWidth);
  const setRightPanelWidth = useUIStore((state) => state.setRightPanelWidth);

  return (
    <div className="flex h-full">
      {/* Activity Bar (fixed width) */}
      <ActivityBar />

      {/* Resizable Panels */}
      <Group orientation="horizontal" className="flex-1">
        {/* Left Panel (Sidebar) */}
        {!isSidebarCollapsed && (
          <>
            <Panel
              defaultSize={leftPanelWidth}
              minSize={15}
              maxSize={40}
              onResize={(size) => {
                if (typeof size === 'number') {
                  setLeftPanelWidth(size);
                }
              }}
              className="bg-background"
            >
              <Sidebar>
                {leftPanel || <SidebarContent />}
              </Sidebar>
            </Panel>
            <Separator className={cn(
              "w-1 bg-border hover:bg-primary transition-colors",
              "cursor-col-resize"
            )} />
          </>
        )}

        {/* Middle Panel (Flowsheet Canvas) */}
        <Panel
          defaultSize={isSidebarCollapsed && isChatCollapsed ? 100 : 50}
          minSize={30}
          className="bg-background"
        >
          {middlePanel}
        </Panel>

        {/* Right Panel (Chat) */}
        {!isChatCollapsed && (
          <>
            <Separator className={cn(
              "w-1 bg-border hover:bg-primary transition-colors",
              "cursor-col-resize"
            )} />
            <Panel
              defaultSize={rightPanelWidth}
              minSize={20}
              maxSize={40}
              onResize={(size) => {
                if (typeof size === 'number') {
                  setRightPanelWidth(size);
                }
              }}
              className="bg-background"
            >
              {rightPanel}
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
}
