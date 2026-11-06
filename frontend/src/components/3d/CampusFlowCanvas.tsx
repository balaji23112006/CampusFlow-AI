import React, { useEffect, useRef, useState } from 'react';
import { Bot, AlertTriangle } from 'lucide-react';
import { createCampusFlowAgent3D, type Agent3DInstance } from './CampusFlowAgent';
import { AgentStatusBadge, type AgentVisualState } from './AgentStatusBadge';
import { FloatingWorkflowNodes } from './FloatingWorkflowNodes';

interface CampusFlowCanvasProps {
  status?: AgentVisualState;
  activityText?: string;
  showNodes?: boolean;
  className?: string;
}

export const CampusFlowCanvas: React.FC<CampusFlowCanvasProps> = ({
  status = 'IDLE',
  activityText,
  showNodes = false,
  className = 'h-64 w-full'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const agentInstanceRef = useRef<Agent3DInstance | null>(null);
  const [webGLError, setWebGLError] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Initialize Three.js 3D Agent
      const instance = createCampusFlowAgent3D(containerRef.current, status);
      agentInstanceRef.current = instance;

      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current || !agentInstanceRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        agentInstanceRef.current.updateMousePosition(x, y);
      };

      const element = containerRef.current;
      element.addEventListener('mousemove', handleMouseMove);

      const handleClick = () => {
        if (agentInstanceRef.current) {
          agentInstanceRef.current.triggerPulse();
        }
      };
      element.addEventListener('click', handleClick);

      return () => {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('click', handleClick);
        if (agentInstanceRef.current) {
          agentInstanceRef.current.dispose();
          agentInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.warn('WebGL initialization warning, rendering fallback 2D badge:', err);
      setWebGLError(true);
    }
  }, []);

  useEffect(() => {
    if (agentInstanceRef.current) {
      agentInstanceRef.current.updateStatus(status);
    }
  }, [status]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center group ${className}`}>
      {/* Background Holographic Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
      </div>

      {/* Sci-Fi HUD Corner Accents */}
      <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-amber-500/40 pointer-events-none" />
      <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-amber-500/40 pointer-events-none" />
      <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-amber-500/40 pointer-events-none" />
      <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-amber-500/40 pointer-events-none" />

      {/* Top Status Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <AgentStatusBadge status={status} activityText={activityText} />
      </div>

      {/* Top Right Live Telemetry */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-mono font-bold text-amber-400/80 shadow-md backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        <span>NEURAL_ORB::ACTIVE</span>
      </div>

      {/* Floating Workflow Nodes overlay */}
      {showNodes && <FloatingWorkflowNodes currentStatus={status} />}

      {/* 3D Canvas Container */}
      {!webGLError ? (
        <div 
          ref={containerRef} 
          title="Click to trigger neural pulse"
          className="w-full h-full cursor-grab active:cursor-grabbing relative z-10" 
        />
      ) : (
        /* Fallback 2D Render if WebGL fails */
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Bot className="w-10 h-10 text-slate-950 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">CampusFlow AI Agent</p>
            <p className="text-xs text-slate-400">WebGL Fallback Mode Active</p>
          </div>
        </div>
      )}
    </div>
  );
};
