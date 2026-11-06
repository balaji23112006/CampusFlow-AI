export type UserRole = 'student' | 'advisor' | 'hod' | 'placement_officer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rollNumber?: string;
  department?: string;
  avatarUrl?: string;
}

export type RequestStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'action_required';

export type StepType = 'automated_check' | 'manual_approval' | 'document_generation';

export interface WorkflowStepItem {
  id: string;
  stepNumber: number;
  name: string;
  type: StepType;
  requiredRole?: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  completedAt?: string;
  assigneeName?: string;
}

export interface DocumentRequirementItem {
  id: string;
  name: string;
  documentType: string;
  isMandatory: boolean;
  uploadedDocumentId?: string;
  fileName?: string;
  status: 'uploaded' | 'pending' | 'verified';
}

export interface ApprovalItem {
  id: string;
  stepName: string;
  approverRole: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected' | 'requested_changes';
  comments?: string;
  decidedAt?: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorType: 'student' | 'approver' | 'agent' | 'system';
  action: string;
  description: string;
}

export interface WorkflowItem {
  id: string;
  code: string;
  title: string;
  description: string;
  studentName: string;
  rollNumber: string;
  department: string;
  status: RequestStatus;
  progressPercent: number;
  currentStepNumber: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  internshipRole?: string;
  stipend?: string;
  duration?: string;
  steps: WorkflowStepItem[];
  documentRequirements: DocumentRequirementItem[];
  approvals: ApprovalItem[];
  activityLogs: ActivityLogItem[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  attachedWorkflowId?: string;
}
