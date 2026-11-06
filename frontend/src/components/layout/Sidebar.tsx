import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  GitMerge, 
  FileText, 
  ShieldCheck,
  Activity,
  LogIn,
  GraduationCap,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { useGsapAnimations } from '../../hooks/useGsapAnimations';

export const Sidebar: React.FC = () => {
  const containerRef = useGsapAnimations();
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/agent', label: 'AI Agent Workspace', icon: Bot, badge: 'Live 3D' },
    { to: '/workflows', label: 'Workflows & Status', icon: GitMerge },
    { to: '/approvals', label: 'Human Approvals', icon: ShieldCheck, badge: 'Staff' },
    { to: '/documents', label: 'Document Vault', icon: FileText },
    { to: '/audit', label: 'Audit Trail', icon: Activity, badge: 'Logs' },
    { to: '/settings', label: 'Account & Security', icon: KeyRound },
    { to: '/login', label: 'Switch Account', icon: LogIn }
  ];

  return (
    <aside ref={containerRef as any} className="w-64 border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between p-4 hidden md:flex shrink-0 z-20">
      <div className="space-y-6">
        {/* Flagship Workflow Banner */}
        <div className="px-3.5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3 text-left shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Flagship Workflow</p>
            <p className="text-xs font-semibold text-slate-100 leading-tight">Internship Approval / NOC</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 text-left">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }: { isActive: boolean }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-extrabold bg-slate-800/80 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Branding Info */}
      <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-left space-y-1">
        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CampusFlow AI</span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">Autonomous University Service Engine</p>
      </div>
    </aside>
  );
};
