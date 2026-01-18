import { ChevronLeft } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

export function ChatPanel() {
  const toggleChat = useUIStore((state) => state.toggleChat);

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/50">
        <h2 className="text-sm font-semibold text-foreground">Chat</h2>
        <button
          onClick={toggleChat}
          className={cn(
            "p-1 rounded-md hover:bg-accent transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring"
          )}
          title="Collapse chat"
          aria-label="Collapse chat"
        >
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="text-center space-y-4 mt-8">
          <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-muted-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Chat messages will appear here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask questions about the simulation or request changes
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask about the simulation..."
            disabled
            className={cn(
              "flex-1 px-3 py-2 text-sm rounded-md",
              "bg-background border border-input",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <button
            disabled
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
