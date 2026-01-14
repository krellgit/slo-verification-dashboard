'use client';

import { useState } from 'react';
import { CheckResult, CheckStatus } from '@/lib/types';

interface CheckItemProps {
  check: CheckResult;
}

const statusConfig: Record<CheckStatus, { icon: string; color: string; bg: string }> = {
  PASS: { icon: '✓', color: 'text-green-600', bg: 'bg-green-50' },
  FAIL: { icon: '✗', color: 'text-red-600', bg: 'bg-red-50' },
  REVIEW: { icon: '⚠', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  BLOCKED: { icon: '···', color: 'text-gray-400', bg: 'bg-gray-50' },
};

export function CheckItem({ check }: CheckItemProps) {
  const [expanded, setExpanded] = useState(check.status === 'FAIL' || check.status === 'REVIEW');
  const config = statusConfig[check.status];

  const hasDetails = check.issue || check.actions;

  return (
    <div className={`${config.bg}`}>
      <div
        className={`flex items-center px-4 py-3 ${hasDetails ? 'cursor-pointer' : ''}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <span className={`w-6 h-6 flex items-center justify-center font-bold ${config.color}`}>
          {config.icon}
        </span>
        <span className="ml-3 text-sm font-medium text-gray-700 w-24">
          {check.id}
        </span>
        <span className="ml-2 text-sm text-gray-900 flex-1">
          {check.name}
        </span>
        <span className="ml-2 text-sm text-gray-500">
          {check.detail}
        </span>
        {hasDetails && (
          <span className="ml-2 text-gray-400">
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>

      {expanded && check.issue && (
        <div className="px-4 pb-4 ml-9">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Item: </span>
                <span className="text-gray-900">{check.issue.item}</span>
              </div>
              {check.issue.expected && (
                <div>
                  <span className="font-medium text-gray-700">Expected: </span>
                  <span className="text-gray-900">{check.issue.expected}</span>
                </div>
              )}
              {check.issue.actual && (
                <div>
                  <span className="font-medium text-gray-700">Actual: </span>
                  <span className="text-gray-900">{check.issue.actual}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-700">Reason: </span>
                <span className="text-red-600">{check.issue.reason}</span>
              </div>
            </div>

            {check.actions && check.actions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Actions:</p>
                <div className="space-y-2">
                  {check.actions.map((action, i) => (
                    <button
                      key={i}
                      className="block w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      {i + 1}. {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
