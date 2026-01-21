'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConfigStatus {
  configured: boolean;
  source?: 's3' | 'kv' | 'env' | 'none';
  location?: string; // S3 bucket/prefix or GitHub repo
  repo?: string; // Deprecated - use location
  path?: string;
  updatedAt?: string;
  connectionStatus: 'connected' | 'error' | 'not_configured';
  connectionError?: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
  reportCount?: number;
  kvAvailable?: boolean;
  envVarsConfigured: {
    GITHUB_TOKEN: boolean;
    GITHUB_REPO: boolean;
    REPORTS_PATH: boolean;
    ADMIN_PASSWORD: boolean;
    REDIS_URL: boolean;
    AWS_ACCESS_KEY_ID: boolean;
    AWS_SECRET_ACCESS_KEY: boolean;
    S3_BUCKET: boolean;
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

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    owner: '',
    repo: '',
    path: 'reports',
    token: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const saveConfiguration = async () => {
    setSaveLoading(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          ...formData,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSaveResult({ success: true, message: data.message });
        setEditMode(false);
        fetchConfigStatus();
      } else {
        setSaveResult({ success: false, message: data.error || 'Save failed' });
      }
    } catch {
      setSaveResult({ success: false, message: 'Connection error' });
    } finally {
      setSaveLoading(false);
    }
  };

  const clearConfiguration = async () => {
    if (!confirm('Are you sure you want to clear the Redis configuration? This will revert to environment variables.')) {
      return;
    }

    setSaveLoading(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSaveResult({ success: true, message: data.message });
        fetchConfigStatus();
      } else {
        setSaveResult({ success: false, message: data.error || 'Clear failed' });
      }
    } catch {
      setSaveResult({ success: false, message: 'Connection error' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEditClick = () => {
    // Parse current repo into owner/repo if available
    if (configStatus?.repo) {
      const [owner, repo] = configStatus.repo.split('/');
      setFormData({
        owner: owner || '',
        repo: repo || '',
        path: configStatus.path || 'reports',
        token: '',
      });
    }
    setEditMode(true);
    setSaveResult(null);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setSaveResult(null);
    setFormData({
      owner: '',
      repo: '',
      path: 'reports',
      token: '',
    });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm transition-all duration-200 font-medium shadow-md hover:shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="bg-slate-800 rounded-xl border-2 border-slate-700 shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">GitHub Configuration</h2>
            </div>
            <div className="flex items-center gap-2">
              {!editMode && configStatus?.kvAvailable && (
                <>
                  <button
                    onClick={handleEditClick}
                    disabled={configLoading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                  >
                    Edit Configuration
                  </button>
                  {configStatus.source === 'kv' && (
                    <button
                      onClick={clearConfiguration}
                      disabled={saveLoading}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                    >
                      Clear Redis Config
                    </button>
                  )}
                </>
              )}
              <button
                onClick={fetchConfigStatus}
                disabled={configLoading}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors disabled:opacity-50"
              >
                {configLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* KV Availability Warning */}
          {configStatus && !configStatus.kvAvailable && (
            <div className="mb-4 p-3 bg-yellow-900 text-yellow-300 rounded text-sm">
              Redis is not configured. Dynamic configuration is not available. Please create a Redis database in Vercel Storage.
            </div>
          )}

          {/* Save Result Message */}
          {saveResult && (
            <div
              className={`mb-4 p-3 rounded text-sm ${
                saveResult.success
                  ? 'bg-green-900 text-green-300'
                  : 'bg-red-900 text-red-300'
              }`}
            >
              {saveResult.message}
            </div>
          )}

          {/* Edit Form */}
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Repository Owner
                </label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., octocat"
                  disabled={saveLoading}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={formData.repo}
                  onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., hello-world"
                  disabled={saveLoading}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Reports Path (optional)
                </label>
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="reports"
                  disabled={saveLoading}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  GitHub Token
                </label>
                <input
                  type="password"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="ghp_xxxxxxxxxxxx"
                  disabled={saveLoading}
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <button
                  onClick={saveConfiguration}
                  disabled={saveLoading || !formData.owner || !formData.repo || !formData.token}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {saveLoading ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : configStatus ? (
            <div className="space-y-4">
              {/* Configuration Source */}
              {configStatus.source && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Source:</span>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      configStatus.source === 'kv'
                        ? 'bg-blue-900 text-blue-300'
                        : configStatus.source === 'env'
                        ? 'bg-purple-900 text-purple-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {configStatus.source === 's3'
                      ? 'AWS S3 (Environment Variables)'
                      : configStatus.source === 'kv'
                      ? 'GitHub via Redis (Dynamic)'
                      : configStatus.source === 'env'
                      ? 'GitHub via Environment Variables (Static)'
                      : 'Not Configured'}
                  </span>
                </div>
              )}

              {/* Last Updated */}
              {configStatus.updatedAt && (
                <div>
                  <span className="text-gray-400">Last Updated: </span>
                  <span className="text-white">
                    {new Date(configStatus.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}

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

              {/* Location Info */}
              {(configStatus.location || configStatus.repo) && (
                <div>
                  <span className="text-gray-400">
                    {configStatus.source === 's3' ? 'S3 Location: ' : 'Repository: '}
                  </span>
                  <span className="text-white font-mono">{configStatus.location || configStatus.repo}</span>
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
        <div className="bg-slate-800 rounded-xl border-2 border-slate-700 shadow-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Test Connection</h2>
          </div>

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
        <div className="bg-slate-800 rounded-xl border-2 border-slate-700 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sky-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Setup Instructions</h2>
          </div>

          <div className="space-y-4 text-gray-300 text-sm">
            <div>
              <h3 className="text-white font-semibold mb-2">Option 1: Dynamic Configuration (Recommended)</h3>
              <p className="mb-2">
                Use Vercel Redis for dynamic configuration that can be changed without redeployment:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Create a Redis database in Vercel Storage (REDIS_URL is auto-configured)</li>
                <li>Set ADMIN_PASSWORD environment variable</li>
                <li>Use the "Edit Configuration" button above to configure GitHub connection</li>
                <li>Changes take effect immediately without redeployment</li>
              </ol>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-white font-semibold mb-2">Option 2: Environment Variables (Static)</h3>
              <p className="mb-2">
                Set these environment variables in Vercel for static configuration:
              </p>
              <div className="bg-gray-900 rounded p-4 font-mono text-xs space-y-2 mb-2">
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
            </div>

            <a
              href="https://vercel.com/docs/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-block"
            >
              Vercel Documentation &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
