/**
 * Main App Component
 * 
 * Wraps the application with providers and renders the main layout.
 */

import { ChatProvider } from './context/ChatContext';
import Layout from './components/layout/Layout';
import ChatContainer from './components/chat/ChatContainer';

function App() {
  return (
    <ChatProvider>
      <Layout>
        <ChatContainer />
      </Layout>
    </ChatProvider>
  );
}

export default App;
