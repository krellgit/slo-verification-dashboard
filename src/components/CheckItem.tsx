'use client';

import { useState } from 'react';
import { CheckResult, CheckStatus } from '@/lib/types';

interface CheckItemProps {
  check: CheckResult;
}

const statusConfig: Record<CheckStatus, { icon: JSX.Element; color: string; bg: string; border: string; iconBg: string }> = {
  PASS: {
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50/50',
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-100'
  },
  FAIL: {
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>,
    color: 'text-rose-700',
    bg: 'bg-rose-50/50',
    border: 'border-l-rose-500',
    iconBg: 'bg-rose-100'
  },
  REVIEW: {
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    color: 'text-amber-700',
    bg: 'bg-amber-50/50',
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-100'
  },
  BLOCKED: {
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    color: 'text-slate-500',
    bg: 'bg-slate-50/50',
    border: 'border-l-slate-400',
    iconBg: 'bg-slate-100'
  },
};

export function CheckItem({ check }: CheckItemProps) {
  const [expanded, setExpanded] = useState(check.status === 'FAIL' || check.status === 'REVIEW');
  const config = statusConfig[check.status];

  const hasDetails = check.issue || check.actions;

  return (
    <div className={`border-l-4 ${config.border} ${config.bg} transition-all duration-150`}>
      <div
        className={`flex items-center px-5 py-4 ${hasDetails ? 'cursor-pointer hover:bg-white/60' : ''} transition-colors`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${config.iconBg} ${config.color} flex-shrink-0`}>
          {config.icon}
        </div>
        <span className="ml-4 text-sm font-bold text-slate-800 font-mono w-28 flex-shrink-0">
          {check.id}
        </span>
        <span className="ml-3 text-sm text-slate-900 font-medium flex-1 min-w-0">
          {check.name}
        </span>
        {check.detail && (
          <span className="ml-3 text-sm text-slate-600 flex-shrink-0">
            {check.detail}
          </span>
        )}
        {hasDetails && (
          <svg
            className={`ml-3 w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {expanded && check.issue && (
        <div className="px-6 pb-5 ml-12 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md p-5">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-700 min-w-[80px]">Item:</span>
                <span className="text-slate-900 font-medium">{check.issue.item}</span>
              </div>
              {check.issue.expected && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-700 min-w-[80px]">Expected:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-mono text-xs">{check.issue.expected}</span>
                </div>
              )}
              {check.issue.actual && (
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-700 min-w-[80px]">Actual:</span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded font-mono text-xs">{check.issue.actual}</span>
                </div>
              )}
              <div className="flex items-start gap-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700 min-w-[80px]">Reason:</span>
                <span className="text-rose-700 font-medium">{check.issue.reason}</span>
              </div>
            </div>

            {check.actions && check.actions.length > 0 && (
              <div className="mt-5 pt-4 border-t-2 border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <p className="text-sm font-bold text-slate-900">Recommended Actions</p>
                </div>
                <div className="space-y-2">
                  {check.actions.map((action, i) => (
                    <button
                      key={i}
                      className="block w-full text-left px-4 py-3 text-sm bg-gradient-to-r from-indigo-50 to-sky-50 text-indigo-900 rounded-lg hover:from-indigo-100 hover:to-sky-100 border border-indigo-200 transition-all duration-150 hover:shadow-md font-medium"
                    >
                      <span className="font-bold">{i + 1}.</span> {action}
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
