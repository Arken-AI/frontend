/**
 * MessageList Component
 * 
 * Scrollable container that displays all messages and inline events.
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Renders messages, thinking indicator, tool cards
 * - Welcome screen when empty
 */

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import ThinkingIndicator from '../events/ThinkingIndicator';
import ToolExecutionCard from '../events/ToolExecutionCard';
import RunProgressBar from '../events/RunProgressBar';

export default function MessageList({
  messages = [],
  isThinking = false,
  thinkingStartTime = null,
  activeTool = null,
  toolExecutions = [],
  runProgress = null,
  onSuggestionClick,
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  
  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, activeTool, toolExecutions]);
  
  // Show welcome screen if no messages
  if (messages.length === 0 && !isThinking) {
    return <WelcomeScreen onSuggestionClick={onSuggestionClick} />;
  }
  
  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin"
    >
      <div className="max-w-4xl mx-auto">
        {/* Render all messages WITHOUT tool executions */}
        {messages.map((message, index) => (
          <div key={index}>
            {/* User message */}
            {message.role === 'user' && <MessageBubble message={message} />}
            
            {/* Assistant message - no tool cards shown */}
            {message.role === 'assistant' && (
              <MessageBubble message={message} />
            )}
          </div>
        ))}
        
        {/* Only show current/active tools during processing */}
        {(isThinking || toolExecutions.length > 0 || activeTool || runProgress) && (
          <div className="space-y-4">
            {/* Currently executing tools (not yet in messages) */}
            {toolExecutions.length > 0 && (
              <div className="space-y-2">
                {toolExecutions.map((tool, index) => (
                  <ToolExecutionCard
                    key={index}
                    toolName={tool.name}
                    status={tool.status}
                    duration={tool.duration}
                    summary={tool.summary}
                    error={tool.error}
                    arguments={tool.arguments}
                  />
                ))}
              </div>
            )}
            
            {/* Active tool execution */}
            {activeTool && (
              <ToolExecutionCard
                toolName={activeTool.name}
                status="running"
                arguments={activeTool.args}
                estimatedDuration={activeTool.estimatedDuration}
              />
            )}
            
            {/* Run progress bar */}
            {runProgress && (
              <RunProgressBar
                stage={runProgress.stage}
                percentage={runProgress.percentage}
                message={runProgress.message}
                currentBlock={runProgress.currentBlock}
                totalBlocks={runProgress.totalBlocks}
              />
            )}
            
            {/* Thinking indicator */}
            {isThinking && !activeTool && (
              <ThinkingIndicator startTime={thinkingStartTime} />
            )}
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
