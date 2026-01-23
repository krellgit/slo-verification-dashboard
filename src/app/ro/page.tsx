'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Tooltip component for info icons
function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1.5">
      <span className="cursor-help text-slate-400 hover:text-slate-600 transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-xs text-center z-50 shadow-lg">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

// Rollout phase data
const PHASES = [
  {
    id: 1,
    name: 'Emergency Bug Fixes',
    days: 'Days 1-2',
    dates: 'Jan 23-24',
    target: '70% pass rate',
    status: 'in_progress',
    completion: 30,
    tasks: [
      { name: 'M2 Competitor Data Structure', priority: 'P1', impact: '+15-20%', status: 'in_progress' },
      { name: 'M1 Fallback Mechanisms', priority: 'P2', impact: '+5-10%', status: 'pending' },
      { name: 'M3 Keyword Enum Conversion', priority: 'P3', impact: '+3-5%', status: 'pending' },
      { name: 'M2.3 USP Priority Mapping', priority: 'P4', impact: '+2-3%', status: 'pending' },
      { name: 'M2.1 Theme Normalization', priority: 'P5', impact: '+2-3%', status: 'pending' },
    ],
  },
  {
    id: 2,
    name: 'Quality Pass',
    days: 'Day 3',
    dates: 'Jan 25',
    target: '80% pass rate',
    status: 'pending',
    completion: 0,
    tasks: [
      { name: 'Final bug fixes deployed', status: 'pending' },
      { name: 'Re-run full 50 ASIN test', status: 'pending' },
      { name: 'Select 15-20 client ASINs', status: 'pending' },
      { name: 'Collect baseline data', status: 'pending' },
    ],
  },
  {
    id: 3,
    name: 'Client ASIN Testing',
    days: 'Days 4-5',
    dates: 'Jan 26-27',
    target: '90% pass rate',
    status: 'pending',
    completion: 0,
    tasks: [
      { name: 'Run 10 client ASINs (Day 4)', status: 'pending' },
      { name: 'Run 10 more client ASINs (Day 5)', status: 'pending' },
      { name: 'QA review all outputs', status: 'pending' },
      { name: 'Select top 10 for presentations', status: 'pending' },
    ],
  },
  {
    id: 4,
    name: 'Presentation Prep',
    days: 'Day 6',
    dates: 'Jan 28',
    target: 'Materials ready',
    status: 'pending',
    completion: 0,
    tasks: [
      { name: '10 before/after comparisons', status: 'pending' },
      { name: 'Customer presentation deck', status: 'pending' },
      { name: 'Team briefing completed', status: 'pending' },
    ],
  },
  {
    id: 5,
    name: 'Dry Run',
    days: 'Day 7',
    dates: 'Jan 29',
    target: 'Team ready',
    status: 'pending',
    completion: 0,
    tasks: [
      { name: 'Full presentation rehearsal', status: 'pending' },
      { name: 'Demo environment testing', status: 'pending' },
      { name: 'Customer calls scheduled', status: 'pending' },
    ],
  },
  {
    id: 6,
    name: 'ROLLOUT',
    days: 'Day 8',
    dates: 'Jan 30',
    target: '3-5 customers',
    status: 'scheduled',
    completion: 0,
    tasks: [
      { name: 'Present to top customers', status: 'pending' },
      { name: 'Collect feedback', status: 'pending' },
      { name: 'Document next steps', status: 'pending' },
    ],
  },
];

const TEAM = [
  { name: 'Yehor & Andrew', role: 'Engineering', focus: 'Bug fixes, pipeline monitoring', status: 'active' },
  { name: 'Alice & Haule', role: 'QA/Ops', focus: 'Testing, verification, baselines', status: 'standby' },
  { name: 'Krell', role: 'Rollout Lead', focus: 'Coordination, presentations', status: 'active' },
  { name: 'Bob', role: 'Customer Success', focus: 'Customer presentations, feedback', status: 'standby' },
];

interface LiveStats {
  totalAsins: number;
  failedChecks: number;
  totalChecks: number;
  failureRate: number;
}

export default function RolloutPage() {
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<'dashboard' | 'slides'>('dashboard');

  // Calculate days remaining
  const launchDate = new Date('2026-01-30');
  const today = new Date();
  const daysRemaining = Math.ceil((launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Fetch live stats from SLOVD
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            // Use failure rate (failedChecks / totalChecks) - more actionable metric
            // Shows what needs to be fixed rather than what's already working
            const totalChecks = data.stats.totalChecks || 0;
            const failedChecks = data.stats.failedChecks || 0;
            setLiveStats({
              totalAsins: data.stats.totalAsins || 0,
              failedChecks,
              totalChecks,
              failureRate: totalChecks > 0
                ? Math.round((failedChecks / totalChecks) * 100)
                : 0,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const currentFailureRate = liveStats?.failureRate ?? 0;
  const totalAsins = liveStats?.totalAsins ?? 0;
  const failedChecks = liveStats?.failedChecks ?? 0;
  const totalChecks = liveStats?.totalChecks ?? 0;

  // Calculate overall completion
  const overallCompletion = Math.round(
    PHASES.reduce((acc, phase) => acc + phase.completion, 0) / PHASES.length
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-emerald-500';
      case 'in_progress': return 'bg-amber-500';
      case 'pending': return 'bg-slate-300';
      case 'scheduled': return 'bg-blue-500';
      default: return 'bg-slate-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'pending': return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'standby': return 'bg-slate-100 text-slate-600 border-slate-300';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">SLO Rollout Status</h1>
                <p className="text-sm text-slate-500">7-Day Sprint to Launch</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'dashboard'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setViewMode('slides')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'slides'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Slides
                </button>
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                View SLOVD
              </Link>
            </div>
          </div>
        </div>
      </header>

      {viewMode === 'dashboard' ? (
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Overall Completion */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg shadow-indigo-200">
              <p className="text-indigo-200 text-sm font-medium flex items-center">
                Overall Completion
                <Tooltip text="Progress across all 6 phases. 100% = ready for launch." />
              </p>
              <p className="text-4xl font-bold mt-1">{overallCompletion}%</p>
              <div className="mt-3 bg-indigo-400/30 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${overallCompletion}%` }}
                />
              </div>
            </div>

            {/* Current Failure Rate */}
            <div className={`rounded-xl p-6 shadow-lg ${
              currentFailureRate <= 5
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200'
                : currentFailureRate <= 10
                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-200'
                : 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-200'
            }`}>
              <p className="text-white/80 text-sm font-medium flex items-center">
                Failure Rate
                <Tooltip text="Quality check failures. Under 5% = ready for launch." />
              </p>
              <p className="text-4xl font-bold mt-1">{loading ? '...' : `${currentFailureRate}%`}</p>
              <p className="text-white/70 text-sm mt-1">Target: &lt;5%</p>
            </div>

            {/* Days Remaining */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 text-white shadow-lg shadow-slate-300">
              <p className="text-slate-300 text-sm font-medium flex items-center">
                Days to Launch
                <Tooltip text="Countdown to customer presentations on Jan 30." />
              </p>
              <p className="text-4xl font-bold mt-1">{daysRemaining}</p>
              <p className="text-slate-400 text-sm mt-1">Jan 30, 2026</p>
            </div>

            {/* ASINs Tested */}
            <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-xl p-6 shadow-lg">
              <p className="text-slate-500 text-sm font-medium flex items-center">
                ASINs Tested
                <Tooltip text="Products run through SLO pipeline for quality validation." />
              </p>
              <p className="text-4xl font-bold text-slate-900 mt-1">{loading ? '...' : totalAsins}</p>
              <p className="text-slate-500 text-sm mt-1">19 categories</p>
            </div>
          </div>

          {/* Failure Rate Progress */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 mb-8 shadow-md">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              Failure Rate Progress
              <Tooltip text="Bug fixes reduce failure rate. Each bar shows target for that milestone." />
            </h2>
            <p className="text-sm text-slate-500 mb-4">{failedChecks} failed checks out of {totalChecks} total</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 w-28">Current</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4 relative">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      currentFailureRate <= 5 ? 'bg-emerald-500' :
                      currentFailureRate <= 10 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(currentFailureRate * 2, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 w-12">{currentFailureRate}%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 w-28">Day 2 Target</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4">
                  <div className="bg-amber-300 h-4 rounded-full" style={{ width: '20%' }} />
                </div>
                <span className="text-sm font-medium text-slate-500 w-12">&lt;10%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 w-28">Day 3 Target</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4">
                  <div className="bg-emerald-300 h-4 rounded-full" style={{ width: '14%' }} />
                </div>
                <span className="text-sm font-medium text-slate-500 w-12">&lt;7%</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-600 w-28">Launch Target</span>
                <div className="flex-1 bg-slate-100 rounded-full h-4">
                  <div className="bg-emerald-500 h-4 rounded-full" style={{ width: '10%' }} />
                </div>
                <span className="text-sm font-medium text-slate-500 w-12">&lt;5%</span>
              </div>
            </div>
          </div>

          {/* Phase Timeline */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6 mb-8 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              7-Day Rollout Timeline
              <Tooltip text="6 phases over 8 days. Yellow = in progress, green = done, blue = scheduled." />
            </h2>
            <div className="space-y-4">
              {PHASES.map((phase, index) => (
                <div
                  key={phase.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    phase.status === 'in_progress'
                      ? 'border-amber-400 bg-amber-100 shadow-md shadow-amber-100'
                      : phase.status === 'complete'
                      ? 'border-emerald-400 bg-emerald-100 shadow-md shadow-emerald-100'
                      : phase.status === 'scheduled'
                      ? 'border-blue-400 bg-blue-100 shadow-md shadow-blue-100'
                      : 'border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getStatusColor(phase.status)}`}>
                        {phase.status === 'complete' ? '✓' : index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-slate-900 text-lg">{phase.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(phase.status)}`}>
                            {phase.status === 'in_progress' ? 'In Progress' :
                             phase.status === 'complete' ? 'Complete' :
                             phase.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 font-medium">
                          {phase.days} ({phase.dates}) • Target: {phase.target}
                        </p>
                        {phase.tasks && (
                          <div className="mt-3 space-y-2">
                            {phase.tasks.map((task, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                                  task.status === 'complete' ? 'bg-emerald-500 text-white' :
                                  task.status === 'in_progress' ? 'bg-amber-500 text-white' :
                                  'bg-slate-300 text-slate-600'
                                }`}>
                                  {task.status === 'complete' ? '✓' : task.status === 'in_progress' ? '•' : '○'}
                                </span>
                                <span className={
                                  task.status === 'complete'
                                    ? 'line-through text-slate-400'
                                    : task.status === 'in_progress'
                                    ? 'text-slate-900 font-semibold'
                                    : 'text-slate-600'
                                }>
                                  {task.name}
                                </span>
                                {'priority' in task && (
                                  <span className="text-xs text-rose-600 font-bold bg-rose-100 px-1.5 py-0.5 rounded">{task.priority}</span>
                                )}
                                {'impact' in task && (
                                  <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">{task.impact}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">{phase.completion}%</p>
                      <div className="w-24 bg-slate-200 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(phase.status)}`}
                          style={{ width: `${phase.completion}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team & Critical Blocker Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Critical Blocker */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-300 rounded-xl p-6 shadow-md">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-rose-900 flex items-center">
                    Critical Blocker: M2 Data Fix
                    <Tooltip text="Highest priority bug. Must be fixed before other work can proceed." />
                  </h3>
                  <p className="text-sm text-rose-700 mt-1">
                    Missing competitors field causes cascading failures across M2.1, M2.3, M3, and M4.
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <span className="text-sm"><strong>Impact:</strong> +15-20% pass rate</span>
                    <span className="text-sm"><strong>Owner:</strong> Yehor & Andrew</span>
                  </div>
                  <p className="text-sm text-rose-600 mt-2 font-medium">
                    ⚡ Must complete by end of Day 2
                  </p>
                </div>
              </div>
            </div>

            {/* Team Status */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                Team Status
                <Tooltip text="Active = working now. Standby = ready when needed." />
              </h3>
              <div className="space-y-3">
                {TEAM.map((member, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-sm text-slate-500">{member.role} • {member.focus}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(member.status)}`}>
                      {member.status === 'active' ? '🟢 Active' : '⏳ Standby'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-md">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/"
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">SLOVD Dashboard</p>
                  <p className="text-xs text-slate-500">View verification results</p>
                </div>
              </Link>
              <a
                href="https://github.com/krellgit/sloro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">GitHub Repo</p>
                  <p className="text-xs text-slate-500">SLORO plans & docs</p>
                </div>
              </a>
              <a
                href="https://slovd.krell.works"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">SLOVD Repo</p>
                  <p className="text-xs text-slate-500">Verification dashboard</p>
                </div>
              </a>
              <button
                onClick={() => setViewMode('slides')}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">View Slides</p>
                  <p className="text-xs text-slate-500">Presentation mode</p>
                </div>
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* Slides View */
        <SlidePresentation
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          failureRate={currentFailureRate}
          totalAsins={totalAsins}
          daysRemaining={daysRemaining}
          overallCompletion={overallCompletion}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          Last updated: January 23, 2026 • Next update: End of Day 2
        </div>
      </footer>
    </div>
  );
}

// Slide Presentation Component
function SlidePresentation({
  currentSlide,
  setCurrentSlide,
  failureRate,
  totalAsins,
  daysRemaining,
  overallCompletion,
}: {
  currentSlide: number;
  setCurrentSlide: (slide: number) => void;
  failureRate: number;
  totalAsins: number;
  daysRemaining: number;
  overallCompletion: number;
}) {
  const slides = [
    // Slide 1: Title
    <div key="1" className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-5xl font-bold text-slate-900 mb-4">SLO Rollout Plan</h1>
      <p className="text-2xl text-slate-600 mb-8">7-Day Sprint to Launch</p>
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-6xl font-bold text-indigo-600">{overallCompletion}%</p>
          <p className="text-slate-500 mt-2">Complete</p>
        </div>
        <div className="text-center">
          <p className="text-6xl font-bold text-slate-700">{daysRemaining}</p>
          <p className="text-slate-500 mt-2">Days Left</p>
        </div>
        <div className="text-center">
          <p className={`text-6xl font-bold ${failureRate <= 5 ? 'text-emerald-600' : failureRate <= 10 ? 'text-amber-600' : 'text-rose-600'}`}>{failureRate}%</p>
          <p className="text-slate-500 mt-2">Failure Rate</p>
        </div>
      </div>
      <p className="text-slate-400 mt-12">January 23-30, 2026</p>
    </div>,

    // Slide 2: Current Status
    <div key="2" className="h-full">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Current Status</h2>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
            <h3 className="font-semibold text-emerald-800 text-lg">✅ Completed</h3>
            <ul className="mt-3 space-y-2 text-emerald-700">
              <li>• SLOVD Dashboard: LIVE</li>
              <li>• Testing: 50 ASINs across 19 categories</li>
              <li>• Infrastructure: Fully operational</li>
            </ul>
          </div>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <h3 className="font-semibold text-amber-800 text-lg">🔧 In Progress</h3>
            <ul className="mt-3 space-y-2 text-amber-700">
              <li>• M2 Competitor Data Fix (Priority #1)</li>
              <li>• Failure Rate: {failureRate}% → Target &lt;5%</li>
            </ul>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-800 text-lg">⏳ Not Started</h3>
            <ul className="mt-3 space-y-2 text-slate-600">
              <li>• Client ASIN Testing (15-20 products)</li>
              <li>• Presentation Materials</li>
              <li>• Customer Call Scheduling</li>
            </ul>
          </div>
          <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6">
            <h3 className="font-semibold text-rose-800 text-lg">🚨 Critical Blocker</h3>
            <p className="mt-3 text-rose-700">
              M2 competitor data structure missing - causes cascading failures. Must fix Days 1-2.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Slide 3: The 7-Day Plan
    <div key="3" className="h-full">
      <h2 className="text-3xl font-bold text-slate-900 mb-6">The 7-Day Plan</h2>
      <div className="grid grid-cols-3 gap-4">
        {PHASES.map((phase, i) => (
          <div key={i} className={`rounded-xl p-4 border-2 ${
            phase.status === 'in_progress' ? 'bg-amber-50 border-amber-300' :
            phase.status === 'scheduled' ? 'bg-blue-50 border-blue-300' :
            'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                phase.status === 'in_progress' ? 'bg-amber-500' :
                phase.status === 'scheduled' ? 'bg-blue-500' :
                'bg-slate-400'
              }`}>{i + 1}</span>
              <span className="text-xs text-slate-500">{phase.days}</span>
            </div>
            <h3 className="font-semibold text-slate-900">{phase.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{phase.target}</p>
            <div className="mt-2 bg-slate-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${
                phase.status === 'in_progress' ? 'bg-amber-500' :
                phase.status === 'scheduled' ? 'bg-blue-500' :
                'bg-slate-400'
              }`} style={{ width: `${phase.completion}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>,

    // Slide 4: Team
    <div key="4" className="h-full">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Team Assignments</h2>
      <div className="grid grid-cols-2 gap-6">
        {TEAM.map((member, i) => (
          <div key={i} className={`rounded-xl p-6 border-2 ${
            member.status === 'active' ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-semibold text-slate-900">{member.name}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                member.status === 'active' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {member.status === 'active' ? '🟢 Active' : '⏳ Standby'}
              </span>
            </div>
            <p className="text-indigo-600 font-medium">{member.role}</p>
            <p className="text-slate-600 mt-2">{member.focus}</p>
          </div>
        ))}
      </div>
    </div>,

    // Slide 5: Success Criteria
    <div key="5" className="h-full">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">Success Criteria</h2>
      <div className="space-y-6">
        <div className="flex items-center gap-6 p-4 bg-white rounded-xl border-2 border-slate-200">
          <div className="text-4xl font-bold text-amber-600 w-24">Day 2</div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">M2 fix deployed, 70% pass rate achieved</p>
            <p className="text-slate-500">20 previously failed ASINs re-tested and passing</p>
          </div>
        </div>
        <div className="flex items-center gap-6 p-4 bg-white rounded-xl border-2 border-slate-200">
          <div className="text-4xl font-bold text-emerald-600 w-24">Day 3</div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">80% pass rate, client ASINs selected</p>
            <p className="text-slate-500">15-20 client products identified with baseline data</p>
          </div>
        </div>
        <div className="flex items-center gap-6 p-4 bg-white rounded-xl border-2 border-slate-200">
          <div className="text-4xl font-bold text-indigo-600 w-24">Day 5</div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">20 client ASINs done, 85% pass rate</p>
            <p className="text-slate-500">Top 10 outputs selected for customer presentations</p>
          </div>
        </div>
        <div className="flex items-center gap-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-300">
          <div className="text-4xl font-bold text-blue-600 w-24">Day 8</div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">3-5 customer presentations completed</p>
            <p className="text-slate-500">Feedback collected, next steps defined</p>
          </div>
        </div>
      </div>
    </div>,

    // Slide 6: What Customers See
    <div key="6" className="h-full">
      <h2 className="text-3xl font-bold text-slate-900 mb-8">What Customers Will See</h2>
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold text-emerald-700 mb-4">✅ We SHOW:</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">1</span>
              <span>Current listing (before)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">2</span>
              <span>Optimized version (after)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">3</span>
              <span>SLOVD verification report</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm">4</span>
              <span>Key improvements highlighted</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-rose-700 mb-4">❌ We DON&apos;T Promise:</h3>
          <ul className="space-y-3 text-slate-600">
            <li className="flex items-start gap-3">
              <span className="text-rose-500">✗</span>
              <span>A/B testing (MYE not ready)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-rose-500">✗</span>
              <span>All products ready (only 20 tested)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-rose-500">✗</span>
              <span>Fully automated (manual QA involved)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-rose-500">✗</span>
              <span>Available next week (needs iteration)</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="mt-8 p-6 bg-indigo-50 rounded-xl border-2 border-indigo-200">
        <p className="text-lg text-indigo-800 font-medium">
          💡 Position as &quot;exclusive preview&quot; - &quot;Help us make this perfect for sellers like you&quot;
        </p>
      </div>
    </div>,
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Slide Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-8 overflow-auto">
        {slides[currentSlide]}
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-slate-200 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentSlide ? 'bg-indigo-500' : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors"
          >
            Next →
          </button>
        </div>
        <p className="text-center text-sm text-slate-500 mt-2">
          Slide {currentSlide + 1} of {slides.length}
        </p>
      </div>
    </div>
  );
}
