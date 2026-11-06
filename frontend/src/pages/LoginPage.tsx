import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  UserCheck,
  GraduationCap,
  ShieldCheck,
  User as UserIcon,
  Lock,
  Mail,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  X,
  KeyRound,
  AlertCircle,
  Zap,
  ArrowRight,
  Cpu,
  Network,
} from 'lucide-react';
import { useAuth, checkPasswordPolicy, validateEmailFormat } from '../context/AuthContext';
import { CampusFlowCanvas } from '../components/3d/CampusFlowCanvas';
import type { UserRole } from '../types';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

export const LoginPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const navigate = useNavigate();
  const { login, signup, user } = useAuth();

  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);

  // Form State (ZERO pre-filled demo defaults)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [forgotEmail, setForgotEmail] = useState<string>('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const policyStatus = checkPasswordPolicy(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!validateEmailFormat(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      if (!policyStatus.isValid) {
        setError('Password does not meet the required security requirements.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signup(cleanEmail, password, confirmPassword, fullName, selectedRole);
      } else {
        await login(cleanEmail, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!validateEmailFormat(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const res = await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      setSuccessMsg(data.message || 'If an account exists for this email, password reset instructions have been sent.');
    } catch {
      setSuccessMsg('If an account exists for this email, password reset instructions have been sent.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'student', label: 'Student', desc: 'Apply & Track Requests', icon: GraduationCap },
    { id: 'advisor', label: 'Academic Advisor', desc: 'Verify Academic Standing', icon: UserCheck },
    { id: 'hod', label: 'Head of Dept (HOD)', desc: 'Grant Formal Approvals', icon: ShieldCheck },
    { id: 'placement_officer', label: 'TPO Officer', desc: 'Generate & Sign NOC', icon: UserIcon },
  ];

  const features = [
    { icon: ShieldCheck, label: 'JWT Session Security', desc: 'Cryptographically signed tokens' },
    { icon: Cpu, label: 'AI Autonomous Workflows', desc: 'Multi-step agentic processing' },
    { icon: Network, label: 'Role-Based Access Control', desc: 'Strict user data isolation' },
  ];

  const policyChecks = [
    { label: 'At least 8 characters', met: policyStatus.hasMinLength },
    { label: 'One uppercase letter', met: policyStatus.hasUppercase },
    { label: 'One lowercase letter', met: policyStatus.hasLowercase },
    { label: 'One number', met: policyStatus.hasNumber },
    { label: 'One special character', met: policyStatus.hasSpecialChar },
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] flex items-stretch overflow-hidden">
      {/* ── Left Panel: Branding + 3D Canvas ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-[var(--surface-deep)] border-r border-[var(--border-default)] p-10 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-amber-500/6 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 space-y-2 gsap-animate-header">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">CampusFlow</span>
              <span className="text-base font-bold text-amber-400 tracking-tight"> AI</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold">
            <Zap className="w-3 h-3" />
            Autonomous University Service Agent
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8">
          <CampusFlowCanvas
            status="IDLE"
            activityText="Standing by for user request..."
            showNodes={true}
            className="h-72 w-full"
          />
          <div className="mt-6 text-center max-w-sm">
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Intelligent University
              <br />
              <span className="text-amber-400">Workflow Automation</span>
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-3 leading-relaxed">
              Secure, AI-powered processing for NOC requests, document verification, and administrative approvals.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="relative z-10 space-y-3">
          {features.map((f) => (
            <div key={f.label} className="gsap-animate-card flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-amber-500/20 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)]">{f.label}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Auth Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="gsap-animate-card w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-black" />
            </div>
            <span className="text-base font-bold text-white">CampusFlow <span className="text-amber-400">AI</span></span>
          </div>

          {/* Header */}
          {!showForgotPassword ? (
            <div className="gsap-animate-header">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {isSignUp ? 'Create Account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {isSignUp
                  ? 'Register a new university portal account.'
                  : 'Sign in to the CampusFlow AI portal.'}
              </p>
            </div>
          ) : (
            <div className="gsap-animate-header">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Enter your registered email to receive reset instructions.</p>
            </div>
          )}

          {/* Already logged in banner */}
          {user && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between">
              <span>Logged in as <strong>{user.email}</strong></span>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                Dashboard →
              </button>
            </div>
          )}

          {!showForgotPassword ? (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-[var(--surface-card)] p-1 rounded-xl border border-[var(--border-default)] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 py-2 rounded-lg transition-all duration-200 cursor-pointer ${!isSignUp ? 'bg-amber-500 text-black shadow font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 py-2 rounded-lg transition-all duration-200 cursor-pointer ${isSignUp ? 'bg-amber-500 text-black shadow font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                >
                  Create Account
                </button>
              </div>

              {/* Error / Success */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name (Sign-up) */}
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)] transition-colors"
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">University Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter university email"
                      className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)] transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl pl-9 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Policy Checklist */}
                {isSignUp && password.length > 0 && (
                  <div className="p-3.5 bg-[var(--surface-deep)] rounded-xl border border-[var(--border-default)] space-y-2">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Password requirements</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {policyChecks.map((check) => (
                        <div key={check.label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${check.met ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                          {check.met
                            ? <Check className="w-3.5 h-3.5 shrink-0" />
                            : <X className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                          }
                          <span>{check.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Password (Sign-up) */}
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl pl-9 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="text-[11px] text-red-400 mt-1">Passwords do not match.</p>
                    )}
                  </div>
                )}

                {/* Role Selector (Sign-up) */}
                {isSignUp && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Account Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRole(r.id as UserRole)}
                          className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                            selectedRole === r.id
                              ? 'bg-amber-500/15 border-amber-500/40 shadow-sm shadow-amber-500/10'
                              : 'bg-[var(--surface-deep)] border-[var(--border-default)] hover:border-[var(--border-subtle)]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <r.icon className={`w-3.5 h-3.5 shrink-0 ${selectedRole === r.id ? 'text-amber-400' : 'text-[var(--text-muted)]'}`} />
                            <span className={`text-xs font-bold ${selectedRole === r.id ? 'text-amber-300' : 'text-[var(--text-secondary)]'}`}>{r.label}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] leading-tight">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-bold shadow-lg shadow-amber-500/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {loading
                    ? (isSignUp ? 'Creating account...' : 'Signing in...')
                    : (
                      <>
                        <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )
                  }
                </button>
              </form>

              {/* Forgot Password Link */}
              {!isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setError(null); setSuccessMsg(null); }}
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-amber-400 transition cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Forgot Password Panel */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">Enter your registered email to receive password reset instructions.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-300">{error}</div>
              )}
              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300">{successMsg}</div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Registered Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter registered email"
                      className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold shadow-lg shadow-amber-500/25 transition-all duration-200 cursor-pointer"
                >
                  {loading ? 'Sending...' : 'Send Reset Instructions'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setError(null); setSuccessMsg(null); }}
                className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition py-2 cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-[var(--text-muted)] border-t border-[var(--border-default)] pt-4">
            CampusFlow AI © 2026 • Secure University Portal
          </p>
        </div>
      </div>
    </div>
  );
};
