/**
 * MessageInput Component
 * 
 * Text input with send button for composing messages.
 * Features:
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for new line
 * - Disabled state during processing
 * - Stop/Cancel button when request is in progress
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Square } from 'lucide-react';

export default function MessageInput({ 
  onSend, 
  onCancel,
  disabled = false, 
  isProcessing = false,
  placeholder = "Type your message...",
  compact = false
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  
  // Auto-resize textarea (only for non-compact mode)
  useEffect(() => {
    if (compact) return; // Skip for compact mode - uses fixed-height input
    
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '48px';
      const newHeight = Math.max(48, Math.min(textarea.scrollHeight, 200));
      textarea.style.height = newHeight + 'px';
    }
  }, [message, compact]);
  
  // Focus textarea on mount
  useEffect(() => {
    if (!disabled && !isProcessing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled, isProcessing]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isSending) return;
    
    // Clear message immediately before sending
    setMessage('');
    setIsSending(true);
    
    try {
      await onSend(trimmedMessage);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore message on error
      setMessage(trimmedMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  const isDisabled = disabled || isSending;
  const canSend = message.trim().length > 0 && !isDisabled && !isProcessing;
  
  return (
    <div className={`border-t border-border-faint bg-surface ${compact ? 'p-2' : 'p-4'}`}>
      <div className={compact ? '' : 'max-w-4xl mx-auto'}>
        <div className="flex items-center gap-2">
          {/* Textarea or Input */}
          <div className="flex-1">
            {compact ? (
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full h-10 px-3 text-sm rounded-lg border border-border bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-surface-secondary disabled:text-content-secondary placeholder:text-content-tertiary"
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="w-full resize-none rounded-lg border border-border bg-surface text-content px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-surface-secondary disabled:text-content-secondary placeholder:text-content-tertiary transition-colors"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
            )}
          </div>
          
          {/* Send or Stop button */}
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className={`flex-shrink-0 ${compact ? 'w-10 h-10' : 'p-3'} flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow transition-all duration-200`}
              title="Stop request"
            >
              <Square className={compact ? 'w-4 h-4 fill-current' : 'w-5 h-5 fill-current'} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`
                flex-shrink-0 ${compact ? 'w-10 h-10' : 'p-3'} flex items-center justify-center rounded-lg
                transition-all duration-200
                ${canSend 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
              title={isDisabled ? 'Please wait...' : 'Send message (Enter)'}
            >
              {isSending ? (
                <Loader2 className={compact ? 'w-4 h-4 animate-spin' : 'w-5 h-5 animate-spin'} />
              ) : (
                <Send className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
              )}
            </button>
          )}
        </div>
        
        {/* Helper text - hide in compact mode */}
        {!compact && (
          <p className="text-xs text-content-tertiary mt-2 text-center">
          {isProcessing ? (
            <span className="text-orange-500 dark:text-orange-400">Processing... Click stop button to cancel</span>
          ) : (
            <>
              Press <kbd className="px-1.5 py-0.5 bg-surface-secondary rounded text-content-secondary">Enter</kbd> to send, 
              <kbd className="px-1.5 py-0.5 bg-surface-secondary rounded text-content-secondary ml-1">Shift + Enter</kbd> for new line
            </>
          )}
        </p>
        )}
      </div>
    </div>
  );
}
