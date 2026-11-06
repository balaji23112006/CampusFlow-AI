import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Search, Filter, ShieldCheck, CheckCircle2, Bot, User, Cpu, TrendingUp, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Clock, Layers } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

// --- Types ---
interface AuditLog {
  id: string;
  timestamp: string;
  actor_type: string;
  actor_id: string;
  actor_name: string | null;
  actor_roll_number?: string | null;
  action: string;
  workflow_id: string | null;
  tool_used: string | null;
  input_summary: Record<string, any> | null;
  result_summary: Record<string, any> | null;
  status: string;
  error_info: string | null;
}

interface AuditStats {
  total_events: number;
  agent_tool_calls: number;
  staff_decisions: number;
  failures_recovered: number;
  avg_latency_ms: number | null;
  redacted_secrets_count: number;
  secret_redaction_rate: string;
}

// --- Helper ---
function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return ts;
  }
}

const ACTOR_COLORS: Record<string, { bg: string; text: string; icon: React.FC<any> }> = {
  STUDENT: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', icon: User },
  AGENT:   { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400', icon: Bot },
  STAFF:   { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', icon: ShieldCheck },
  SYSTEM:  { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400', icon: Cpu },
};

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  FAILURE: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  PENDING: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  submitted: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

function LogCard({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const actor = ACTOR_COLORS[log.actor_type] || ACTOR_COLORS['SYSTEM'];
  const ActorIcon = actor.icon;
  const statusClass = STATUS_COLORS[log.status] || STATUS_COLORS['PENDING'];

  const displayActorId = log.actor_name
    ? `${log.actor_name}${log.actor_roll_number ? ` (${log.actor_roll_number})` : ''}`
    : (log.actor_type === 'AGENT' ? 'CampusFlow AI Agent' : log.actor_id);

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 hover:border-[var(--border-subtle)] transition-all duration-200">
      <div className="flex items-start gap-3">
        {/* Actor Icon */}
        <div className={`w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center ${actor.bg}`}>
          <ActorIcon className={`w-4 h-4 ${actor.text}`} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${actor.bg} ${actor.text} uppercase tracking-wider mr-2`}>
                {log.actor_type}
              </span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">{displayActorId}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusClass}`}>
                {log.status.toUpperCase()}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {formatTimestamp(log.timestamp)}
              </span>
            </div>
          </div>

          <p className="mt-1.5 text-sm font-bold text-white tracking-tight font-mono">{log.action}</p>

          <div className="flex flex-wrap gap-2 mt-1.5">
            {log.workflow_id && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-deep)] px-2 py-0.5 rounded border border-[var(--border-default)]">
                req: {log.workflow_id.slice(0, 12)}…
              </span>
            )}
            {log.tool_used && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                tool: {log.tool_used}
              </span>
            )}
          </div>

          {/* Expand details */}
          {(log.input_summary || log.result_summary || log.error_info) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)] hover:text-amber-400 transition-colors cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide details' : 'View details'}
            </button>
          )}

          {expanded && (
            <div className="mt-3 space-y-2">
              {log.input_summary && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] mb-1">INPUT</p>
                  <pre className="text-[10px] font-mono text-slate-300 bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.input_summary, null, 2)}
                  </pre>
                </div>
              )}
              {log.result_summary && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] mb-1">RESULT</p>
                  <pre className="text-[10px] font-mono text-slate-300 bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(log.result_summary, null, 2)}
                  </pre>
                </div>
              )}
              {log.error_info && (
                <div>
                  <p className="text-[10px] font-semibold text-rose-400 mb-1">ERROR</p>
                  <pre className="text-[10px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                    {log.error_info}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================
// Main AuditPage Component
// ========================
export const AuditPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const [filterActor, setFilterActor] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [stats, setStats] = useState<AuditStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);

  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/audit/stats`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AuditStats = await res.json();
      setStats(data);
    } catch (e: any) {
      setStatsError(e.message || 'Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogsError(null);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (filterActor !== 'ALL') params.set('actor_type', filterActor);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`${API_BASE_URL}/audit/logs?${params.toString()}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.items || []);
      setTotalLogs(data.total || 0);
    } catch (e: any) {
      setLogsError(e.message || 'Failed to load audit logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [filterActor, debouncedSearch]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actorFilters = [
    { id: 'ALL',     label: 'All Actors', icon: Filter },
    { id: 'STUDENT', label: 'Student',    icon: User },
    { id: 'AGENT',   label: 'AI Agent',   icon: Bot },
    { id: 'STAFF',   label: 'Staff',      icon: ShieldCheck },
    { id: 'SYSTEM',  label: 'System',     icon: Cpu },
  ];

  const metricCards = [
    {
      label: 'Total Audit Events',
      value: loadingStats ? '…' : (stats?.total_events ?? 0).toString(),
      sub: stats && stats.total_events > 0 ? `${stats.redacted_secrets_count} secrets redacted` : 'No events yet',
      subColor: 'text-emerald-400',
      icon: Activity,
      iconColor: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Agent Tool Calls',
      value: loadingStats ? '…' : (stats?.agent_tool_calls ?? 0).toString(),
      sub: stats?.avg_latency_ms ? `Avg Latency: ${stats.avg_latency_ms}ms` : 'No tool executions yet',
      subColor: 'text-slate-400',
      icon: Bot,
      iconColor: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Staff Human Decisions',
      value: loadingStats ? '…' : (stats?.staff_decisions ?? 0).toString(),
      sub: 'Zero AI auto-approvals enforced',
      subColor: 'text-emerald-400',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Failures Recovered',
      value: loadingStats ? '…' : (stats?.failures_recovered ?? 0).toString(),
      sub: stats && stats.failures_recovered > 0 ? 'Logged & escalated' : 'No failures recorded',
      subColor: 'text-amber-400',
      icon: TrendingUp,
      iconColor: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
  ];

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Page Header */}
      <div className="gsap-animate-header flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Audit Trail</h1>
          </div>
          <p className="text-sm text-slate-400 ml-[42px]">
            Live execution history from PostgreSQL — Student, AI Agent, Staff, and System events.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>{totalLogs} recorded events</span>
          </div>
          <button
            onClick={() => { fetchStats(); fetchLogs(); }}
            className="px-3 py-1.5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-amber-400 hover:border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Error Banner */}
      {statsError && (
        <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load audit statistics: {statsError}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="gsap-animate-card relative overflow-hidden bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4 space-y-2 hover:border-[var(--border-subtle)] transition-all duration-300"
          >
            <div className={`w-8 h-8 rounded-lg ${m.bg} border ${m.border} flex items-center justify-center`}>
              <m.icon className={`w-4 h-4 ${m.iconColor}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider leading-tight">{m.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
              <p className={`text-[11px] font-medium mt-0.5 ${m.subColor}`}>{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search action, tool, or workflow ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-amber)] transition-colors"
            />
          </div>

          {/* Actor Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {actorFilters.map((actor) => (
              <button
                key={actor.id}
                onClick={() => setFilterActor(actor.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  filterActor === actor.id
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10'
                    : 'bg-[var(--surface-deep)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-subtle)]'
                }`}
              >
                <actor.icon className="w-3 h-3" />
                {actor.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs */}
      {logsError && (
        <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load audit logs: {logsError}
        </div>
      )}

      {loadingLogs ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-12 text-center">
          <Activity className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">No audit events found</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {filterActor !== 'ALL' || debouncedSearch
              ? 'No events match your current filter or search term.'
              : 'Audit events are automatically recorded as students, agents, and staff perform actions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
          {totalLogs > logs.length && (
            <p className="text-center text-xs text-[var(--text-muted)] py-2">
              Showing {logs.length} of {totalLogs} events.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
