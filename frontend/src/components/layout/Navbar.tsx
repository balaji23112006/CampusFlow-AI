import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Bell, User as UserIcon, LogOut, Activity, CheckCircle, Clock, Sparkles, X, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../../services/api';

interface RealNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: any;
  color: string;
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatNotifTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return timestamp;
    }
  };

  const fetchRealNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoadingNotifs(true);
    try {
      // Fetch the latest 6 real system audit events
      const res = await fetch(`${API_BASE_URL}/audit/logs?limit=6`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        const mapped: RealNotification[] = items.map((item: any) => {
          const actionUpper = (item.action || '').toUpperCase();
          const actorUpper = (item.actor_type || '').toUpperCase();
          const statusUpper = (item.status || '').toUpperCase();

          let IconComp = Clock;
          let color = 'text-cyan-400';
          if (statusUpper === 'SUCCESS' || actionUpper.includes('APPROVE') || actionUpper.includes('COMPLETE')) {
            IconComp = CheckCircle;
            color = 'text-emerald-400';
          } else if (actionUpper.includes('ROUTE') || actionUpper.includes('APPROVAL') || statusUpper === 'PENDING') {
            IconComp = Clock;
            color = 'text-amber-400';
          } else if (actionUpper.includes('FAIL') || actionUpper.includes('ERROR') || statusUpper === 'FAILURE') {
            IconComp = AlertCircle;
            color = 'text-rose-400';
          } else if (actorUpper === 'AGENT') {
            IconComp = Sparkles;
            color = 'text-purple-400';
          } else if (actorUpper === 'STAFF') {
            IconComp = ShieldCheck;
            color = 'text-emerald-400';
          }

          // Human friendly title & message
          const cleanTitle = (item.action || 'System Event').replace(/_/g, ' ');
          const actorLabel = item.actor_name ? `${item.actor_name} (${actorUpper})` : actorUpper;
          const cleanMessage = item.workflow_id
            ? `Workflow #${item.workflow_id} · Triggered by ${actorLabel}. Status: ${statusUpper}.`
            : `System action triggered by ${actorLabel}. Status: ${statusUpper}.`;

          return {
            id: item.id,
            title: cleanTitle,
            message: cleanMessage,
            time: formatNotifTime(item.timestamp),
            icon: IconComp,
            color
          };
        });
        setNotifications(mapped);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRealNotifications();
  }, [fetchRealNotifications]);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6 shrink-0">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Bot className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div className="text-left">
          <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            CampusFlow AI
            <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Autonomous Agent
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">From Student Request to Resolution</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 relative">
        {/* Backend & DB Active Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-full font-medium">
          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>PostgreSQL & Auth Active</span>
        </div>

        {/* System Notifications Button */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
        </button>

        {/* Notifications Popover */}
        {showNotifications && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3 text-left backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">System Notifications</h3>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {loadingNotifs ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  Loading real events...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  No active system notifications
                </div>
              ) : (
                notifications.map((n) => {
                  const IconComp = n.icon;
                  return (
                    <div key={n.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-amber-500/30 transition space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${n.color}`}>
                          <IconComp className="w-3.5 h-3.5" />
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* User Profile & Account Dropdown Trigger */}
        {user && (
          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 font-bold text-xs">
              <UserIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-100">{user.name}</div>
              <div className="text-[10px] text-amber-400/90 font-mono font-semibold uppercase">{user.role}</div>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition cursor-pointer"
              title="Account Settings"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
