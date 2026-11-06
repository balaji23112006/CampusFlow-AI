import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  UserCheck, 
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Upload,
  GitMerge,
  Sparkles
} from 'lucide-react';
import { mockWorkflows } from '../data/mockData';
import { ActivityTimeline } from '../components/workflow/ActivityTimeline';
import { CampusFlowCanvas } from '../components/3d/CampusFlowCanvas';
import { StatusBadge } from '../components/common/StatusBadge';
import { useGsapAnimations } from '../hooks/useGsapAnimations';

export const WorkflowDetailPage: React.FC = () => {
  const containerRef = useGsapAnimations();
  const { id } = useParams<{ id: string }>();
  const workflow = mockWorkflows.find((w) => w.id === id) || mockWorkflows[0];

  return (
    <div ref={containerRef} className="space-y-8 text-left max-w-7xl mx-auto">
      {/* Back Link */}
      <div>
        <Link to="/workflows" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-400 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Workflows Pipeline
        </Link>
      </div>

      {/* Header Card with 3D Canvas */}
      <div className="gsap-animate-header bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-950 text-amber-400 px-3 py-1 rounded-md border border-amber-500/20">
                {workflow.code}
              </span>
              <span className="text-xs text-slate-400 font-mono">Request ID: #{workflow.id}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{workflow.title}</h1>
            <p className="text-slate-400 text-xs font-medium max-w-2xl">{workflow.description}</p>
          </div>

          {/* Current Status Badge & 3D Agent Widget */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <StatusBadge status={workflow.status} size="lg" />
            <CampusFlowCanvas status="WAITING_APPROVAL" showNodes={false} className="h-32 w-60 hidden sm:block" />
          </div>
        </div>

        {/* Workflow Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-300">Overall Workflow Execution Progress</span>
            <span className="text-amber-400 font-mono text-xs font-bold">{workflow.progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${workflow.progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Metadata Highlights */}
        {workflow.companyName && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs">
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Employer Organization</div>
                <div className="text-slate-200 font-bold">{workflow.companyName}</div>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Duration Period</div>
                <div className="text-slate-200 font-bold">{workflow.duration}</div>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400">Stipend Remuneration</div>
                <div className="text-slate-200 font-bold">{workflow.stipend}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Execution Timeline & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width): Sequential Execution Steps */}
        <div className="lg:col-span-2 space-y-6">
          <div className="gsap-animate-card bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl text-left space-y-6">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-amber-400" /> Sequential Execution Steps
            </h2>

            <div className="space-y-6">
              {workflow.steps.map((step) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';

                return (
                  <div key={step.id} className="relative flex gap-4">
                    {/* Status Circle & Connecting Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                            : isCurrent
                            ? 'bg-amber-500 text-slate-950 border-2 border-amber-400 shadow-lg shadow-amber-500/30'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.stepNumber}
                      </div>
                      {step.stepNumber < workflow.totalSteps && (
                        <div
                          className={`w-0.5 flex-1 my-1 ${
                            isCompleted ? 'bg-emerald-500/50' : 'bg-slate-800'
                          }`}
                        ></div>
                      )}
                    </div>

                    {/* Step Card Content */}
                    <div
                      className={`flex-1 p-4.5 rounded-2xl border transition ${
                        isCurrent
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-md'
                          : 'bg-slate-950/80 border-slate-800/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-white">{step.name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                          {step.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span>Assignee: <strong className="text-slate-200 font-semibold">{step.assigneeName || step.requiredRole || 'System Agent'}</strong></span>
                        {step.completedAt && (
                          <span className="text-[11px] text-emerald-400 font-semibold">
                            Completed on {new Date(step.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Document Verification Vault Section */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" /> Attached Verification Documents
              </h2>
              <span className="text-xs font-semibold text-slate-400">2 of 3 Uploaded & Verified</span>
            </div>

            <div className="space-y-3">
              {workflow.documentRequirements.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        {doc.name}
                        {doc.isMandatory && <span className="text-[10px] text-rose-400 font-semibold">*Required</span>}
                      </div>
                      <div className="text-slate-400 text-[11px]">{doc.fileName || 'No file attached'}</div>
                    </div>
                  </div>

                  <div>
                    {doc.status === 'verified' && (
                      <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-bold text-[11px]">
                        Verified Valid
                      </span>
                    )}
                    {doc.status === 'uploaded' && (
                      <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-bold text-[11px]">
                        Uploaded
                      </span>
                    )}
                    {doc.status === 'pending' && (
                      <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer">
                        <Upload className="w-3.5 h-3.5" /> Upload PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Staff Approvals & Activity Stream */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl text-left space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-400" /> Human Staff Decisions
            </h2>

            <div className="space-y-3">
              {workflow.approvals.map((app) => (
                <div key={app.id} className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-200">{app.stepName}</span>
                    {app.status === 'approved' && (
                      <span className="text-emerald-400 font-extrabold">APPROVED</span>
                    )}
                    {app.status === 'pending' && (
                      <span className="text-amber-400 font-extrabold">PENDING SIGN-OFF</span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px]">Approver: {app.approverName} ({app.approverRole})</p>
                  {app.comments && (
                    <p className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-300 italic text-[11px]">
                      "{app.comments}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <ActivityTimeline
            traceId="trace-req-noc-8841"
            events={workflow.activityLogs.map((log) => ({
              id: log.id,
              timestamp: log.timestamp,
              actor_type: log.actor === 'Agent' ? 'AGENT' : (log.actor === 'Advisor' || log.actor === 'HOD' ? 'STAFF' : 'STUDENT'),
              actor_id: log.actor,
              action: log.action.toUpperCase().replace(/\s+/g, '_'),
              workflow_id: workflow.id,
              status: 'SUCCESS',
              result_summary: { description: log.description }
            }))}
          />
        </div>
      </div>
    </div>
  );
};
