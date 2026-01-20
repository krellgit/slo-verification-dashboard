'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConfigStatus {
  configured: boolean;
  repo?: string;
  path?: string;
  connectionStatus: 'connected' | 'error' | 'not_configured';
  connectionError?: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
  reportCount?: number;
  envVarsConfigured: {
    GITHUB_TOKEN: boolean;
    GITHUB_REPO: boolean;
    REPORTS_PATH: boolean;
    ADMIN_PASSWORD: boolean;
  };
}

interface TestResult {
  success: boolean;
  error?: string;
  reportCount?: number;
  reports?: Array<{ asin: string; name: string }>;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      setAuthenticated(data.authenticated);
    } catch {
      setAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAuthenticated(true);
        setPassword('');
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch {
      setLoginError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      setAuthenticated(false);
      setConfigStatus(null);
    } catch {
      // Ignore logout errors
    }
  };

  const fetchConfigStatus = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      } else if (res.status === 401) {
        setAuthenticated(false);
      }
    } catch {
      // Ignore errors
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const testConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/config', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      } else if (res.status === 401) {
        setAuthenticated(false);
      }
    } catch {
      setTestResult({ success: false, error: 'Connection error' });
    } finally {
      setTestLoading(false);
    }
  };

  // Fetch config status when authenticated
  useEffect(() => {
    if (authenticated) {
      fetchConfigStatus();
    }
  }, [authenticated, fetchConfigStatus]);

  // Loading state
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6">Admin Login</h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm text-gray-400 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter admin password"
                disabled={loading}
              />
            </div>

            {loginError && (
              <div className="text-red-400 text-sm">{loginError}</div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <a
              href="/"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              &larr; Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              View Dashboard
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Configuration Status</h2>
            <button
              onClick={fetchConfigStatus}
              disabled={configLoading}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors disabled:opacity-50"
            >
              {configLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {configStatus ? (
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    configStatus.connectionStatus === 'connected'
                      ? 'bg-green-900 text-green-300'
                      : configStatus.connectionStatus === 'error'
                      ? 'bg-red-900 text-red-300'
                      : 'bg-yellow-900 text-yellow-300'
                  }`}
                >
                  {configStatus.connectionStatus === 'connected'
                    ? 'Connected'
                    : configStatus.connectionStatus === 'error'
                    ? 'Error'
                    : 'Not Configured'}
                </span>
              </div>

              {configStatus.connectionError && (
                <div className="text-red-400 text-sm">
                  Error: {configStatus.connectionError}
                </div>
              )}

              {/* Repository Info */}
              {configStatus.repo && (
                <div>
                  <span className="text-gray-400">Repository: </span>
                  <span className="text-white font-mono">{configStatus.repo}</span>
                </div>
              )}

              {configStatus.path && (
                <div>
                  <span className="text-gray-400">Reports Path: </span>
                  <span className="text-white font-mono">{configStatus.path}</span>
                </div>
              )}

              {configStatus.reportCount !== undefined && (
                <div>
                  <span className="text-gray-400">Reports Found: </span>
                  <span className="text-white">{configStatus.reportCount}</span>
                </div>
              )}

              {/* Rate Limit */}
              {configStatus.rateLimit && (
                <div>
                  <span className="text-gray-400">API Rate Limit: </span>
                  <span className="text-white">
                    {configStatus.rateLimit.remaining} / {configStatus.rateLimit.limit}
                  </span>
                </div>
              )}

              {/* Environment Variables */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Environment Variables:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(configStatus.envVarsConfigured).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          value ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-gray-300 font-mono">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Loading configuration...</div>
          )}
        </div>

        {/* Test Connection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Test Connection</h2>

          <button
            onClick={testConnection}
            disabled={testLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {testLoading ? 'Testing...' : 'Test GitHub Connection'}
          </button>

          {testResult && (
            <div className="mt-4">
              {testResult.success ? (
                <div className="space-y-2">
                  <div className="text-green-400">Connection successful!</div>
                  <div className="text-gray-300">
                    Found {testResult.reportCount} report(s)
                  </div>
                  {testResult.reports && testResult.reports.length > 0 && (
                    <div className="text-sm text-gray-400">
                      Sample: {testResult.reports.map((r) => r.asin).join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-400">{testResult.error}</div>
              )}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Setup Instructions</h2>

          <div className="space-y-4 text-gray-300 text-sm">
            <p>To configure the dashboard, set these environment variables in Vercel:</p>

            <div className="bg-gray-900 rounded p-4 font-mono text-xs space-y-2">
              <div>
                <span className="text-blue-400">GITHUB_TOKEN</span>=ghp_xxxxxxxxxxxx
              </div>
              <div>
                <span className="text-blue-400">GITHUB_REPO</span>=owner/repo-name
              </div>
              <div>
                <span className="text-blue-400">REPORTS_PATH</span>=reports
              </div>
              <div>
                <span className="text-blue-400">ADMIN_PASSWORD</span>=your-password
              </div>
            </div>

            <p className="text-gray-400">
              After setting environment variables, redeploy the application for changes to take effect.
            </p>

            <a
              href="https://vercel.com/docs/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-block"
            >
              Vercel Environment Variables Documentation &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
