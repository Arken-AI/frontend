/**
 * Main App Component
 * 
 * Sets up routing for the application:
 * - "/" : Chat interface (existing)
 * - "/results/:runId" : Results viewer (new)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ChatPage from './pages/ChatPage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <BrowserRouter>
      {/* Toast notification container */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          // Default options for all toasts
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            border: '1px solid #e5e7eb',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            duration: 4000, // Errors stay longer
          },
          loading: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/results/:runId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
