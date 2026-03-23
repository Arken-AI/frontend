/**
 * Main App Component
 *
 * Sets up routing for the application:
 * - "/" : Chat interface
 * - "/login" : Login page
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SharedDesignPage from "./pages/SharedDesignPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          {/* Toast notification container */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background:   "#1a1d27",
                color:        "#e8eaf0",
                border:       "1px solid #2a2d3a",
                padding:      "10px 14px",
                borderRadius: "2px",
                fontSize:     "13px",
                fontFamily:   "'JetBrains Mono', monospace",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#1a1d27" } },
              error:   { iconTheme: { primary: "#ef4444", secondary: "#1a1d27" }, duration: 4000 },
              loading: { iconTheme: { primary: "#3b82f6", secondary: "#1a1d27" } },
            }}
          />

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/share/:token" element={<SharedDesignPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
