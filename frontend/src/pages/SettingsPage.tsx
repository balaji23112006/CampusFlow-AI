import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, checkPasswordPolicy } from '../context/AuthContext';
import { Lock, Eye, EyeOff, Check, X, Shield, KeyRound, AlertCircle, CheckCircle2, User as UserIcon, LogOut, Mail, Hash, Building2, GraduationCap, Save, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../services/api';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

export const SettingsPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const { user, accessToken, changePassword, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');

  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // --- Academic Profile State ---
  const [academicProfile, setAcademicProfile] = useState<any | null>(null);
  const [rollInput, setRollInput] = useState<string>('');
  const [admissionYearInput, setAdmissionYearInput] = useState<string>('');
  const [semesterInput, setSemesterInput] = useState<string>('');
  const [cgpaInput, setCgpaInput] = useState<string>('');
  const [backlogsInput, setBacklogsInput] = useState<string>('');
  const [creditsInput, setCreditsInput] = useState<string>('');

  const [academicError, setAcademicError] = useState<string | null>(null);
  const [academicSuccess, setAcademicSuccess] = useState<string | null>(null);
  const [academicSaving, setAcademicSaving] = useState<boolean>(false);

  const fetchAcademicProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/student/academic-profile`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAcademicProfile(data);
        setRollInput(data.roll_number || user?.rollNumber || '');
        setAdmissionYearInput(data.admission_year !== null && data.admission_year !== undefined ? String(data.admission_year) : '');
        setSemesterInput(data.current_semester !== null && data.current_semester !== undefined ? String(data.current_semester) : '');
        setCgpaInput(data.cgpa !== null && data.cgpa !== undefined ? String(data.cgpa) : '');
        setBacklogsInput(data.active_backlogs !== null && data.active_backlogs !== undefined ? String(data.active_backlogs) : '');
        setCreditsInput(data.credits_completed !== null && data.credits_completed !== undefined ? String(data.credits_completed) : '');
      }
    } catch (_) {}
  }, [user]);

  useEffect(() => {
    if (user?.role === 'student') {
      fetchAcademicProfile();
    }
  }, [user, fetchAcademicProfile]);

  const handleSaveAcademicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcademicError(null);
    setAcademicSuccess(null);

    // Front-end Validations
    let semVal: number | null = null;
    if (semesterInput.trim()) {
      const s = parseInt(semesterInput.trim(), 10);
      if (isNaN(s) || s < 1 || s > 8) {
        setAcademicError('Current semester must be between 1 and 8.');
        return;
      }
      semVal = s;
    }

    let cgpaVal: number | null = null;
    if (cgpaInput.trim()) {
      const c = parseFloat(cgpaInput.trim());
      if (isNaN(c) || c < 0.0 || c > 10.0) {
        setAcademicError('Enter a valid CGPA between 0.0 and 10.0.');
        return;
      }
      cgpaVal = c;
    }

    let backlogsVal: number | null = null;
    if (backlogsInput.trim()) {
      const b = parseInt(backlogsInput.trim(), 10);
      if (isNaN(b) || b < 0) {
        setAcademicError('Active backlogs must be a non-negative integer.');
        return;
      }
      backlogsVal = b;
    }

    let creditsVal: number | null = null;
    if (creditsInput.trim()) {
      const cr = parseFloat(creditsInput.trim());
      if (isNaN(cr) || cr < 0.0) {
        setAcademicError('Credits completed must be a non-negative number.');
        return;
      }
      creditsVal = cr;
    }

    const admYearVal = admissionYearInput.trim() ? parseInt(admissionYearInput.trim(), 10) : null;

    setAcademicSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/student/academic-profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roll_number: rollInput.trim() || undefined,
          admission_year: admYearVal || undefined,
          current_semester: semVal,
          cgpa: cgpaVal,
          active_backlogs: backlogsVal,
          credits_completed: creditsVal
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail || 'Failed to update academic profile.');
      }

      setAcademicSuccess('Student Academic Profile saved successfully.');
      fetchAcademicProfile();
      if (refreshProfile) refreshProfile();
      setAcademicProfile(resData.student_profile);
      await refreshProfile();
    } catch (err) {
      setAcademicError(err instanceof Error ? err.message : 'Failed to update academic profile.');
    } finally {
      setAcademicSaving(false);
    }
  };

  const policyStatus = checkPasswordPolicy(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmNewPassword;

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (!policyStatus.isValid) {
      setError('Password does not meet the required security requirements.');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword, confirmNewPassword);
      setSuccessMsg('Password changed successfully. Please sign in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const policyChecks = [
    { label: 'At least 8 characters', met: policyStatus.hasMinLength },
    { label: 'One uppercase letter', met: policyStatus.hasUppercase },
    { label: 'One lowercase letter', met: policyStatus.hasLowercase },
    { label: 'One number', met: policyStatus.hasNumber },
    { label: 'One special character', met: policyStatus.hasSpecialChar },
  ];

  const userInfoItems = [
    { icon: Mail, label: 'Email', value: user?.email, mono: true },
    { icon: Hash, label: 'Role', value: user?.role?.toUpperCase(), accent: true },
    { icon: Hash, label: 'Roll Number', value: user?.rollNumber || 'N/A', mono: true },
    { icon: Building2, label: 'Department', value: user?.department || 'Computer Science & Engineering', mono: false },
  ];

  return (
    <div ref={containerRef} className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="gsap-animate-header flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Account & Security</h1>
          </div>
          <p className="text-sm text-slate-400 ml-10">
            Manage your credentials, session settings, and password security policy.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Student Academic Profile Section */}
        {user?.role === 'student' && (
          <div className="gsap-animate-card bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Student Academic Profile</span>
                    {academicProfile?.is_complete ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Complete
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Incomplete
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Enter your current academic information. CampusFlow AI uses these details when evaluating university workflow requirements.
                  </p>
                </div>
              </div>
            </div>

            {academicError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{academicError}</span>
              </div>
            )}

            {academicSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{academicSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveAcademicProfile} className="space-y-4">
              {/* Editable Identifiers Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--surface-deep)] p-4 rounded-xl border border-[var(--border-default)]">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">University Roll Number</label>
                  <input
                    type="text"
                    value={rollInput}
                    onChange={(e) => setRollInput(e.target.value)}
                    placeholder="e.g. AP24110012146"
                    className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono font-bold outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Admission / Batch Year</label>
                  <input
                    type="number"
                    value={admissionYearInput}
                    onChange={(e) => setAdmissionYearInput(e.target.value)}
                    placeholder="e.g. 2024"
                    min={2000}
                    max={2099}
                    className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-bold outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Semester Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Current Semester</label>
                    <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      [{academicProfile?.semester_source || 'NOT_PROVIDED'}]
                    </span>
                  </div>
                  <select
                    value={semesterInput}
                    onChange={(e) => setSemesterInput(e.target.value)}
                    className="w-full bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    <option value="">Not provided</option>
                    <option value="1">Semester 1 (1st Sem)</option>
                    <option value="2">Semester 2 (2nd Sem)</option>
                    <option value="3">Semester 3 (3rd Sem)</option>
                    <option value="4">Semester 4 (4th Sem)</option>
                    <option value="5">Semester 5 (5th Sem)</option>
                    <option value="6">Semester 6 (6th Sem)</option>
                    <option value="7">Semester 7 (7th Sem)</option>
                    <option value="8">Semester 8 (8th Sem)</option>
                  </select>
                </div>

                {/* CGPA Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Current CGPA (10.0 Scale)</label>
                    <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      [{academicProfile?.cgpa_source || 'NOT_PROVIDED'}]
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.0"
                    max="10.0"
                    value={cgpaInput}
                    onChange={(e) => setCgpaInput(e.target.value)}
                    placeholder="e.g. 8.75 (Leave empty if unprovided)"
                    className="w-full bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] outline-none focus:border-amber-500 transition"
                  />
                </div>

                {/* Active Backlogs */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Active Backlogs</label>
                    <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      [{academicProfile?.backlogs_source || 'NOT_PROVIDED'}]
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={backlogsInput}
                    onChange={(e) => setBacklogsInput(e.target.value)}
                    placeholder="e.g. 0 (Enter 0 if none, leave empty if unprovided)"
                    className="w-full bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] outline-none focus:border-amber-500 transition"
                  />
                </div>

                {/* Credits Completed */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Credits Completed</label>
                    <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      [{academicProfile?.credits_source || 'NOT_PROVIDED'}]
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={creditsInput}
                    onChange={(e) => setCreditsInput(e.target.value)}
                    placeholder="e.g. 110 (Leave empty if unprovided)"
                    className="w-full bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:[var(--text-muted)] outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={academicSaving}
                  className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all duration-200 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-slate-950" />
                  <span>{academicSaving ? 'Saving...' : 'Save Academic Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* User Info Card */}
        <div className="gsap-animate-card bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center gap-3 pb-4 border-b border-[var(--border-default)]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{user?.name || 'Authenticated User'}</h3>
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{user?.email}</p>
            </div>
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-300 uppercase tracking-wider">
              {user?.role || 'User'}
            </div>
          </div>

          {/* Info Items */}
          <div className="space-y-3">
            {userInfoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-2.5">
                <item.icon className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{item.label}</p>
                  <p className={`text-xs mt-0.5 truncate ${item.accent ? 'text-amber-400 font-semibold' : item.mono ? 'font-mono text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Logout */}
          <div className="pt-3 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out of Account
            </button>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="gsap-animate-card md:col-span-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-[var(--border-default)]">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Change Password</h2>
              <p className="text-[11px] text-[var(--text-muted)]">You will be redirected to sign in after a successful change.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-xl pl-9 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (e.g. Campus@123)"
                  className="w-full bg-[var(--surface-deep)] border border-[var(--border-default)] rounded-xl pl-9 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-amber)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Policy Checklist */}
            {newPassword.length > 0 && (
              <div className="p-3.5 bg-[var(--surface-deep)] rounded-xl border border-[var(--border-default)] space-y-2">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Password requirements</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {policyChecks.map((check) => (
                    <div key={check.label} className={`flex items-center gap-2 text-[11px] transition-colors ${check.met ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
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

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={`w-full bg-[var(--surface-deep)] border rounded-xl pl-9 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors ${
                    confirmNewPassword.length > 0
                      ? passwordsMatch
                        ? 'border-emerald-500/50 focus:border-emerald-500'
                        : 'border-red-500/50 focus:border-red-500'
                      : 'border-[var(--border-default)] focus:border-[var(--accent-amber)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer"
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmNewPassword.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> New passwords do not match.
                </p>
              )}
              {confirmNewPassword.length > 0 && passwordsMatch && (
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold shadow-lg shadow-amber-500/20 transition-all duration-200 cursor-pointer mt-2"
            >
              {loading ? 'Updating...' : 'Update Password →'}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
};
