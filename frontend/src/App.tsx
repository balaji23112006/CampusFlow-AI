import { useEffect, useState } from 'react';
import { checkBackendHealth, HealthResponse } from './services/api';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        setLoading(true);
        const data = await checkBackendHealth();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to backend');
      } finally {
        setLoading(false);
      }
    }

    loadHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-xl w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm text-center">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Build Fast with AI Challenge 2026
        </div>

        {/* App Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
          CampusFlow AI
        </h1>
        <p className="text-lg text-indigo-300 font-medium mb-8">
          Autonomous University Service Agent
        </p>

        {/* Backend Health Status Section */}
        <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800/80 text-left">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            System & API Connection Status
          </h2>

          {loading && (
            <div className="flex items-center gap-3 text-slate-400 py-2 text-sm">
              <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Connecting to FastAPI backend health endpoint...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between bg-red-950/40 border border-red-800/50 rounded-lg p-3 text-red-300 text-sm">
              <span>Failed to reach backend API ({error})</span>
              <button 
                onClick={() => window.location.reload()} 
                className="text-xs bg-red-900/60 hover:bg-red-800 text-red-200 px-2.5 py-1 rounded transition cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {health && (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-3 text-sm">
                <span className="text-slate-300 font-medium">Backend Status (GET /health)</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-900/30 px-2.5 py-0.5 rounded-full text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {health.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-slate-400 pl-1">
                Connected Service: <span className="font-mono text-slate-200">{health.service}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
