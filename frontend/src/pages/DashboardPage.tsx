import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GitMerge, 
  Clock, 
  CheckCircle2, 
  FileCheck, 
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Send,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CampusFlowCanvas } from '../components/3d/CampusFlowCanvas';
import { StatusBadge } from '../components/common/StatusBadge';
import { API_BASE_URL, getAuthHeaders, fetchAuthenticatedWorkflows } from '../services/api';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

export const DashboardPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quickPrompt, setQuickPrompt] = useState<string>('');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState<number | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);

  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    navigate('/agent', { state: { initialPrompt: quickPrompt } });
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const wfData = await fetchAuthenticatedWorkflows();
      const wfList = Array.isArray(wfData) ? wfData : (wfData.items || wfData.workflows || []);
      setWorkflows(wfList);
    } catch (_) { setWorkflows([]); }

    try {
      const res = await fetch(`${API_BASE_URL}/audit/stats`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditTotal(data.total_events);
      }
    } catch (_) { setAuditTotal(0); }

    try {
      const res = await fetch(`${API_BASE_URL}/audit/logs?limit=3`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRecentLogs(data.items || []);
      }
    } catch (_) { setRecentLogs([]); }

    if (user && ['staff', 'advisor', 'hod', 'admin'].includes(user.role.toLowerCase())) {
      try {
        const res = await fetch(`${API_BASE_URL}/approvals/pending`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setPendingApprovals(Array.isArray(data) ? data.length : (data.total ?? data.count ?? 0));
        } else {
          setPendingApprovals(0);
        }
      } catch (_) { setPendingApprovals(0); }
    } else {
      setPendingApprovals(0);
    }
  }, [user]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // Real workflows from backend — no hardcoded samples

  return (
    <div ref={containerRef} className="space-y-8 text-left max-w-7xl mx-auto">
      {/* SaaS Command Center Welcome Banner with 3D Agent */}
      <div className="gsap-animate-card bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Header Copy & Agent Goal Bar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Autonomous University Command Center
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight flex flex-wrap items-center gap-3">
              <span>Welcome back, {user?.name || 'Student'}</span>
              {user?.rollNumber && (
                <span className="text-xs md:text-sm font-mono font-bold bg-amber-500/10 text-amber-400 px-3 py-1 rounded-xl border border-amber-500/20">
                  {user.rollNumber}
                </span>
              )}
            </h1>
            
            <p className="text-slate-300 text-sm leading-relaxed max-w-2xl font-medium">
              CampusFlow AI autonomously executes your academic administrative workflows. Start a new request or track your active requests below.
            </p>

            {/* Quick Agent Input Bar */}
            <form onSubmit={handleQuickSubmit} className="pt-2 max-w-xl">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="Ask CampusFlow AI to initiate a new request..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-24 py-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-500 transition shadow-inner"
                />
                <button
                  type="submit"
                  className="absolute right-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Execute</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Suggestion Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                <span className="text-slate-500 font-semibold">Quick Prompts:</span>
                <button
                  type="button"
                  onClick={() => navigate('/agent', { state: { initialPrompt: 'Apply for Off-Campus Internship NOC Approval' } })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700/60 text-slate-300 font-medium transition cursor-pointer"
                >
                  Internship NOC Request
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/agent', { state: { initialPrompt: 'Request Official Academic Transcript Attestation' } })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700/60 text-slate-300 font-medium transition cursor-pointer"
                >
                  Transcript Attestation
                </button>
              </div>
            </form>
          </div>

          {/* 3D Agent Visual Canvas Centerpiece */}
          <div className="w-full">
            <CampusFlowCanvas
              status="WAITING_APPROVAL"
              activityText="Awaiting HOD approval decision..."
              showNodes={true}
              className="h-64 w-full"
            />
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Active Workflows</span>
            <GitMerge className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{workflows.length}</div>
          <p className="text-xs text-slate-400">{workflows.length === 0 ? 'No workflows yet' : `${workflows.filter(w => w.status !== 'completed').length} in progress`}</p>
        </div>

        <Link to="/approvals" className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-5 shadow-sm transition block space-y-2 group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Human Approvals Queue</span>
            <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{pendingApprovals === null ? '…' : `${pendingApprovals} Pending`}</div>
          <p className="text-xs text-amber-400 font-bold group-hover:underline flex items-center gap-1">
            Review Staff Queue &rarr;
          </p>
        </Link>

        <div className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Policy Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{workflows.filter(w => ['submitted','in_review','action_required'].includes(w.status||'')).length}</div>
          <p className="text-xs text-slate-400">Active university requests</p>
        </div>

        <Link to="/audit" className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-5 shadow-sm transition block space-y-2 group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Audit Trail & Telemetry</span>
            <FileCheck className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-3xl font-extrabold text-white">{auditTotal === null ? '…' : `${auditTotal} Events`}</div>
          <p className="text-xs text-cyan-400 font-bold group-hover:underline flex items-center gap-1">
            Inspect Execution Trace &rarr;
          </p>
        </Link>
      </div>

      {/* Main Asymmetric Grid: Workflows vs Activity & Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width): Active Workflows Pipeline */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Active Workflows Pipeline</h2>
              <p className="text-xs text-slate-400">Track real-time autonomous execution & staff decision states</p>
            </div>
            <Link to="/workflows" className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              View All Workflows <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {workflows.length === 0 ? (
              <div className="bg-slate-900/80 border border-slate-800 border-dashed rounded-2xl p-10 text-center">
                <GitMerge className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No active workflows</p>
                <p className="text-xs text-slate-500 mt-1">Start a new request with the AI Agent above.</p>
              </div>
            ) : workflows.slice(0, 3).map((wf) => {
              const wfId = wf.id || wf.request_id;
              const wfCode = wf.code || wf.workflow_code || wf.workflow_id || '—';
              const wfTitle = wf.title || `${wfCode} Request`;
              const wfDesc = wf.description || '';
              const wfStatus = wf.status || 'submitted';
              const progress = wf.progressPercent ?? wf.progress_percent ?? 0;
              const stepNum = wf.currentStepNumber ?? wf.current_step ?? 1;
              const totalSteps = wf.totalSteps ?? wf.total_steps ?? 1;
              return (
              <div
                key={wfId}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition space-y-4 shadow-lg text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
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
                    /></div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-mono">{wfId?.slice(0, 16)}…</span>
                  <Link
                    to={`/workflows/${wfId}`}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    View Execution State <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1/3 width): Pending Human Approvals & Event Feed */}
        <div className="space-y-6">
          {/* Pending Approvals Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Pending Human Sign-off</h3>
              </div>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                Staff
              </span>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-amber-300">Workflow Approvals</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {pendingApprovals === null
                  ? 'Checking approvals queue…'
                  : pendingApprovals > 0
                    ? `${pendingApprovals} request(s) are awaiting staff sign-off.`
                    : 'No pending approvals. All caught up!'}
              </p>
              <Link
                to="/approvals"
                className="inline-flex items-center gap-1 text-amber-400 font-bold hover:underline pt-1 text-xs"
              >
                Go to Approvals Queue &rarr;
              </Link>
            </div>
          </div>

          {/* System Activity Stream */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-lg text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">System Execution Stream</h3>
              </div>
              <Link to="/audit" className="text-[10px] font-bold text-cyan-400 hover:underline">
                Full Logs
              </Link>
            </div>

            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-800 rounded-xl">
                  {auditTotal === 0 ? 'No execution logs recorded yet.' : 'Loading audit stream…'}
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="relative pl-4 border-l-2 border-amber-500 space-y-0.5 text-xs">
                    <div className="font-bold text-slate-200">{log.action || 'Audit Event'}</div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {log.workflow_id ? `Workflow: ${log.workflow_id}` : (log.result_summary ? String(log.result_summary).slice(0, 60) : 'Recorded event')}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'} • {log.actor_type || 'SYSTEM'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
