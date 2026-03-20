/**
 * ChatPage — split-panel layout: 28% chat | 72% HX progress.
 */

import Layout from '../components/layout/Layout';
import ChatPanel from '../components/chat/ChatPanel';
import HXPanel from '../components/hx/HXPanel';

export default function ChatPage() {
  // HX state will come from a useHXStream hook once the engine is ready.
  // For now, pass empty/default props so the layout renders correctly.
  return (
    <Layout>
      <ChatPanel />
      <HXPanel />
    </Layout>
  );
}
