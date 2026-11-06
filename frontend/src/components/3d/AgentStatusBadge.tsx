import React from 'react';
import { Bot, Sparkles, Search, GitMerge, FileCheck2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export type AgentVisualState =
  | 'IDLE'
  | 'THINKING'
  | 'SEARCHING'
  | 'PLANNING'
  | 'VERIFYING'
  | 'WAITING_APPROVAL'
  | 'SUCCESS'
  | 'ERROR';

interface AgentStatusBadgeProps {
  status: AgentVisualState;
  activityText?: string;
}

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({ status, activityText }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'IDLE':
        return {
          icon: Bot,
          label: 'IDLE',
          bg: 'bg-indigo-950/60',
          border: 'border-indigo-800/40',
          text: 'text-indigo-300',
          dot: 'bg-indigo-400'
        };
      case 'THINKING':
        return {
          icon: Sparkles,
          label: 'THINKING',
          bg: 'bg-indigo-900/60',
          border: 'border-indigo-500/50',
          text: 'text-indigo-200',
          dot: 'bg-indigo-400 animate-pulse'
        };
      case 'SEARCHING':
        return {
          icon: Search,
          label: 'SEARCHING RAG POLICY',
          bg: 'bg-amber-950/60',
          border: 'border-amber-800/40',
          text: 'text-amber-300',
          dot: 'bg-amber-400 animate-ping'
        };
      case 'PLANNING':
        return {
          icon: GitMerge,
          label: 'GENERATING PLAN',
          bg: 'bg-purple-950/60',
          border: 'border-purple-800/40',
          text: 'text-purple-300',
          dot: 'bg-purple-400'
        };
      case 'VERIFYING':
        return {
          icon: FileCheck2,
          label: 'VERIFYING DOCUMENTS',
          bg: 'bg-emerald-950/60',
          border: 'border-emerald-800/40',
          text: 'text-emerald-300',
          dot: 'bg-emerald-400 animate-pulse'
        };
      case 'WAITING_APPROVAL':
        return {
          icon: Clock,
          label: 'AWAITING STAFF APPROVAL',
          bg: 'bg-amber-950/80',
          border: 'border-amber-500/50',
          text: 'text-amber-300 font-bold',
          dot: 'bg-amber-400 animate-pulse'
        };
      case 'SUCCESS':
        return {
          icon: CheckCircle2,
          label: 'COMPLETED',
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-500/50',
          text: 'text-emerald-300 font-bold',
          dot: 'bg-emerald-400'
        };
      case 'ERROR':
      default:
        return {
          icon: AlertTriangle,
          label: 'ERROR / NEEDS REVIEW',
          bg: 'bg-rose-950/80',
          border: 'border-rose-500/50',
          text: 'text-rose-300 font-bold',
          dot: 'bg-rose-400 animate-ping'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg transition-all" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
      <Icon className={`w-3.5 h-3.5 ${config.text}`} />
      <span className={`text-xs font-mono font-semibold ${config.text}`}>{config.label}</span>
      {activityText && <span className="text-slate-400 text-xs pl-1 border-l border-slate-700">{activityText}</span>}
    </div>
  );
};
