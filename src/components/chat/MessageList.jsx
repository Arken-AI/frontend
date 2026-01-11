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
import StreamingText from '../events/StreamingText';

export default function MessageList({
  messages = [],
  isThinking = false,
  thinkingStartTime = null,
  activeTool = null,
  toolExecutions = [],
  runProgress = null,
  streamingText = '',
  isStreaming = false,
  onSuggestionClick,
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  
  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, activeTool, toolExecutions, streamingText]);
  
  // Show welcome screen if no messages
  if (messages.length === 0 && !isThinking && !isStreaming) {
    return <WelcomeScreen onSuggestionClick={onSuggestionClick} />;
  }
  
  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin"
    >
      <div className="max-w-4xl mx-auto">
        {/* Render all messages with their tool executions */}
        {messages.map((message, index) => (
          <div key={index}>
            {/* User message */}
            {message.role === 'user' && <MessageBubble message={message} />}
            
            {/* Assistant message with tool executions */}
            {message.role === 'assistant' && (
              <>
                {/* Tool executions that happened before this message */}
                {message.toolExecutions && message.toolExecutions.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {message.toolExecutions.map((tool, toolIndex) => (
                      <ToolExecutionCard
                        key={toolIndex}
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
                {/* Assistant response */}
                <MessageBubble message={message} />
              </>
            )}
          </div>
        ))}
        
        {/* Currently executing tools (not yet in messages) */}
        {toolExecutions.length > 0 && (
          <div className="mb-4 space-y-2">
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
          <div className="mb-4">
            <ToolExecutionCard
              toolName={activeTool.name}
              status="running"
              arguments={activeTool.args}
              estimatedDuration={activeTool.estimatedDuration}
            />
          </div>
        )}
        
        {/* Run progress bar */}
        {runProgress && (
          <div className="mb-4">
            <RunProgressBar
              stage={runProgress.stage}
              percentage={runProgress.percentage}
              message={runProgress.message}
              currentBlock={runProgress.currentBlock}
              totalBlocks={runProgress.totalBlocks}
            />
          </div>
        )}
        
        {/* Thinking indicator */}
        {isThinking && !activeTool && (
          <div className="mb-4">
            <ThinkingIndicator startTime={thinkingStartTime} />
          </div>
        )}
        
        {/* Streaming text (assistant typing) */}
        {isStreaming && streamingText && (
          <div className="mb-4">
            <StreamingText text={streamingText} />
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
