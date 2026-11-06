import React, { useState } from 'react';
import { User, Bot, Cpu, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor_type: 'STUDENT' | 'AGENT' | 'SYSTEM' | 'STAFF' | string;
  actor_id: string;
  action: string;
  workflow_id?: string;
  tool_used?: string;
  input_summary?: any;
  result_summary?: any;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'NEEDS_REVIEW' | string;
  error_info?: string;
}

interface ActivityTimelineProps {
  events: AuditEvent[];
  traceId?: string;
}

const ActorBadge: React.FC<{ actorType: string }> = ({ actorType }) => {
  switch (actorType.toUpperCase()) {
    case 'STUDENT':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
          <User className="w-3.5 h-3.5" />
        </div>
      );
    case 'AGENT':
      return (
        <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
          <Bot className="w-3.5 h-3.5" />
        </div>
      );
    case 'STAFF':
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
      );
    case 'SYSTEM':
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0">
          <Cpu className="w-3.5 h-3.5" />
        </div>
      );
  }
};

const ActorLabel: React.FC<{ actorType: string }> = ({ actorType }) => {
  const styles: Record<string, string> = {
    STUDENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    AGENT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    STAFF: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    SYSTEM: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  const cls = styles[actorType.toUpperCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${cls}`}>
      {actorType}
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" /> Success
        </span>
      );
    case 'FAILURE':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
          <AlertTriangle className="w-3 h-3" /> Needs Review
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
  }
};

const TimelineEvent: React.FC<{ event: AuditEvent; isLast: boolean }> = ({ event, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(event.input_summary || event.result_summary || event.error_info);

  return (
    <div className="relative flex items-start gap-3 group">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-gradient-to-b from-[var(--border-default)] to-transparent" />
      )}

      {/* Actor Badge */}
      <div className="relative z-10 mt-0.5">
        <ActorBadge actorType={event.actor_type} />
      </div>

      {/* Event Card */}
      <div className="flex-1 min-w-0 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl overflow-hidden hover:border-[var(--border-subtle)] transition-all duration-200 mb-3">
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <ActorLabel actorType={event.actor_type} />
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {event.action.replace(/_/g, ' ')}
              </span>
              {event.tool_used && (
                <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-md border border-amber-500/20 shrink-0">
                  {event.tool_used}
                </span>
              )}
            </div>
            <StatusBadge status={event.status} />
          </div>

          <div className="flex items-center gap-3 mt-2">
            <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {new Date(event.timestamp).toLocaleString()}
            </p>
            {event.actor_id && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[180px]">{event.actor_id}</span>
            )}
          </div>

          {event.error_info && (
            <div className="mt-2.5 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>{event.error_info}</span>
            </div>
          )}

          {/* Expand Toggle */}
          {hasDetails && (event.input_summary || event.result_summary) && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {expanded ? 'Collapse details' : 'View details'}
            </button>
          )}
        </div>

        {/* Expanded Details */}
        {expanded && (event.input_summary || event.result_summary) && (
          <div className="border-t border-[var(--border-default)] bg-[var(--surface-deep)] p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {event.input_summary && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Input Summary</p>
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg p-2 font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                  {JSON.stringify(event.input_summary, null, 2)}
                </div>
              </div>
            )}
            {event.result_summary && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Result Summary</p>
                <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg p-2 font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
                  {JSON.stringify(event.result_summary, null, 2)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events, traceId }) => {
  if (events.length === 0) {
    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-10 text-center">
        <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">No audit events found</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your filters or search term.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Execution Timeline</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''} recorded</p>
        </div>
        {traceId && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] font-mono text-amber-300">
            <span className="text-[var(--text-muted)]">Trace:</span>
            <span className="font-semibold">{traceId}</span>
          </div>
        )}
      </div>

      {/* Events */}
      <div className="pt-1">
        {events.map((event, idx) => (
          <TimelineEvent key={event.id} event={event} isLast={idx === events.length - 1} />
        ))}
      </div>
    </div>
  );
};
