'use client';

import { ModuleResult, CheckResult, CheckStatus } from '@/lib/types';
import { CheckItem } from './CheckItem';

interface ModuleDetailProps {
  module: ModuleResult;
  onRerun?: () => void;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  PASS: { text: 'PASS', color: 'text-green-600' },
  FAIL: { text: 'FAIL', color: 'text-red-600' },
  REVIEW_NEEDED: { text: 'REVIEW NEEDED', color: 'text-yellow-600' },
  BLOCKED: { text: 'BLOCKED', color: 'text-gray-500' },
};

export function ModuleDetail({ module, onRerun }: ModuleDetailProps) {
  const statusInfo = statusLabels[module.status] || statusLabels.BLOCKED;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {module.id}: {module.name}
          </h3>
          <p className="text-sm text-gray-500">
            {module.checksPassed}/{module.checksTotal} checks passed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-bold ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
          {onRerun && (
            <button
              onClick={onRerun}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Re-run
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {module.checks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}
