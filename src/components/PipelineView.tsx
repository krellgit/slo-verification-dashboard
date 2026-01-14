'use client';

import { ModuleResult, ModuleStatus } from '@/lib/types';

interface PipelineViewProps {
  modules: ModuleResult[];
  onModuleClick: (moduleId: string) => void;
  selectedModuleId?: string;
}

const statusColors: Record<ModuleStatus, string> = {
  PASS: 'bg-green-500 border-green-600',
  FAIL: 'bg-red-500 border-red-600',
  REVIEW_NEEDED: 'bg-yellow-500 border-yellow-600',
  BLOCKED: 'bg-gray-400 border-gray-500',
  PENDING: 'bg-gray-300 border-gray-400',
};

const statusIcons: Record<ModuleStatus, string> = {
  PASS: '✓',
  FAIL: '✗',
  REVIEW_NEEDED: '⚠',
  BLOCKED: '···',
  PENDING: '○',
};

export function PipelineView({ modules, onModuleClick, selectedModuleId }: PipelineViewProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {modules.map((module, index) => (
        <div key={module.id} className="flex items-center">
          <button
            onClick={() => onModuleClick(module.id)}
            className={`
              flex flex-col items-center justify-center
              w-20 h-20 rounded-lg border-2 cursor-pointer
              transition-all duration-200
              ${statusColors[module.status]}
              ${selectedModuleId === module.id ? 'ring-4 ring-blue-400 scale-110' : 'hover:scale-105'}
            `}
          >
            <span className="text-white text-2xl font-bold">
              {statusIcons[module.status]}
            </span>
            <span className="text-white text-xs font-medium mt-1">
              {module.id}
            </span>
            <span className="text-white/80 text-xs">
              {module.checksPassed}/{module.checksTotal}
            </span>
          </button>
          {index < modules.length - 1 && (
            <div className="w-8 h-0.5 bg-gray-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}
