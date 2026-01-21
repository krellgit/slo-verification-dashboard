'use client';

import { ModuleResult, CheckResult, CheckStatus } from '@/lib/types';
import { CheckItem } from './CheckItem';

interface ModuleDetailProps {
  module: ModuleResult;
  onRerun?: () => void;
}

const statusLabels: Record<string, { text: string; color: string; bg: string; icon: React.ReactNode }> = {
  PASS: {
    text: 'PASS',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
  },
  FAIL: {
    text: 'FAIL',
    color: 'text-rose-700',
    bg: 'bg-rose-100',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
  },
  REVIEW_NEEDED: {
    text: 'REVIEW NEEDED',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  },
  BLOCKED: {
    text: 'BLOCKED',
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
  },
};

export function ModuleDetail({ module, onRerun }: ModuleDetailProps) {
  const statusInfo = statusLabels[module.status] || statusLabels.BLOCKED;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-5 border-b-2 border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {module.id}: {module.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-700">
                      {module.checksPassed}/{module.checksTotal} checks passed
                    </span>
                  </div>
                  <span className="text-slate-400">•</span>
                  <span className="text-sm text-slate-600">
                    {Math.round((module.checksPassed / module.checksTotal) * 100)}% pass rate
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${statusInfo.bg}`}>
              <div className={statusInfo.color}>
                {statusInfo.icon}
              </div>
              <span className={`font-bold text-sm ${statusInfo.color}`}>
                {statusInfo.text}
              </span>
            </div>
            {onRerun && (
              <button
                onClick={onRerun}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm hover:shadow-md"
              >
                Re-run
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {module.checks.map((check) => (
          <CheckItem key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}
