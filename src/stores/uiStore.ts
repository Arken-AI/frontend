import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, ActivitySection } from '../types';

interface UIStore {
  // Active section in sidebar
  activeSection: ActivitySection;
  setActiveSection: (section: ActivitySection) => void;
  
  // Sidebar collapsed state
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Chat panel collapsed state
  isChatCollapsed: boolean;
  toggleChat: () => void;
  setChatCollapsed: (collapsed: boolean) => void;
  
  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  
  // Loading overlay
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (isLoading: boolean, message?: string) => void;
  
  // Panel sizes
  leftPanelWidth: number;
  rightPanelWidth: number;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Initial state
      activeSection: 'equipment',
      isSidebarCollapsed: false,
      isChatCollapsed: false,
      theme: 'light',
      isLoading: false,
      loadingMessage: '',
      leftPanelWidth: 300,
      rightPanelWidth: 350,
      
      // Actions
      setActiveSection: (section) => set({ activeSection: section }),
      
      toggleSidebar: () => set((state) => ({ 
        isSidebarCollapsed: !state.isSidebarCollapsed 
      })),
      
      setSidebarCollapsed: (collapsed) => set({ 
        isSidebarCollapsed: collapsed 
      }),
      
      toggleChat: () => set((state) => ({ 
        isChatCollapsed: !state.isChatCollapsed 
      })),
      
      setChatCollapsed: (collapsed) => set({ 
        isChatCollapsed: collapsed 
      }),
      
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
      
      setTheme: (theme) => set({ theme }),
      
      setLoading: (isLoading, message = '') => set({
        isLoading,
        loadingMessage: message
      }),
      
      setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),
      
      setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
    }),
    {
      name: 'arken-ui-store', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        theme: state.theme,
        leftPanelWidth: state.leftPanelWidth,
        rightPanelWidth: state.rightPanelWidth,
        activeSection: state.activeSection,
      }),
    }
  )
);

// Apply theme to document on initialization
if (typeof window !== 'undefined') {
  useUIStore.subscribe((state) => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });
  
  // Apply initial theme
  const initialTheme = useUIStore.getState().theme;
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
}
