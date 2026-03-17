/**
 * MessageInput Component
 * 
 * Text input with send button for composing messages.
 * Features:
 * - Auto-resizing textarea
 * - Enter to send, Shift+Enter for new line
 * - Image/PDF/DOCX attachment support (paste, drag-drop, file picker)
 * - Voice input via Web Speech API (STT) — mic button with live transcription
 * - Inline attachment chips inside the input border (VS Code Copilot style)
 * - Disabled state during processing
 * - Stop/Cancel button when request is in progress
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Square, Paperclip, X, Image as ImageIcon, FileText, Mic, MicOff } from 'lucide-react';

// Maximum total size across all attachments (20 MB)
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_ATTACHMENTS = 5;

/**
 * Convert a File to an attachment object with base64 data.
 * @param {File} file
 * @returns {Promise<{media_type: string, data: string, filename: string, preview: string}>}
 */
function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result; // "data:<mime>;base64,<data>"
      const base64 = dataUrl.split(',')[1];
      const isImage = IMAGE_TYPES.includes(file.type);
      resolve({
        media_type: file.type,
        data: base64,
        filename: file.name,
        preview: isImage ? dataUrl : null, // No image preview for PDFs
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Truncate filename for chip display */
function truncateFilename(name, maxLen = 22) {
  if (!name || name.length <= maxLen) return name || 'file';
  const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
  const stem = name.slice(0, maxLen - ext.length - 1);
  return `${stem}…${ext}`;
}

export default function MessageInput({ 
  onSend, 
  onCancel,
  disabled = false, 
  isProcessing = false,
  placeholder = "Ask about process simulations...",
  compact = false
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState([]);  // [{media_type, data, filename, preview, size}]
  const [dragActive, setDragActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ---- Web Speech API (STT) ----
  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const speechSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRecognition || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    // We'll track the "final committed text" so we can show interim
    // results in the textarea without duplicating.
    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscript = message; // start from whatever is already typed
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Append final result with a space
          finalTranscript += (finalTranscript ? ' ' : '') + transcript.trim();
        } else {
          interim += transcript;
        }
      }
      // Show committed + in-progress text
      const display = interim
        ? finalTranscript + (finalTranscript ? ' ' : '') + interim
        : finalTranscript;
      setMessage(display);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      // "no-speech" and "aborted" are normal — user just stopped talking
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      // Focus the textarea so the user can edit/send
      textareaRef.current?.focus();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognition, isListening, message]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);
  
  // Auto-resize textarea (only for non-compact mode)
  useEffect(() => {
    if (compact) return;
    
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

  // ---- Attachment helpers ----

  const totalAttachmentBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);

  const addFiles = useCallback(async (files) => {
    const incoming = Array.from(files);
    const valid = incoming.filter((f) => ALLOWED_TYPES.includes(f.type));
    if (valid.length === 0) return;

    // Enforce max count
    const room = MAX_ATTACHMENTS - attachments.length;
    const toAdd = valid.slice(0, room);
    if (toAdd.length === 0) return;

    const newAttachments = await Promise.all(toAdd.map(fileToAttachment));

    // Enforce max total size
    let running = totalAttachmentBytes;
    const filtered = newAttachments.filter((a) => {
      running += a.size;
      return running <= MAX_TOTAL_BYTES;
    });

    if (filtered.length > 0) {
      setAttachments((prev) => [...prev, ...filtered]);
    }
  }, [attachments.length, totalAttachmentBytes]);

  const removeAttachment = useCallback((index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ---- Paste handler (Ctrl+V images) ----
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.kind === 'file' && ALLOWED_TYPES.includes(item.type)) {
        files.push(item.getAsFile());
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  }, [addFiles]);

  // ---- Drag & drop ----
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || disabled || isSending) return;
    
    // Stop voice recognition if active
    if (isListening) stopListening();
    
    const currentAttachments = attachments.length > 0 ? [...attachments] : null;
    
    // Clear immediately before sending
    setMessage('');
    setAttachments([]);
    setIsSending(true);
    
    try {
      await onSend(trimmedMessage || 'Analyze the attached file(s)', currentAttachments);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore on error
      setMessage(trimmedMessage);
      if (currentAttachments) setAttachments(currentAttachments);
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
  const canSend = (message.trim().length > 0 || attachments.length > 0) && !isDisabled && !isProcessing;

  // ---- Compact mode (simplified single-line input) ----
  if (compact) {
    return (
      <div className="bg-white p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:border-blue-300 focus:bg-white disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-400 transition-all duration-200"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
              canSend
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm hover:shadow hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ---- Full mode ----
  return (
    <div
      className="bg-white px-4 py-3 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <Paperclip className="w-8 h-8" />
            <span className="text-sm font-medium">Drop files here</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* 
          Single bordered container — attachments chips + textarea + buttons all inside.
          Matches the VS Code Copilot chat input style.
        */}
        <div
          className={`
            rounded-2xl border bg-gray-50 
            focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-sm 
            transition-all duration-200
            ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
          `}
        >
          {/* Attachment chips row — inside the border, above the textarea */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5 pb-0.5">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-1.5 h-7 pl-1 pr-1.5 rounded-md bg-white border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-gray-300 transition-colors"
                >
                  {/* Tiny thumbnail or file type icon */}
                  {att.preview ? (
                    <img
                      src={att.preview}
                      alt=""
                      className="w-5 h-5 rounded object-cover flex-shrink-0"
                    />
                  ) : att.media_type === 'application/pdf' ? (
                    <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : DOC_TYPES.includes(att.media_type) ? (
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  {/* Filename */}
                  <span className="text-xs text-gray-600 select-none whitespace-nowrap">
                    {truncateFilename(att.filename)}
                  </span>
                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="ml-0.5 w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea row with attach and send buttons */}
          <div className="flex items-end gap-1 px-2 py-2">
            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled || isProcessing || attachments.length >= MAX_ATTACHMENTS}
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                attachments.length >= MAX_ATTACHMENTS
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
              }`}
              title={attachments.length >= MAX_ATTACHMENTS ? `Max ${MAX_ATTACHMENTS} files` : 'Attach image, PDF, or Word doc'}
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={[...ALLOWED_TYPES, '.pdf', '.docx'].join(',')}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = ''; // reset so same file can be re-selected
              }}
            />

            {/* Mic button (voice input) */}
            {speechSupported && (
              <button
                onClick={toggleListening}
                disabled={isDisabled || isProcessing}
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  isListening
                    ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse'
                    : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? (
                  <MicOff className="w-[18px] h-[18px]" />
                ) : (
                  <Mic className="w-[18px] h-[18px]" />
                )}
              </button>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="flex-1 resize-none bg-transparent text-gray-900 text-sm leading-snug px-1 py-1.5 focus:outline-none disabled:text-gray-400 placeholder:text-gray-400"
              style={{ minHeight: '36px', maxHeight: '200px' }}
            />

            {/* Send or Stop button */}
            {isProcessing ? (
              <button
                onClick={handleCancel}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-150 hover:scale-105"
                title="Stop request"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
                  canSend
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
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
        </div>
        
        {/* Helper text */}
        <p className="text-[11px] text-gray-300 mt-1.5 text-center">
          {isProcessing ? (
            <span className="text-amber-500">Processing… Click stop to cancel</span>
          ) : (
            <>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono text-[10px]">Enter</kbd>
              <span className="mx-1">to send</span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-400 font-mono text-[10px]">Shift + Enter</kbd>
              <span className="ml-1">new line</span>
              <span className="mx-1">·</span>
              <span className="text-gray-400">Paste or drop images, PDFs & Word docs</span>
              {speechSupported && (
                <>
                  <span className="mx-1">·</span>
                  <span className="text-gray-400">
                    {isListening ? (
                      <span className="text-red-400">🎙️ Listening…</span>
                    ) : (
                      'Mic for voice'
                    )}
                  </span>
                </>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
