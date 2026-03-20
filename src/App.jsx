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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          {/* Toast notification container */}
          <Toaster
            position="bottom-right"
            toastOptions={{
              // Default options for all toasts
              duration: 3000,
              style: {
                background: "#fff",
                color: "#333",
                border: "1px solid #e5e7eb",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "14px",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
                duration: 4000, // Errors stay longer
              },
              loading: {
                iconTheme: {
                  primary: "#3b82f6",
                  secondary: "#fff",
                },
              },
            }}
          />

          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
