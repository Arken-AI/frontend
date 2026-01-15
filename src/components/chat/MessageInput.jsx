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
  placeholder = "Type your message..." 
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);
  
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
    <div className="border-t bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={`
                w-full resize-none rounded-xl border border-gray-300 
                px-4 py-3 pr-12
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                placeholder:text-gray-400
                transition-colors
              `}
              style={{ maxHeight: '200px', minHeight: '48px' }}
            />
            
            {/* Character count (optional, shown when near limit) */}
            {message.length > 8000 && (
              <span className={`absolute bottom-2 right-14 text-xs ${message.length > 10000 ? 'text-red-500' : 'text-gray-400'}`}>
                {message.length}/10000
              </span>
            )}
          </div>
          
          {/* Send or Stop button */}
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className="flex-shrink-0 p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
              title="Stop request"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`
                flex-shrink-0 p-3 rounded-xl
                transition-all duration-200
                ${canSend 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
              title={isDisabled ? 'Please wait...' : 'Send message (Enter)'}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        
        {/* Helper text */}
        <p className="text-xs text-gray-400 mt-2 text-center">
          {isProcessing ? (
            <span className="text-orange-500">Processing... Click stop button to cancel</span>
          ) : (
            <>
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd> to send, 
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 ml-1">Shift + Enter</kbd> for new line
            </>
          )}
        </p>
      </div>
    </div>
  );
}
