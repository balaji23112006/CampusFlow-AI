import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight, GitMerge, Loader2, AlertCircle } from 'lucide-react';
import { fetchAuthenticatedWorkflows } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';

import { useAuth } from '../context/AuthContext';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

export const WorkflowsListPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const { user } = useAuth();
  const [search, setSearch] = useState<string>('');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAuthenticatedWorkflows();
      const list = Array.isArray(data) ? data : (data.items || data.workflows || []);
      setWorkflows(list);
    } catch (e: any) {
      setError(e.message || 'Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter(
    (wf) =>
      (wf.title || wf.workflow_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (wf.code || wf.workflow_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (wf.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="space-y-6 text-left max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="gsap-animate-header">
        <PageHeader
          title="Administrative Workflows"
          subtitle="Track, filter, and inspect stateful university requests, staff approval states, and NOC certificates."
          icon={GitMerge}
          badgeText="Stateful Engine"
          actions={
            <Link
              to="/agent"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Start New Request &rarr;
            </Link>
          }
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 max-w-md shadow-inner">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workflows by name or code (e.g. NOC)..."
          className="bg-transparent border-none text-slate-100 placeholder-slate-500 text-xs outline-none w-full font-medium"
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-slate-900/80 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredWorkflows.length > 0 ? (
        <div className="space-y-4">
          {filteredWorkflows.map((wf) => {
            const wfId = wf.id || wf.request_id;
            const wfCode = wf.code || wf.workflow_code || wf.workflow_id || '—';
            const wfTitle = wf.title || `${wfCode} Request`;
            const wfDesc = wf.description || wf.status || '';
            const wfStatus = wf.status || 'submitted';
            const progress = wf.progressPercent ?? (wf.progress_percent ?? 0);
            const stepNum = wf.currentStepNumber ?? wf.current_step ?? 1;
            const totalSteps = wf.totalSteps ?? wf.total_steps ?? 1;
            const studentName = wf.studentName || wf.student_name || user?.name || 'Student';
            const rollNumber = wf.rollNumber || wf.roll_number || user?.rollNumber || '';
            const createdAt = wf.createdAt || wf.created_at;
            const displayDate = createdAt
              ? new Date(createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })
              : '';

            return (
              <div
                key={wfId}
                className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition shadow-lg space-y-4 text-left backdrop-blur-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-950 text-amber-400 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                        {wfCode}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{wfId?.slice(0, 12)}…</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{wfTitle}</h3>
                    <p className="text-xs text-slate-400">{wfDesc}</p>
                  </div>

                  <div>
                    <StatusBadge status={wfStatus} size="md" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Step {stepNum} of {totalSteps}</span>
                    <span className="text-amber-400 font-mono font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <div className="text-slate-400">
                    {studentName && <span>Student: <span className="text-slate-200 font-medium">{studentName}{rollNumber ? ` (${rollNumber})` : ''}</span></span>}
                    {displayDate && <span className="ml-3 font-mono text-slate-500">{displayDate}</span>}
                  </div>
                  <Link
                    to={`/workflows/${wfId}`}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    Inspect State Machine <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={search ? 'No Matching Workflows' : 'No Workflows Yet'}
          description={
            search
              ? `No workflow matching '${search}' was found in the database.`
              : 'Start a new request from the AI Agent to create your first workflow.'
          }
        />
      )}
    </div>
  );
};
