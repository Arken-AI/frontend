/**
 * MessageBubble Component
 * 
 * Displays individual chat messages (user or assistant).
 * User messages are right-aligned with blue background.
 * Assistant messages are left-aligned with gray background and markdown support.
 * Shows status indicators for incomplete/error/cancelled messages.
 * Action buttons: copy, retry (like Claude Desktop).
 */

import { useState } from 'react';
import { Copy, Check, AlertCircle, XCircle, Loader2, FileText, RotateCcw } from 'lucide-react';
import MarkdownRenderer from '../markdown/MarkdownRenderer';

// Status indicator component
function MessageStatusIndicator({ status }) {
  if (!status || status === 'complete') return null;
  
  const statusConfig = {
    streaming: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      text: 'Response may be incomplete',
      className: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      text: 'Response was interrupted',
      className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    },
    cancelled: {
      icon: <XCircle className="w-4 h-4" />,
      text: 'Response was cancelled',
      className: 'text-content-secondary bg-surface-secondary border-border'
    }
  };
  
  const config = statusConfig[status];
  if (!config) return null;
  
  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border mt-2 ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

export default function MessageBubble({ message, onRetry, isLastAssistant = false, isLastUser = false }) {
  const [copied, setCopied] = useState(false);
  
  const isUser = message.role === 'user';
  const status = message.status || 'complete';
  
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
    const userAttachments = message.attachments || message.metadata?.attachments || [];
    const hasAttachments = userAttachments.length > 0;
    const hasText = message.content && message.content.trim();

    return (
      <div className="flex justify-end mb-4 group">
        <div className="max-w-[80%] md:max-w-[70%]">
          <div className={`bg-blue-500 text-white overflow-hidden ${!hasText && hasAttachments ? 'p-1.5' : ''}`} style={{ borderRadius: '4px' }}>
            {/* Image attachments inside the bubble */}
            {hasAttachments && (
              <div className={`flex flex-wrap gap-1.5 ${hasText ? 'p-1.5 pb-0' : ''}`}>
                {userAttachments.map((att, idx) => {
                  const isPdf = att.media_type === 'application/pdf';
                  const isDocx = att.media_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                  const hasImageData = !isPdf && !isDocx && (att.preview || att.data);

                  if (isPdf) {
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-400/60 rounded text-white/90">
                        <FileText className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm truncate max-w-[200px]">{att.filename || 'Document.pdf'}</span>
                      </div>
                    );
                  }

                  if (isDocx) {
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-400/60 rounded text-white/90">
                        <FileText className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm truncate max-w-[200px]">{att.filename || 'Document.docx'}</span>
                      </div>
                    );
                  }

                  if (hasImageData) {
                    return (
                      <img
                        key={idx}
                        src={att.preview || `data:${att.media_type};base64,${att.data}`}
                        alt={att.filename || 'attachment'}
                        className="max-w-[240px] max-h-[180px] min-w-[100px] object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          const src = att.preview || `data:${att.media_type};base64,${att.data}`;
                          window.open(src, '_blank');
                        }}
                      />
                    );
                  }

                  return (
                    <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-400/60 rounded text-white/90 text-xs">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate max-w-[140px]">{att.filename || 'File attached'}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Text content */}
            {hasText && (
              <div className="px-4 py-3">
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            )}
          </div>

          {/* Action buttons — right-aligned, appear on hover */}
          <div className="flex justify-end items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy */}
            <button
              onClick={handleCopy}
              className="p-1.5 transition-colors"
              style={{ borderRadius: '2px', color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-approved)' }} />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Retry — only on the last user message */}
            {isLastUser && onRetry && (
              <button
                onClick={onRetry}
                className="p-1.5 transition-colors"
                style={{ borderRadius: '2px', color: 'var(--color-text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Resend this message"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Assistant message - full width
  return (
    <div className="mb-4 group w-full">
      <div className="w-full">
        <div
          className={`px-6 py-4 relative ${status === 'error' ? 'border-l-2' : ''}`}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: status === 'error' ? 'var(--color-error)' : undefined,
          }}
        >
          {/* Markdown content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownRenderer content={message.content} />
          </div>
          
          {/* Status indicator for incomplete messages */}
          <MessageStatusIndicator status={status} />
        </div>
        
        {/* Action buttons — always visible below the message (like Claude) */}
        <div className="flex items-center gap-1 px-6 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 transition-colors"
            style={{ borderRadius: '2px', color: 'var(--color-text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Copy message"
          >
            {copied ? (
              <Check className="w-4 h-4" style={{ color: 'var(--color-approved)' }} />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Retry — only on the last assistant message */}
          {isLastAssistant && onRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 transition-colors"
              style={{ borderRadius: '2px', color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Retry this response"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Metadata */}
        {message.metadata?.tool_calls && message.metadata.tool_calls.length > 0 && (
          <div className="flex items-center gap-2 mt-1 px-6">
            <span className="text-xs text-content-tertiary">
              {message.metadata.tool_calls.length} tool{message.metadata.tool_calls.length > 1 ? 's' : ''} used
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
