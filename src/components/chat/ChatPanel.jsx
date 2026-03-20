/**
 * ChatPanel — the 28% left panel in the ARKEN split layout.
 *
 * A clean wrapper around the chat logic. The header chrome (conversation
 * history dropdown, connection status badge, etc.) from the old Results-page
 * panel has been removed — the main Header handles status and the new layout
 * has no sidebar.
 */

import ChatContainer from './ChatContainer';

export default function ChatPanel() {
  return <ChatContainer />;
}
