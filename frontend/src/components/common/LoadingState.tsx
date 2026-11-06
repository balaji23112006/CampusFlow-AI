import React from 'react';
import { Bot } from 'lucide-react';

interface LoadingStateProps {
  text?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ text = 'Loading CampusFlow data...' }) => {
  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-center p-8 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse">
        <Bot className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-xs font-semibold text-slate-400 tracking-wide">{text}</p>
    </div>
  );
};
