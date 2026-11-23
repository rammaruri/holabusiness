export type UserRole = 'admin' | 'pm' | 'member' | 'client';

export type ProjectType =
  | 'Website'
  | 'Web App'
  | 'Mobile App'
  | 'Digital Marketing';

export type SimpleProjectStatus = 'Active' | 'Inactive' | 'Completed';

export type ProjectStatus =
  // Simple founder statuses
  | 'Active'
  | 'Inactive'
  | 'Completed'
  // Pre-sales lifecycle
  | 'Lead/Discovery'
  | 'Meeting Scheduled'
  | 'Proposal Drafted'
  | 'Proposal Review'
  | 'Draft / On Hold' // Denied, Remainder, Stalled
  // Active delivery lifecycle
  | 'Intake'
  | 'Scoping'
  | 'In Execution'
  | 'QA & Handover'
  | 'Completed/Archived'
  | 'Maintenance';

export function getProjectSimpleStatus(project: {
  status: ProjectStatus | string;
  is_archived?: boolean;
}): SimpleProjectStatus {
  if (project.status === 'Active') return 'Active';
  if (project.status === 'Inactive') return 'Inactive';
  if (project.status === 'Completed') return 'Completed';

  if (project.is_archived || project.status === 'Completed/Archived') {
    return 'Completed';
  }
  if (project.status === 'Draft / On Hold') {
    return 'Inactive';
  }
  return 'Active';
}

export type PipelineStageCategory =
  | 'presales' // Leads, Meetings, Proposals
  | 'active'   // Execution, QA, Intake, Scoping
  | 'drafts'   // Denied, Stalled, Remainder
  | 'archived';// Completed & Archived, Maintenance

export type AssetFolderCategory =
  | 'Brand Assets & Logos'
  | 'Raw Images & Media'
  | 'Content & Copy'
  | 'Design Files / Wireframes'
  | 'Contracts & Docs';

export type TaskStatus =
  | 'Backlog'
  | 'To Do'
  | 'In Progress'
  | 'Internal Review'
  | 'Done';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type MeetingOutcome =
  | 'scheduled'
  | 'approved'
  | 'denied'
  | 'rescheduled'
  | 'remainder';

export type ProposalOutcome =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'denied'
  | 'rescheduled'
  | 'remainder';

export type ActivityActionType =
  | 'PROJECT_CREATED'
  | 'PROJECT_STATUS_CHANGED'
  | 'PROJECT_ARCHIVED'
  | 'PROJECT_UNLOCKED'
  | 'PROJECT_REOPENED_FROM_DRAFT'
  | 'PROJECT_DELETED'
  | 'CONTACT_ADDED'
  | 'CONTACT_UPDATED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_OUTCOME_RECORDED'
  | 'PROPOSAL_GENERATED'
  | 'PROPOSAL_OUTCOME_RECORDED'
  | 'SCOPE_UPDATED'
  | 'ASSET_UPLOADED'
  | 'ASSET_UPDATED'
  | 'ASSET_DELETED'
  | 'ASSET_APPROVED'
  | 'CREDENTIAL_ADDED'
  | 'CREDENTIAL_REVEALED'
  | 'CREDENTIAL_UPDATED'
  | 'CREDENTIAL_DELETED'
  | 'TASK_CREATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_DEADLINE_CHANGED'
  | 'DELIVERABLE_SUBMITTED'
  | 'CLIENT_SIGN_OFF'
  | 'DOCUMENT_UPLOADED'
  | 'CLIENT_TALK_LOGGED'
  | 'CLIENT_TALK_UPDATED'
  | 'CLIENT_TALK_DELETED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DISABLED'
  | 'USER_ACTIVATED'
  | 'USER_DELETED';

export type ClientTalkType = 'Call' | 'WhatsApp' | 'Email' | 'Meeting';

export interface ClientTalkRecord {
  id: string;
  project_id: string;
  type: ClientTalkType;
  date: string; // YYYY-MM-DDTHH:mm or ISO string
  notes: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateClientTalkInput {
  project_id: string;
  type: ClientTalkType;
  date: string;
  notes: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_main_admin?: boolean;
  is_disabled?: boolean;
  password?: string;
  avatar_url?: string | null;
  title?: string | null;
  client_company?: string | null;
  created_at: string;
}

export interface ProjectContact {
  id: string;
  project_id?: string | null; // Optional if unlinked standalone business lead
  company_name?: string | null; // For standalone business contact
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_primary?: boolean;
  can_access_portal?: boolean;
  created_at: string;
}

export interface ProjectMeeting {
  id: string;
  project_id: string;
  title: string;
  scheduled_at: string;
  is_general_session?: boolean; // General insights / check-in session (no traditional 4 outcome gates)
  pain_points?: string;
  solution_notes?: string;
  expectations_goals?: string;
  general_notes?: string;
  outcome: MeetingOutcome;
  outcome_at?: string;
  outcome_note?: string;
  decision_edited_by?: string;
  decision_edited_at?: string;
  next_action_at?: string;
  created_by: string;
  created_at: string;
}

export interface ProposalPricingItem {
  id: string;
  description: string;
  category: 'Development' | 'Subscription / Recurring' | 'Design' | 'Infrastructure' | 'Marketing' | 'Custom';
  cost: number;
  is_recurring?: boolean;
  billing_cycle?: 'one-time' | 'monthly' | 'yearly';
}

export interface ProjectProposal {
  id: string;
  project_id: string;
  title: string;
  solution_overview: string;
  workflow_team_schedule: string; // Weekly/monthly timeline & delivery expectations
  expected_deliverables_results: string;
  long_term_support_services: string;
  pricing_items: ProposalPricingItem[];
  currency: string;
  total_one_time_cost: number;
  total_recurring_cost: number;
  status: ProposalOutcome;
  outcome_at?: string;
  outcome_note?: string;
  next_review_meeting_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  title: string;
  doc_type: 'Proposal' | 'Contract' | 'SOW' | 'NDA' | 'Technical Spec' | 'Other';
  file_name: string;
  file_url: string;
  file_size?: number;
  is_mandatory: boolean;
  is_signed_off?: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  client_name: string;
  project_type: ProjectType;
  status: ProjectStatus;
  start_date?: string | null;
  target_end_date?: string | null;
  actual_end_date?: string | null;
  is_archived: boolean;
  // Pre-sales draft state tracking
  draft_reason?: string | null;
  draft_source_stage?: 'meeting' | 'proposal' | 'manual';
  remainder_next_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  assigned_role: UserRole;
  created_at: string;
}

export interface DeliverableItem {
  id: string;
  title: string;
  completed: boolean;
  client_signed_off?: boolean;
}

export interface ProjectRequirement {
  id: string;
  project_id: string;
  scope_summary: string;
  deliverables_json: DeliverableItem[];
  out_of_scope_notes: string;
  updated_by?: string | null;
  updated_at: string;
}

export type AssetDocType =
  | 'Image'
  | 'Document'
  | 'Design / Figma'
  | 'Video'
  | 'Spreadsheet'
  | 'Other';

export interface ProjectAsset {
  id: string;
  project_id: string;
  name: string;
  doc_type: AssetDocType;
  drive_link: string;
  notes?: string | null;
  folder_category?: AssetFolderCategory;
  file_name?: string;
  file_url?: string;
  file_size?: number;
  version_tag?: string;
  client_approved?: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at?: string;
}

export interface AddAssetInput {
  project_id: string;
  name: string;
  doc_type: AssetDocType;
  drive_link: string;
  notes?: string | null;
}

export interface UpdateAssetInput {
  asset_id: string;
  name: string;
  doc_type: AssetDocType;
  drive_link: string;
  notes?: string | null;
}

export type CredentialCategory =
  | 'Domain'
  | 'Hosting'
  | 'Cloud'
  | 'Email'
  | 'Social Media'
  | 'Payment Gateway'
  | 'Other';

export interface ProjectCredential {
  id: string;
  project_id: string;
  service_name: string;
  category?: CredentialCategory | null;
  login_url?: string | null;
  username: string;
  encrypted_secret: string;
  iv: string;
  auth_tag: string;
  notes?: string | null;
  updated_by: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  assignee_id?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date?: string | null;
  due_date: string;
  completed_at?: string | null;
  is_delayed: boolean;
  blocked_by_task_id?: string | null;
  linked_deliverable?: string | null;
  deliverable_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  action_type: ActivityActionType;
  entity_type: 'project' | 'requirement' | 'asset' | 'credential' | 'task' | 'meeting' | 'proposal' | 'contact' | 'document' | 'renewal';
  entity_id?: string | null;
  change_summary: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface RenewalItem {
  id: string;
  project_id: string;
  title: string;
  vendor?: string;
  amount: number;
  renewal_date: string; // YYYY-MM-DD
  remind_days: number;  // Default 7
  renewed: boolean;
  renewed_on?: string;
  renewed_amount_paid?: number;
  renewed_notes?: string;
  created_at: string;
  updated_at?: string;
}

export type RenewalStatusType = 'Overdue' | 'Due Today' | 'Due Soon' | 'Upcoming' | 'Active' | 'Renewed';

export interface RenewalStatusInfo {
  label: RenewalStatusType;
  diff: number;
}

export function getRenewalStatus(dateStr: string, remindDays = 7): RenewalStatusInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { label: 'Overdue', diff };
  if (diff === 0) return { label: 'Due Today', diff };
  if (diff <= remindDays) return { label: 'Due Soon', diff };
  if (diff <= 30) return { label: 'Upcoming', diff };
  return { label: 'Active', diff };
}

export interface RolePermissions {
  canCreateProject: boolean;
  canEditScope: boolean;
  canManageTasks: boolean;
  canUpdateTaskStatus: boolean;
  canUploadAssets: boolean;
  canViewCredentials: boolean;
  canManageCredentials: boolean;
  canRevealCredentials: boolean;
  canViewInternalDelays: boolean;
  canViewAuditLogs: boolean;
  canToggleArchive: boolean;
  canManageUsers: boolean;
  canSubmitClientSignOff: boolean;
  canManageMeetingsAndProposals: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Founder & Admin',
  pm: 'Project Manager',
  member: 'Employee',
  client: 'Client Portal',
};
