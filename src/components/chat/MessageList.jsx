/**
 * MessageList Component
 *
 * Scrollable container that displays all messages and inline events.
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Renders interleaved agent steps (text + tool cards) in real-time
 * - Backward-compatible fallback for messages without agentSteps
 */

import { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';
import ThinkingIndicator from '../events/ThinkingIndicator';
import ToolExecutionCard from '../events/ToolExecutionCard';
import RunProgressBar from '../events/RunProgressBar';
import AgentTextBlock from '../events/AgentTextBlock';

export default function MessageList({
  messages = [],
  isThinking = false,
  thinkingStartTime = null,
  activeTool = null,
  toolExecutions = [],
  runProgress = null,
  agentSteps = [],
  onSuggestionClick,
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, activeTool, toolExecutions, agentSteps]);

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
        {/* Render all messages with their inline tool executions */}
        {messages.map((message, index) => (
          <div key={index}>
            {/* User message */}
            {message.role === 'user' && <MessageBubble message={message} />}

            {/* Assistant message — interleaved steps or fallback tool cards */}
            {message.role === 'assistant' && (
              <div>
                {message.agentSteps?.length > 0 ? (
                  /* New: interleaved steps display */
                  <div className="space-y-1.5 mb-3">
                    {message.agentSteps.map((step, i) => {
                      if (step.type === 'text' && !step.isFinal)
                        return <AgentTextBlock key={i} content={step.content} />;
                      if (step.type === 'tool')
                        return (
                          <ToolExecutionCard
                            key={i}
                            toolName={step.toolName || step.tool_name || step.name}
                            status={step.status}
                            duration={step.durationMs || step.duration_ms || step.duration}
                            summary={step.summary}
                            error={step.error}
                            arguments={step.arguments || step.args}
                            result={step.result}
                          />
                        );
                      return null;
                    })}
                  </div>
                ) : message.toolExecutions?.length > 0 ? (
                  /* Fallback: flat tool cards for old conversations */
                  <div className="space-y-1.5 mb-3">
                    {message.toolExecutions.map((tool, i) => (
                      <ToolExecutionCard
                        key={i}
                        toolName={tool.tool_name || tool.name}
                        status={tool.status}
                        duration={tool.duration_ms || tool.duration}
                        summary={tool.summary}
                        error={tool.error}
                        arguments={tool.arguments}
                        result={tool.result}
                      />
                    ))}
                  </div>
                ) : null}
                <MessageBubble message={message} />
              </div>
            )}
          </div>
        ))}

        {/* Live processing — ordered step-by-step display */}
        {isThinking && agentSteps.length > 0 && (
          <div className="space-y-1.5 mt-1">
            {agentSteps.map((step, index) => {
              if (step.type === 'text')
                return <AgentTextBlock key={index} content={step.content} />;
              if (step.type === 'tool_running')
                return (
                  <ToolExecutionCard
                    key={index}
                    toolName={step.name}
                    status="running"
                    arguments={step.args}
                    estimatedDuration={step.estimatedDuration}
                  />
                );
              if (step.type === 'tool')
                return (
                  <ToolExecutionCard
                    key={index}
                    toolName={step.name}
                    status={step.status}
                    duration={step.duration}
                    summary={step.summary}
                    error={step.error}
                    arguments={step.args}
                    result={step.result}
                  />
                );
              return null;
            })}

            {/* Run progress bar inside steps */}
            {runProgress && (
              <RunProgressBar
                stage={runProgress.stage}
                percentage={runProgress.percentage}
                message={runProgress.message}
                currentBlock={runProgress.currentBlock}
                totalBlocks={runProgress.totalBlocks}
              />
            )}

            {/* Inline thinking indicator between iterations */}
            {!activeTool && !runProgress && (
              <ThinkingIndicator startTime={thinkingStartTime} />
            )}
          </div>
        )}

        {/* Initial thinking indicator (no steps yet) */}
        {isThinking && agentSteps.length === 0 && (
          <div className="mt-1">
            <ThinkingIndicator startTime={thinkingStartTime} />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
