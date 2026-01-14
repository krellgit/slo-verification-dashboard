'use client';

import { useState, useEffect } from 'react';
import { PipelineView } from '@/components/PipelineView';
import { ModuleDetail } from '@/components/ModuleDetail';
import { SummaryBar } from '@/components/SummaryBar';
import { VerificationResult } from '@/lib/types';

export default function Dashboard() {
  const [data, setData] = useState<VerificationResult | null>(null);
  const [selectedModule, setSelectedModule] = useState<string>('M1');
  const [scenario, setScenario] = useState<'pass' | 'fail'>('pass');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/verification?scenario=${scenario}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
        // Auto-select first failing module if any
        const failingModule = data.modules.find(
          (m: any) => m.status === 'FAIL' || m.status === 'REVIEW_NEEDED'
        );
        if (failingModule) {
          setSelectedModule(failingModule.id);
        }
      });
  }, [scenario]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading verification data...</div>
      </div>
    );
  }

  const selectedModuleData = data.modules.find(m => m.id === selectedModule);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Listing Verification Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Product: {data.product.name} ({data.product.asin})
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Scenario Toggle for Demo */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setScenario('pass')}
                  className={`px-3 py-1 text-sm rounded ${
                    scenario === 'pass'
                      ? 'bg-white shadow text-green-600 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  Pass Scenario
                </button>
                <button
                  onClick={() => setScenario('fail')}
                  className={`px-3 py-1 text-sm rounded ${
                    scenario === 'fail'
                      ? 'bg-white shadow text-red-600 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  Fail Scenario
                </button>
              </div>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Re-run All
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Bar */}
        <SummaryBar
          status={data.status}
          totalChecks={data.summary.totalChecks}
          passed={data.summary.passed}
          failed={data.summary.failed}
          review={data.summary.review}
          blocked={data.summary.blocked}
          qualityScore={data.status === 'COMPLETE' ? 94 : undefined}
        />

        {/* Pipeline View */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pipeline Status</h2>
            <p className="text-sm text-gray-500">Click a module to see details</p>
          </div>
          <PipelineView
            modules={data.modules}
            onModuleClick={setSelectedModule}
            selectedModuleId={selectedModule}
          />
        </div>

        {/* Module Detail */}
        {selectedModuleData && (
          <ModuleDetail
            module={selectedModuleData}
            onRerun={() => console.log('Rerun', selectedModule)}
          />
        )}

        {/* Issues Summary (if any failures) */}
        {data.summary.failed > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Issues to Resolve</h3>
            <ul className="space-y-2 text-sm text-red-700">
              {data.modules
                .filter(m => m.status === 'FAIL' || m.status === 'REVIEW_NEEDED')
                .flatMap(m =>
                  m.checks
                    .filter(c => c.status === 'FAIL' || c.status === 'REVIEW')
                    .map(c => (
                      <li key={c.id} className="flex items-start gap-2">
                        <span className="font-mono bg-red-100 px-1 rounded">{c.id}</span>
                        <span>{c.issue?.reason || c.name}</span>
                      </li>
                    ))
                )}
            </ul>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          SLO Verification Dashboard • Run ID: {data.runId} • {data.timestamp}
        </div>
      </footer>
    </div>
  );
}
