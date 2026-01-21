/**
 * Chat Page
 * 
 * The main chat interface at route "/"
 * ChatProvider is now at App root level for sharing between pages.
 */

import Layout from '../components/layout/Layout';
import ChatContainer from '../components/chat/ChatContainer';

export default function ChatPage() {
  return (
    <Layout>
      <ChatContainer />
    </Layout>
  );
}
