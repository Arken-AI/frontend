/**
 * Main App Component
 * 
 * Sets up routing for the application:
 * - "/" : Chat interface (existing)
 * - "/results/:runId" : Results viewer (new)
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import ResultsPage from './pages/ResultsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/results/:runId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
