import { ExpandSidebarButton, ExpandChatButton } from '../layout/ExpandButtons';

export function FlowsheetCanvas() {
  return (
    <div className="relative h-full bg-background">
      <ExpandSidebarButton />
      <ExpandChatButton />
      
      {/* Canvas content */}
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-muted-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Flowsheet Diagram
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Equipment nodes and stream connections will be displayed here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
