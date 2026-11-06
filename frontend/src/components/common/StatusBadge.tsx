import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileSearch, Sparkles, ShieldCheck } from 'lucide-react';

export type StatusType = 
  | 'draft'
  | 'submitted'
  | 'planning'
  | 'in_review'
  | 'waiting_for_document'
  | 'document_verification'
  | 'ready_for_submission'
  | 'waiting_for_approval'
  | 'approved'
  | 'completed'
  | 'changes_requested'
  | 'rejected'
  | 'failed'
  | 'needs_review'
  | 'valid'
  | 'invalid'
  | 'pending';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const normStatus = (status || 'draft').toLowerCase() as StatusType;

  let label = status ? status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let IconComponent = Clock;

  switch (normStatus) {
    case 'completed':
    case 'approved':
    case 'valid':
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      IconComponent = CheckCircle2;
      if (normStatus === 'completed') label = 'COMPLETED';
      if (normStatus === 'approved') label = 'APPROVED';
      if (normStatus === 'valid') label = 'VERIFIED VALID';
      break;

    case 'waiting_for_approval':
    case 'waiting_for_document':
    case 'pending':
    case 'changes_requested':
    case 'needs_review':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      IconComponent = ShieldCheck;
      if (normStatus === 'waiting_for_approval') label = 'AWAITING STAFF APPROVAL';
      if (normStatus === 'waiting_for_document') label = 'WAITING FOR DOCUMENT';
      if (normStatus === 'changes_requested') label = 'CHANGES REQUESTED';
      if (normStatus === 'needs_review') label = 'NEEDS HUMAN REVIEW';
      break;

    case 'planning':
    case 'in_review':
    case 'document_verification':
    case 'ready_for_submission':
    case 'submitted':
      colorClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      IconComponent = Sparkles;
      if (normStatus === 'planning') label = 'AI PLANNING';
      if (normStatus === 'document_verification') label = 'VERIFYING DOCS';
      if (normStatus === 'ready_for_submission') label = 'READY TO SUBMIT';
      break;

    case 'rejected':
    case 'failed':
    case 'invalid':
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      IconComponent = XCircle;
      if (normStatus === 'rejected') label = 'REJECTED';
      if (normStatus === 'failed') label = 'FAILED';
      if (normStatus === 'invalid') label = 'INVALID DOCUMENT';
      break;

    default:
      colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
      IconComponent = Clock;
      break;
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2'
  }[size];

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${colorClasses} ${sizeClasses} ${className}`}>
      <IconComponent className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};
