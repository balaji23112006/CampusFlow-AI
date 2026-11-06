import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionButton
}) => {
  return (
    <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center space-y-4 max-w-md mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-amber-400/80 shadow-lg">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-200 tracking-tight">{title}</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">{description}</p>
      </div>
      {actionButton && <div className="pt-2">{actionButton}</div>}
    </div>
  );
};
