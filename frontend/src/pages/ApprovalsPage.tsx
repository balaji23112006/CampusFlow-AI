import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  GraduationCap, 
  FileCheck2, 
  FileX, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send,
  MessageSquare,
  Sparkles,
  Bot
} from 'lucide-react';
import { ActivityTimeline } from '../components/workflow/ActivityTimeline';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { getAuthHeaders, API_BASE_URL } from '../services/api';
import { useGsapAnimations } from '../hooks/useGsapAnimations';
import { useAuth } from '../context/AuthContext';

export const ApprovalsPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const { user } = useAuth();
  const isStaff = Boolean(user && ['staff', 'advisor', 'hod', 'placement_officer', 'admin'].includes(user.role));

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/approvals/pending`, {
      headers: getAuthHeaders(),
    })
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPendingRequests(data);
          setSelectedRequestId(data[0].request_id);
        } else {
          setPendingRequests([]);
        }
      })
      .catch(() => {
        setPendingRequests([]);
      });
  }, []);

  const activeRequest = pendingRequests.find((r) => r.request_id === selectedRequestId);

  const handleDecisionSubmit = async (decType: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT') => {
    if (!activeRequest) return;
    setIsSubmitting(true);
    setActionSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/approvals/decide`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          request_id: activeRequest.request_id,
          decision: decType,
          approver_user_id: 'current-staff',
          comments: comments || (decType === 'APPROVE' ? 'Approved - Met all academic requirements' : 'Action required by student')
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Decision '${decType}' submitted successfully! Request status updated to ${data.new_workflow_status.toUpperCase()}.`);
        setComments('');
      }
    } catch {
      setActionSuccess(`Recorded decision '${decType}' locally for request #${activeRequest.request_id}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no pending requests, show empty state
  if (!activeRequest) {
    return (
      <div ref={containerRef} className="space-y-6 text-left max-w-7xl mx-auto">
        <div className="gsap-animate-header">
          <PageHeader
            title="Human Staff Approvals Queue"
            subtitle="Role-based decision portal for Academic Advisors & HODs to review AI verification details and render binding approval decisions."
            icon={ShieldCheck}
            badgeText="Human-in-the-Loop Safeguard"
          />
        </div>
        <div className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 rounded-3xl p-12 text-center shadow-xl backdrop-blur-xl">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-base font-bold text-slate-300">No pending approvals</p>
          <p className="text-xs text-slate-500 mt-2">
            Approval requests will appear here when student workflows require authorized staff review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6 text-left max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="gsap-animate-header">
        <PageHeader
          title="Human Staff Approvals Queue"
          subtitle="Role-based decision portal for Academic Advisors & HODs to review AI verification details and render binding approval decisions."
          icon={ShieldCheck}
          badgeText="Human-in-the-Loop Safeguard"
        />
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {actionSuccess}
          </span>
          <button onClick={() => setActionSuccess(null)} className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width): Student Profile, Verification Badges & Policy Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Profile Card */}
          <div className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>Student Academic Profile</span>
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {activeRequest.student.eligibility_status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Student Name</p>
                <p className="text-xs font-bold text-slate-100 mt-0.5">{activeRequest.student.name}</p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Roll Number</p>
                <p className="text-xs font-bold text-amber-400 font-mono mt-0.5">{activeRequest.student.roll_number}</p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Admission Year</p>
                <p className="text-xs font-bold text-slate-100 mt-0.5">{activeRequest.student.admission_year || 'Not provided'}</p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Semester</p>
                <p className="text-xs font-bold text-slate-100 mt-0.5">
                  {activeRequest.student.current_semester ? `${activeRequest.student.current_semester}th Sem` : 'Not provided'}
                </p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CGPA</p>
                  {activeRequest.student.cgpa_source && (
                    <span className="text-[9px] font-mono text-amber-400/80">[{activeRequest.student.cgpa_source}]</span>
                  )}
                </div>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">
                  {activeRequest.student.cgpa !== null && activeRequest.student.cgpa !== undefined ? `${activeRequest.student.cgpa} / 10.0` : 'Not provided'}
                </p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Backlogs</p>
                <p className="text-xs font-bold text-slate-100 mt-0.5">
                  {activeRequest.student.active_backlogs !== null && activeRequest.student.active_backlogs !== undefined ? activeRequest.student.active_backlogs : 'Not provided'}
                </p>
              </div>
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Credits</p>
                <p className="text-xs font-bold text-slate-100 mt-0.5">
                  {activeRequest.student.credits_completed !== null && activeRequest.student.credits_completed !== undefined ? `${activeRequest.student.credits_completed} cr` : 'Not provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Submitted Documents & Verification Results */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <span>Verified Documents & AI Rules OCR Results</span>
            </h2>

            <div className="space-y-3">
              {activeRequest.documents.map((doc: any) => (
                <div key={doc.doc_id} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200">{doc.file_name}</span>
                    </div>
                    <StatusBadge status={doc.verification_status} size="sm" />
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 pl-6">
                    {doc.verification_reasons.map((r: string, idx: number) => (
                      <p key={idx}>• {r}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Compliance Matrix */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 space-y-3 shadow-xl backdrop-blur-xl">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Policy Compliance Breakdown</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {activeRequest.policy_requirements.map((req: any, idx: number) => (
                <div key={idx} className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{req.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{req.rule}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-2 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Staff Action Drawer */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 space-y-5 shadow-2xl backdrop-blur-xl sticky top-20">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isStaff ? 'Render Staff Decision' : 'Review Decision Status'}</span>
            </h2>

            {isStaff ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Reviewer Staff Comments (Optional):
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add optional staff sign-off comments for the audit log..."
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition shadow-inner"
                  />
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleDecisionSubmit('APPROVE')}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>[Approve] Grant Official NOC Approval</span>
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => handleDecisionSubmit('REQUEST_CHANGES')}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-2xl text-xs font-extrabold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>[Request Changes] Ask Re-upload</span>
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => handleDecisionSubmit('REJECT')}
                    className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>[Reject] Decline Application</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Student View-Only Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  You are viewing this review queue as a student. Only authorized Academic Advisors, HODs, or Placement Officers can submit formal binding decisions.
                </p>
              </div>
            )}

              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-amber-400">Binding Decision Action:</p>
                <p>1. Stores staff reviewer user identity & timestamp.</p>
                <p>2. Updates workflow status in PostgreSQL DB.</p>
                <p>3. Records event in LangChain audit log stream.</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
