'use client';

import { useState, useEffect } from 'react';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
}

interface RepoConfigProps {
  onConnect: (config: GitHubConfig) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  isLoading: boolean;
  error?: string;
}

const STORAGE_KEY = 'slo-dashboard-github-config';

export function RepoConfig({ onConnect, onDisconnect, isConnected, isLoading, error }: RepoConfigProps) {
  const [token, setToken] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [path, setPath] = useState('reports');
  const [showToken, setShowToken] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load saved config on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved) as GitHubConfig;
        setToken(config.token);
        setRepoInput(`${config.owner}/${config.repo}`);
        setPath(config.path || 'reports');
      } catch {
        // Invalid saved config, ignore
      }
    }
  }, []);

  const parseRepoInput = (input: string): { owner: string; repo: string } | null => {
    const trimmed = input.trim();
    const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  };

  const handleConnect = () => {
    setValidationError(null);

    if (!token.trim()) {
      setValidationError('GitHub token is required');
      return;
    }

    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setValidationError('Invalid repo format. Use: owner/repo');
      return;
    }

    const config: GitHubConfig = {
      token: token.trim(),
      owner: parsed.owner,
      repo: parsed.repo,
      path: path.trim() || 'reports',
    };

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

    onConnect(config);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken('');
    setRepoInput('');
    setPath('reports');
    setValidationError(null);
    onDisconnect();
  };

  const displayError = validationError || error;
  const parsed = parseRepoInput(repoInput);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">GitHub Repository</h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-1.5 ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {isConnected && parsed && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                {parsed.owner}/{parsed.repo}
              </p>
              <p className="text-xs text-green-600">Path: {path || 'reports'}</p>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="space-y-4">
          <div>
            <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 mb-1">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                id="github-token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Needs repo read access. Stored locally in your browser.
            </p>
          </div>

          <div>
            <label htmlFor="github-repo" className="block text-sm font-medium text-gray-700 mb-1">
              Repository
            </label>
            <input
              id="github-repo"
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="github-path" className="block text-sm font-medium text-gray-700 mb-1">
              Reports Path
            </label>
            <input
              id="github-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="reports"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Path to the reports directory within the repo
            </p>
          </div>

          {displayError && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700">{displayError}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connecting...
              </span>
            ) : (
              'Connect'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
