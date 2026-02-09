/**
 * Login Page
 *
 * Branded login page with Arken AI text logo.
 * Features:
 * - Autofocus on username input
 * - Enter key form submission
 * - Loading spinner on button
 * - Error display with form state preservation
 * - Redirect if already authenticated
 */

import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameRef = useRef(null);

  // Autofocus username field on mount
  useEffect(() => {
    if (usernameRef.current && !authLoading && !isAuthenticated) {
      usernameRef.current.focus();
    }
  }, [authLoading, isAuthenticated]);

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate username
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password);

      if (!result.success) {
        setError(result.error);
        setPassword(""); // Clear password, keep username
      }
      // On success, isAuthenticated will become true → Navigate redirect fires
    } catch {
      setError("Unable to connect. Please try again later.");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {/* Branded Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Arken AI
          </h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to continue</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              ref={usernameRef}
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md
                       text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md
                       text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm text-center" role="alert">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gray-800 text-white font-medium rounded-md
                     hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200
                     flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
