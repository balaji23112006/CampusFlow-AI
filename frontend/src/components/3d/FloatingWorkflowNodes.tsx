import React from 'react';
import { CheckCircle2, Disc3 } from 'lucide-react';
import type { AgentVisualState } from './AgentStatusBadge';

interface FloatingWorkflowNodesProps {
  currentStatus: AgentVisualState;
}

export const FloatingWorkflowNodes: React.FC<FloatingWorkflowNodesProps> = ({ currentStatus }) => {
  const nodes = [
    { key: 'GOAL', index: 1, label: 'GOAL', activeStates: ['IDLE', 'THINKING'] },
    { key: 'POLICY', index: 2, label: 'POLICY', activeStates: ['SEARCHING', 'PLANNING'] },
    { key: 'DOCS', index: 3, label: 'DOCUMENTS', activeStates: ['VERIFYING'] },
    { key: 'APPROVAL', index: 4, label: 'APPROVAL', activeStates: ['WAITING_APPROVAL'] },
    { key: 'RESOLVED', index: 5, label: 'RESOLVED', activeStates: ['SUCCESS'] }
  ];

  // Determine current active node index
  const activeIndex = nodes.findIndex((n) => n.activeStates.includes(currentStatus));

  return (
    <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-20 pointer-events-none flex items-center justify-center">
      <div className="w-full max-w-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-2xl px-3 sm:px-5 py-2 shadow-2xl flex items-center justify-between relative overflow-hidden">
        {/* Subtle background ambient glow strip */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-cyan-500/5 to-amber-500/5 pointer-events-none" />

        {nodes.map((n, idx) => {
          const isActive = n.activeStates.includes(currentStatus);
          const isPassed = activeIndex > -1 && idx < activeIndex;

          return (
            <React.Fragment key={n.key}>
              {/* Node Card */}
              <div
                className={`relative z-10 flex items-center gap-1.5 transition-all duration-300 ${
                  isActive
                    ? 'scale-105 opacity-100'
                    : isPassed
                    ? 'opacity-85'
                    : 'opacity-40'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/50 ring-2 ring-amber-400/30'
                      : isPassed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isActive ? (
                    <Disc3 className="w-3.5 h-3.5 text-slate-950 animate-spin" />
                  ) : (
                    n.index
                  )}
                </div>

                <span
                  className={`text-[10px] font-mono tracking-tight font-semibold hidden md:inline transition-colors ${
                    isActive
                      ? 'text-amber-300 font-bold'
                      : isPassed
                      ? 'text-slate-300'
                      : 'text-slate-400'
                  }`}
                >
                  {n.label}
                </span>
              </div>

              {/* Connector laser track between nodes */}
              {idx < nodes.length - 1 && (
                <div className="flex-1 mx-1.5 sm:mx-2.5 h-[2px] bg-slate-800 relative rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isPassed || isActive
                        ? 'bg-gradient-to-r from-amber-400 to-cyan-400 w-full shadow-sm shadow-amber-400/40'
                        : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

