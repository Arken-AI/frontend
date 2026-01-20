/**
 * Chat Page
 * 
 * The main chat interface at route "/"
 * This wraps the existing chat components.
 */

import { ChatProvider } from '../context/ChatContext';
import Layout from '../components/layout/Layout';
import ChatContainer from '../components/chat/ChatContainer';

export default function ChatPage() {
  return (
    <ChatProvider>
      <Layout>
        <ChatContainer />
      </Layout>
    </ChatProvider>
  );
}
