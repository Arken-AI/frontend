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
    <div className={`bg-white ${compact ? 'p-2' : 'px-4 py-3'}`}>
      <div className={compact ? '' : 'max-w-4xl mx-auto'}>
        <div className={`flex items-end gap-2 ${compact ? '' : 'bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-200'}`}>
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
                className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-blue-300 focus:bg-white disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-400 transition-all duration-200"
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
                className="w-full resize-none bg-transparent text-gray-900 text-sm px-1 py-1 focus:outline-none disabled:text-gray-400 placeholder:text-gray-400"
                style={{ minHeight: '36px', maxHeight: '200px' }}
              />
            )}
          </div>
          
          {/* Send or Stop button */}
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className={`flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-9 h-9'} flex items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-105`}
              title="Stop request"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`
                flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-9 h-9'} flex items-center justify-center rounded-xl
                transition-all duration-200
                ${canSend 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow hover:scale-105' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
              title={isDisabled ? 'Please wait...' : 'Send message (Enter)'}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        
        {/* Helper text - hide in compact mode */}
        {!compact && (
          <p className="text-[11px] text-gray-300 mt-2 text-center">
          {isProcessing ? (
            <span className="text-amber-500">Processing... Click stop to cancel</span>
          ) : (
            <>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono text-[10px]">Enter</kbd>
              <span className="mx-1">to send</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono text-[10px]">Shift + Enter</kbd>
              <span className="ml-1">new line</span>
            </>
          )}
        </p>
        )}
      </div>
    </div>
  );
}
