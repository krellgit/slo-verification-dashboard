'use client';

import { ModuleResult, ModuleStatus } from '@/lib/types';

interface PipelineViewProps {
  modules: ModuleResult[];
  onModuleClick: (moduleId: string) => void;
  selectedModuleId?: string;
}

const statusColors: Record<ModuleStatus, string> = {
  PASS: 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 shadow-lg shadow-emerald-200',
  FAIL: 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-700 shadow-lg shadow-rose-200',
  REVIEW_NEEDED: 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-700 shadow-lg shadow-amber-200',
  BLOCKED: 'bg-gradient-to-br from-slate-400 to-slate-500 border-slate-600 shadow-md shadow-slate-200',
  PENDING: 'bg-gradient-to-br from-slate-300 to-slate-400 border-slate-500 shadow-md',
};

const statusIcons: Record<ModuleStatus, JSX.Element> = {
  PASS: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
  FAIL: <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>,
  REVIEW_NEEDED: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  BLOCKED: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
  PENDING: <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

export function PipelineView({ modules, onModuleClick, selectedModuleId }: PipelineViewProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-8 px-4">
      {modules.map((module, index) => (
        <div key={module.id} className="flex items-center">
          <button
            onClick={() => onModuleClick(module.id)}
            className={`
              group relative flex flex-col items-center justify-center
              w-32 h-32 rounded-2xl border-4 cursor-pointer
              transition-all duration-300 ease-out
              ${statusColors[module.status]}
              ${selectedModuleId === module.id
                ? 'ring-4 ring-indigo-400 ring-offset-2 scale-110 rotate-2'
                : 'hover:scale-110 hover:-translate-y-1 active:scale-100'}
            `}
          >
            <div className="text-white transition-transform duration-300 group-hover:scale-110">
              {statusIcons[module.status]}
            </div>
            <div className="mt-2 text-white font-bold text-sm tracking-wide">
              {module.id}
            </div>
            <div className="mt-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
              <span className="text-white font-semibold text-xs">
                {module.checksPassed}/{module.checksTotal}
              </span>
            </div>
            {selectedModuleId === module.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
          {index < modules.length - 1 && (
            <div className="hidden sm:block">
              <svg className="w-10 h-6 text-slate-300 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
