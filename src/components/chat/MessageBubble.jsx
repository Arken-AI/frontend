/**
 * MessageBubble Component
 * 
 * Displays individual chat messages (user or assistant).
 * User messages are right-aligned with blue background.
 * Assistant messages are left-aligned with gray background and markdown support.
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { formatTime } from '../../utils/formatters';
import MarkdownRenderer from '../markdown/MarkdownRenderer';

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);
  
  const isUser = message.role === 'user';
  const timestamp = message.timestamp ? formatTime(message.timestamp) : '';
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          {timestamp && (
            <p className="text-xs text-gray-400 mt-1 text-right">{timestamp}</p>
          )}
        </div>
      </div>
    );
  }
  
  // Assistant message - full width
  return (
    <div className="mb-4 group w-full">
      <div className="w-full">
        <div className="bg-white px-6 py-4 relative">
          {/* Markdown content */}
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={message.content} />
          </div>
          
          {/* Copy button - appears on hover */}
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-100/80 hover:bg-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Copy message"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
        
        {/* Timestamp and metadata */}
        <div className="flex items-center gap-2 mt-1 px-6">
          {timestamp && (
            <p className="text-xs text-gray-400">{timestamp}</p>
          )}
          {message.metadata?.tool_calls && message.metadata.tool_calls.length > 0 && (
            <span className="text-xs text-gray-400">
              • {message.metadata.tool_calls.length} tool{message.metadata.tool_calls.length > 1 ? 's' : ''} used
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
