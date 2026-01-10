/**
 * ChatContainer Component (Placeholder)
 * 
 * Main container for the chat interface.
 * Will be fully implemented in Phase 4.
 */

import { useChatContext } from '../../context/ChatContext';

function ChatContainer() {
  const { conversationId, loading } = useChatContext();

  return (
    <div className="flex flex-col h-full">
      {/* Message Area - Placeholder */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <div className="text-6xl mb-4">🧮</div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Sugar Calculation Engine
              </h2>
              <p className="text-center max-w-md">
                Ask me anything about sugar processing calculations. 
                I can help with mill operations, evaporators, crystallizers, and more.
              </p>
              {conversationId && (
                <p className="text-sm mt-4 text-gray-400">
                  Conversation: {conversationId.slice(0, 8)}...
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Placeholder */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your message... (Coming in Phase 4)"
              disabled
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <button
              disabled
              className="px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Full chat functionality will be implemented in Phase 4
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;
