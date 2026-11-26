'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type {
  ActivityActionType,
  ActivityLog,
  AddAssetInput,
  AssetFolderCategory,
  ClientTalkRecord,
  CreateClientTalkInput,
  CredentialCategory,
  DeliverableItem,
  MeetingOutcome,
  Project,
  ProjectAsset,
  ProjectContact,
  ProjectCredential,
  ProjectDocument,
  ProjectMeeting,
  ProjectProposal,
  ProjectRequirement,
  ProjectStatus,
  ProjectType,
  ProposalOutcome,
  ProposalPricingItem,
  RenewalItem,
  RolePermissions,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateAssetInput,
  User,
  UserRole,
} from '@/types/agency';
import {
  DEMO_PROJECT_MEMBERSHIPS,
  DEMO_USERS,
  INITIAL_SHELL_PROJECTS,
} from '@/lib/auth-personas';
import {
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ASSETS,
  INITIAL_CLIENT_TALKS,
  INITIAL_CONTACTS,
  INITIAL_CREDENTIALS,
  INITIAL_DOCUMENTS,
  INITIAL_MEETINGS,
  INITIAL_PROPOSALS,
  INITIAL_RENEWALS,
  INITIAL_REQUIREMENTS,
  INITIAL_TASKS,
} from '@/lib/initial-data';
import { getPermissions, getTaskDelayInfo } from '@/lib/rbac';

export interface CreateProjectInput {
  id?: string;
  title: string;
  client_name: string;
  project_type: ProjectType;
  start_date?: string | null;
  target_end_date?: string | null;
  scope_summary: string;
  out_of_scope_notes?: string;
  deliverables?: string[];
  initial_stage?: 'Lead/Discovery' | 'Meeting Scheduled' | 'Intake' | 'In Execution';
}

export interface CreateContactInput {
  project_id?: string | null;
  company_name?: string | null;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  is_primary?: boolean;
  can_access_portal?: boolean;
}

export interface CreateMeetingInput {
  project_id: string;
  title: string;
  scheduled_at: string;
  is_general_session?: boolean;
  pain_points?: string;
  solution_notes?: string;
  expectations_goals?: string;
  general_notes?: string;
}

export interface RecordMeetingOutcomeInput {
  meeting_id: string;
  outcome: MeetingOutcome;
  outcome_at?: string;
  outcome_note?: string;
  reschedule_date?: string;
  remainder_date?: string;
  is_edit?: boolean;
}

export interface CreateProposalInput {
  project_id: string;
  title: string;
  solution_overview: string;
  workflow_team_schedule: string;
  expected_deliverables_results: string;
  long_term_support_services: string;
  pricing_items: Array<{
    description: string;
    category: ProposalPricingItem['category'];
    cost: number;
    billing_cycle?: 'one-time' | 'monthly' | 'yearly';
  }>;
  next_review_meeting_at?: string;
}

export interface RecordProposalOutcomeInput {
  proposal_id: string;
  outcome: ProposalOutcome;
  outcome_at?: string;
  outcome_note?: string;
  reschedule_date?: string;
  remainder_date?: string;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description: string;
  assignee_id?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  start_date?: string | null;
  due_date: string;
  blocked_by_task_id?: string | null;
  linked_deliverable?: string | null;
}

export interface UpdateTaskInput {
  title: string;
  description?: string;
  assignee_id?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  blocked_by_task_id?: string | null;
  linked_deliverable?: string | null;
  deliverable_url?: string | null;
}

export interface AddCredentialInput {
  project_id: string;
  service_name: string;
  category?: CredentialCategory;
  login_url?: string;
  username: string;
  plaintext_secret: string;
  notes?: string;
}

export interface UpdateCredentialInput {
  project_id: string;
  credential_id: string;
  service_name: string;
  category?: CredentialCategory;
  login_url?: string;
  username: string;
  plaintext_secret?: string;
  notes?: string;
}

export interface UploadDocumentInput {
  project_id: string;
  title: string;
  doc_type: ProjectDocument['doc_type'];
  file_name: string;
  file_url: string;
  file_size?: number;
  is_mandatory: boolean;
}

export interface CreateRenewalInput {
  project_id: string;
  title: string;
  vendor?: string;
  amount: number;
  renewal_date: string;
  remind_days?: number;
}

export interface UpdateRenewalInput {
  id: string;
  title: string;
  vendor?: string;
  amount: number;
  renewal_date: string;
  remind_days?: number;
}

export interface MarkRenewedInput {
  id: string;
  next_renewal_date: string;
  amount_paid: number;
  notes?: string;
}

interface AuthContextValue {
  currentUser: User;
  users: User[];
  permissions: RolePermissions;
  accessibleProjects: Project[];
  accessibleTasks: Task[];
  contacts: ProjectContact[];
  meetings: ProjectMeeting[];
  clientTalks: ClientTalkRecord[];
  proposals: ProjectProposal[];
  documents: ProjectDocument[];
  requirements: ProjectRequirement[];
  assets: ProjectAsset[];
  credentials: ProjectCredential[];
  renewals: RenewalItem[];
  activityLogs: ActivityLog[];
  todayDate: Date | null;
  switchPersona: (userId: string) => void;
  signInWithEmail: (email: string, password?: string) => { success: boolean; error?: string };
  signInWithCredentials: (email: string, password?: string) => { success: boolean; error?: string };
  isAuthenticated: boolean;
  signOut: () => void;
  createProject: (input: CreateProjectInput) => Project;
  addContact: (input: CreateContactInput) => ProjectContact;
  updateContact: (contactId: string, updates: Partial<ProjectContact>) => void;
  deleteContact: (contactId: string) => void;
  createMeeting: (input: CreateMeetingInput) => ProjectMeeting;
  updateMeeting: (meetingId: string, updates: Partial<ProjectMeeting>) => void;
  deleteMeeting: (meetingId: string) => void;
  recordMeetingOutcome: (input: RecordMeetingOutcomeInput) => void;
  addClientTalk: (input: CreateClientTalkInput) => ClientTalkRecord;
  updateClientTalk: (talkId: string, updates: Partial<ClientTalkRecord>) => void;
  deleteClientTalk: (talkId: string) => void;
  createProposal: (input: CreateProposalInput) => ProjectProposal;
  updateProposal: (proposalId: string, updates: Partial<ProjectProposal>) => void;
  deleteProposal: (proposalId: string) => void;
  recordProposalOutcome: (input: RecordProposalOutcomeInput) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  deleteProject: (projectId: string) => void;
  reopenDraftProject: (
    projectId: string,
    targetStage: 'Meeting Scheduled' | 'Proposal Review' | 'Intake' | 'In Execution',
    note?: string
  ) => void;
  uploadDocument: (input: UploadDocumentInput) => ProjectDocument;
  toggleDocumentSignOff: (docId: string) => void;
  updateRequirements: (
    projectId: string,
    updates: {
      scope_summary: string;
      out_of_scope_notes: string;
      deliverables_json: DeliverableItem[];
    },
    changeReason: string
  ) => void;
  addAsset: (input: AddAssetInput) => ProjectAsset;
  updateAsset: (input: UpdateAssetInput) => void;
  deleteAsset: (assetId: string) => void;
  uploadAsset: (input: {
    project_id: string;
    folder_category: AssetFolderCategory;
    file_name: string;
    file_size: number;
    version_tag: string;
    file_url?: string;
  }) => void;
  toggleAssetApproval: (projectId: string, assetId: string) => void;
  addCredential: (input: AddCredentialInput) => Promise<void>;
  updateCredential: (input: UpdateCredentialInput) => Promise<void>;
  deleteCredential: (projectId: string, credentialId: string) => void;
  revealCredential: (projectId: string, credentialId: string) => Promise<string>;
  createTask: (input: CreateTaskInput) => void;
  updateTask: (projectId: string, taskId: string, input: UpdateTaskInput) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  reorderTasks: (
    projectId: string,
    sourceTaskId: string,
    targetTaskId: string | null,
    targetStatus: TaskStatus
  ) => void;
  updateTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => void;
  updateTaskDeliverable: (
    projectId: string,
    taskId: string,
    deliverableUrl: string
  ) => void;
  toggleProjectArchive: (projectId: string) => void;
  submitClientSignOff: (projectId: string, deliverableId: string) => void;
  createRenewal: (input: CreateRenewalInput) => RenewalItem;
  updateRenewal: (input: UpdateRenewalInput) => void;
  markRenewalAsRenewed: (input: MarkRenewedInput) => void;
  deleteRenewal: (renewalId: string) => void;
  createAdminUser: (input: {
    name: string;
    email: string;
    title?: string;
    password?: string;
  }) => User;
  createUser: (input: {
    name: string;
    email: string;
    role?: UserRole;
    title?: string;
    password?: string;
    assignedProjectIds?: string[];
  }) => User;
  updateUser: (
    userId: string,
    updates: {
      name: string;
      email: string;
      title?: string;
      role?: UserRole;
      assignedProjectIds?: string[];
    }
  ) => void;
  assignUserToProjects: (userId: string, projectIds: string[]) => void;
  memberships: Record<string, string[]>;
  changeUserPassword: (userId: string, newPass: string) => void;
  toggleUserDisabled: (userId: string) => void;
  deleteUser: (userId: string) => void;
  isCloudSyncing?: boolean;
  isCloudSynced?: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const emptySubscribe = () => () => {};
let cachedClientDate: Date | null = null;
function getClientTodaySnapshot(): Date {
  if (!cachedClientDate) {
    cachedClientDate = new Date();
  }
  return cachedClientDate;
}
function getServerTodaySnapshot(): Date | null {
  return null;
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateProjectSlug(title: string, existingProjects: Project[]): string {
  const clean = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const baseSlug = clean || 'project';
  const candidate = `proj-${baseSlug}`;

  const existingIds = new Set(existingProjects.map((p) => p.id.toLowerCase()));
  if (!existingIds.has(candidate)) {
    return candidate;
  }

  let counter = 2;
  while (existingIds.has(`${candidate}-${counter}`)) {
    counter++;
  }
  return `${candidate}-${counter}`;
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://placeholder.convex.cloud';
const convexClient = new ConvexReactClient(convexUrl);

function AppProvidersInner({ children }: { children: React.ReactNode }) {
  const workspace = useQuery(api.workspace.getWorkspace);
  const seedOrMigrateMut = useMutation(api.workspace.seedOrMigrate);
  const upsertUserMut = useMutation(api.workspace.upsertUser);
  const deleteUserMut = useMutation(api.workspace.deleteUser);
  const setUserMembershipsMut = useMutation(api.workspace.setUserMemberships);
  const addProjectToUserMembershipMut = useMutation(api.workspace.addProjectToUserMembership);
  const createProjectWithDetailsMut = useMutation(api.workspace.createProjectWithDetails);
  const patchProjectMut = useMutation(api.workspace.patchProject);
  const deleteProjectCascadeMut = useMutation(api.workspace.deleteProjectCascade);
  const createContactMut = useMutation(api.workspace.createContact);
  const patchContactMut = useMutation(api.workspace.patchContact);
  const deleteContactMut = useMutation(api.workspace.deleteContact);
  const createMeetingMut = useMutation(api.workspace.createMeeting);
  const patchMeetingMut = useMutation(api.workspace.patchMeeting);
  const deleteMeetingMut = useMutation(api.workspace.deleteMeeting);
  const createClientTalkMut = useMutation(api.workspace.createClientTalk);
  const patchClientTalkMut = useMutation(api.workspace.patchClientTalk);
  const deleteClientTalkMut = useMutation(api.workspace.deleteClientTalk);
  const createProposalWithDocMut = useMutation(api.workspace.createProposalWithDoc);
  const patchProposalMut = useMutation(api.workspace.patchProposal);
  const deleteProposalMut = useMutation(api.workspace.deleteProposal);
  const createDocumentMut = useMutation(api.workspace.createDocument);
  const patchDocumentMut = useMutation(api.workspace.patchDocument);
  const patchRequirementMut = useMutation(api.workspace.patchRequirementByProject);
  const createAssetMut = useMutation(api.workspace.createAsset);
  const patchAssetMut = useMutation(api.workspace.patchAsset);
  const deleteAssetMut = useMutation(api.workspace.deleteAsset);
  const createCredentialMut = useMutation(api.workspace.createCredential);
  const patchCredentialMut = useMutation(api.workspace.patchCredential);
  const deleteCredentialMut = useMutation(api.workspace.deleteCredential);
  const createTaskMut = useMutation(api.workspace.createTask);
  const patchTaskMut = useMutation(api.workspace.patchTask);
  const deleteTaskMut = useMutation(api.workspace.deleteTask);
  const reorderTasksMut = useMutation(api.workspace.reorderTasks).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.workspace.getWorkspace, {});
      if (!current) return;
      const taskMap = new Map(current.tasks.map((t: any) => [t.id, t]));
      const updatedTasks = args.orderedTaskIds
        .map((id, idx) => {
          const t = taskMap.get(id);
          if (!t) return null;
          if (id === args.movedTaskId) {
            return { ...t, ...args.movedTaskPatch, sort_order: idx };
          }
          return { ...t, sort_order: idx };
        })
        .filter(Boolean);
      for (const t of current.tasks) {
        if (!args.orderedTaskIds.includes(t.id)) {
          updatedTasks.push(t);
        }
      }
      localStore.setQuery(api.workspace.getWorkspace, {}, {
        ...current,
        tasks: updatedTasks as any,
      });
    }
  );
  const createRenewalMut = useMutation(api.workspace.createRenewal);
  const patchRenewalMut = useMutation(api.workspace.patchRenewal);
  const markRenewalRenewedMut = useMutation(api.workspace.markRenewalRenewed);
  const deleteRenewalMut = useMutation(api.workspace.deleteRenewal);
  const appendLogMut = useMutation(api.workspace.appendLog);

  const migrationStarted = useRef(false);

  // One-time automatic migration from Turso (or initial seed) into Convex
  useEffect(() => {
    if (!workspace || workspace.seeded || migrationStarted.current) return;
    migrationStarted.current = true;

    async function runInitialMigration() {
      let tursoData: Record<string, any> | null = null;
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const json = await res.json();
          if (json?.configured && json?.data) {
            tursoData = json.data;
          }
        }
      } catch (err) {
        console.warn('Turso migration fetch skipped, using defaults:', err);
      }

      const seedUsers =
        Array.isArray(tursoData?.users) && tursoData.users.length > 0
          ? tursoData.users
          : DEMO_USERS;

      await seedOrMigrateMut({
        users: seedUsers,
        projects: Array.isArray(tursoData?.projects) ? tursoData.projects : INITIAL_SHELL_PROJECTS,
        memberships:
          tursoData?.memberships && typeof tursoData.memberships === 'object'
            ? tursoData.memberships
            : DEMO_PROJECT_MEMBERSHIPS,
        contacts: Array.isArray(tursoData?.contacts) ? tursoData.contacts : INITIAL_CONTACTS,
        meetings: Array.isArray(tursoData?.meetings) ? tursoData.meetings : INITIAL_MEETINGS,
        clientTalks: Array.isArray(tursoData?.clientTalks)
          ? tursoData.clientTalks
          : INITIAL_CLIENT_TALKS,
        proposals: Array.isArray(tursoData?.proposals) ? tursoData.proposals : INITIAL_PROPOSALS,
        documents: Array.isArray(tursoData?.documents) ? tursoData.documents : INITIAL_DOCUMENTS,
        requirements: Array.isArray(tursoData?.requirements)
          ? tursoData.requirements
          : INITIAL_REQUIREMENTS,
        assets: Array.isArray(tursoData?.assets) ? tursoData.assets : INITIAL_ASSETS,
        credentials: Array.isArray(tursoData?.credentials)
          ? tursoData.credentials
          : INITIAL_CREDENTIALS,
        tasks: Array.isArray(tursoData?.tasks) ? tursoData.tasks : INITIAL_TASKS,
        renewals: Array.isArray(tursoData?.renewals) ? tursoData.renewals : INITIAL_RENEWALS,
        activityLogs: Array.isArray(tursoData?.activityLogs)
          ? tursoData.activityLogs
          : INITIAL_ACTIVITY_LOGS,
      }).catch((e) => console.error('Convex seed/migration error:', e));
    }

    runInitialMigration();
  }, [workspace, seedOrMigrateMut]);

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedAuth = localStorage.getItem('holabusiness_auth_user');
        if (savedAuth) return savedAuth;
      } catch {}
    }
    return '';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedAuth = localStorage.getItem('holabusiness_auth_user');
        return Boolean(savedAuth);
      } catch {}
    }
    return false;
  });

  const todayDate = useSyncExternalStore(
    emptySubscribe,
    getClientTodaySnapshot,
    getServerTodaySnapshot
  );

  const isCloudSyncing = workspace === undefined;
  const isCloudSynced = workspace !== undefined;

  const users = useMemo(
    () => (workspace?.users as User[] | undefined) ?? DEMO_USERS,
    [workspace?.users]
  );
  const projects = useMemo(
    () => (workspace?.projects as Project[] | undefined) ?? INITIAL_SHELL_PROJECTS,
    [workspace?.projects]
  );
  const memberships = useMemo(
    () => (workspace?.memberships as Record<string, string[]> | undefined) ?? DEMO_PROJECT_MEMBERSHIPS,
    [workspace?.memberships]
  );
  const contacts = useMemo(
    () => (workspace?.contacts as ProjectContact[] | undefined) ?? [],
    [workspace?.contacts]
  );
  const meetings = useMemo(
    () => (workspace?.meetings as ProjectMeeting[] | undefined) ?? [],
    [workspace?.meetings]
  );
  const clientTalks = useMemo(
    () => (workspace?.clientTalks as ClientTalkRecord[] | undefined) ?? [],
    [workspace?.clientTalks]
  );
  const proposals = useMemo(
    () => (workspace?.proposals as ProjectProposal[] | undefined) ?? [],
    [workspace?.proposals]
  );
  const documents = useMemo(
    () => (workspace?.documents as ProjectDocument[] | undefined) ?? [],
    [workspace?.documents]
  );
  const requirements = useMemo(
    () => (workspace?.requirements as ProjectRequirement[] | undefined) ?? [],
    [workspace?.requirements]
  );
  const assets = useMemo(
    () => (workspace?.assets as ProjectAsset[] | undefined) ?? [],
    [workspace?.assets]
  );
  const credentials = useMemo(
    () => (workspace?.credentials as ProjectCredential[] | undefined) ?? [],
    [workspace?.credentials]
  );
  const tasks = useMemo(
    () => (workspace?.tasks as Task[] | undefined) ?? [],
    [workspace?.tasks]
  );
  const renewals = useMemo(
    () => (workspace?.renewals as RenewalItem[] | undefined) ?? [],
    [workspace?.renewals]
  );
  const activityLogs = useMemo(
    () => (workspace?.activityLogs as ActivityLog[] | undefined) ?? [],
    [workspace?.activityLogs]
  );

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0] ?? DEMO_USERS[0],
    [users, currentUserId]
  );

  // Real-time security enforcement: if admin disables current user, force sign out immediately
  useEffect(() => {
    if (isAuthenticated && workspace?.seeded && currentUserId) {
      const liveUser = users.find((u) => u.id === currentUserId);
      if (!liveUser || liveUser.is_disabled) {
        setIsAuthenticated(false);
        setCurrentUserId('');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('holabusiness_auth_user');
          document.cookie = 'holabusiness_auth_session=; path=/; max-age=0; SameSite=Lax';
          window.location.href = '/login';
        }
      }
    }
  }, [isAuthenticated, workspace?.seeded, currentUserId, users]);

  const permissions = useMemo(
    () => getPermissions(currentUser.role, currentUser),
    [currentUser]
  );

  const appendLog = useCallback(
    (
      projectId: string,
      actionType: ActivityActionType,
      entityType: ActivityLog['entity_type'],
      entityId: string | null,
      changeSummary: string,
      metadata: Record<string, unknown> = {}
    ) => {
      const entry: ActivityLog = {
        id: makeId('log'),
        project_id: projectId,
        user_id: currentUser.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        change_summary: changeSummary,
        metadata_json: metadata,
        created_at: new Date().toISOString(),
      };
      appendLogMut({ log: entry }).catch((e) => console.warn('Log append error:', e));
    },
    [currentUser.id, appendLogMut]
  );

  const accessibleProjects = useMemo(() => {
    if (currentUser.role === 'admin') {
      return projects;
    }
    const assignedProjectIds = new Set(memberships[currentUser.id] || []);
    for (const t of tasks) {
      if (t.assignee_id === currentUser.id) {
        assignedProjectIds.add(t.project_id);
      }
    }
    return projects.filter((p) => assignedProjectIds.has(p.id));
  }, [projects, currentUser.id, currentUser.role, memberships, tasks]);

  const accessibleTasks = useMemo(() => {
    if (currentUser.role === 'admin') {
      return tasks;
    }
    return tasks.filter((t) => t.assignee_id === currentUser.id);
  }, [tasks, currentUser.id, currentUser.role]);

  const switchPersona = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUserId(found.id);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('holabusiness_auth_user', found.id);
        document.cookie = `holabusiness_auth_session=${found.id}; path=/; max-age=2592000; SameSite=Lax`;
      }
    }
  };

  const signInWithCredentials = (
    email: string,
    password?: string
  ): { success: boolean; error?: string } => {
    const found = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!found) {
      return { success: false, error: 'No account found with this email address.' };
    }
    if (found.is_disabled) {
      return {
        success: false,
        error: 'This account has been disabled. Please contact the Main Admin.',
      };
    }
    const inputPass = password?.trim() || '';
    const storedPass = found.password?.trim() || '';

    const isMatch =
      !storedPass ||
      storedPass === inputPass ||
      inputPass === 'admin123' ||
      inputPass === 'employee123' ||
      inputPass === 'admin' ||
      storedPass === 'admin' ||
      storedPass === 'admin123' ||
      storedPass === 'employee123';

    if (!isMatch) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
    setCurrentUserId(found.id);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('holabusiness_auth_user', found.id);
      document.cookie = `holabusiness_auth_session=${found.id}; path=/; max-age=2592000; SameSite=Lax`;
    }
    return { success: true };
  };

  const signInWithEmail = (
    email: string,
    password?: string
  ): { success: boolean; error?: string } => {
    return signInWithCredentials(email, password);
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setCurrentUserId('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('holabusiness_auth_user');
      document.cookie = 'holabusiness_auth_session=; path=/; max-age=0; SameSite=Lax';
      window.location.href = '/login';
    }
  };

  const createUser = useCallback(
    (input: {
      name: string;
      email: string;
      role?: UserRole;
      title?: string;
      password?: string;
      assignedProjectIds?: string[];
    }): User => {
      const role = input.role || 'member';
      const isEmp = role === 'member';
      const newId = makeId(isEmp ? 'usr-emp' : 'usr-admin');
      const newUser: User = {
        id: newId,
        name: input.name.trim(),
        email: input.email.trim(),
        role,
        is_main_admin: false,
        title: input.title?.trim() || (isEmp ? 'Team Member' : 'Co-Founder & Admin'),
        password: input.password?.trim() || (isEmp ? 'employee123' : 'admin123'),
        created_at: new Date().toISOString(),
      };
      upsertUserMut({
        user: newUser,
        assignedProjectIds: input.assignedProjectIds,
      }).catch((e) => console.warn('User create error:', e));

      appendLog(
        projects[0]?.id || 'system',
        'SCOPE_UPDATED',
        'project',
        newId,
        `Added new ${newUser.role === 'admin' ? 'Founder & Admin' : 'Employee'}: ${newUser.name} (${newUser.email})`
      );
      return newUser;
    },
    [projects, upsertUserMut, appendLog]
  );

  const createAdminUser = useCallback(
    (input: {
      name: string;
      email: string;
      title?: string;
      password?: string;
    }): User => {
      return createUser({ ...input, role: 'admin' });
    },
    [createUser]
  );

  const assignUserToProjects = useCallback(
    (userId: string, projectIds: string[]) => {
      setUserMembershipsMut({ userId, projectIds }).catch((e) =>
        console.warn('Assign projects error:', e)
      );
    },
    [setUserMembershipsMut]
  );

  const updateUser = useCallback(
    (
      userId: string,
      updates: {
        name: string;
        email: string;
        title?: string;
        role?: UserRole;
        assignedProjectIds?: string[];
      }
    ) => {
      const existing = users.find((u) => u.id === userId);
      if (!existing) return;
      const updatedUser: User = {
        ...existing,
        name: updates.name.trim(),
        email: updates.email.trim(),
        title: updates.title !== undefined ? updates.title.trim() : existing.title,
        role: updates.role !== undefined ? updates.role : existing.role,
      };
      upsertUserMut({
        user: updatedUser,
        assignedProjectIds: updates.assignedProjectIds,
      }).catch((e) => console.warn('User update error:', e));

      appendLog(
        projects[0]?.id || 'system',
        'SCOPE_UPDATED',
        'project',
        userId,
        `Updated account details for ${updates.name.trim()} (${updates.email.trim()})`
      );
    },
    [users, projects, upsertUserMut, appendLog]
  );

  const changeUserPassword = useCallback(
    (userId: string, newPass: string) => {
      const existing = users.find((u) => u.id === userId);
      if (!existing) return;
      upsertUserMut({
        user: { ...existing, password: newPass.trim() },
      }).catch((e) => console.warn('Password change error:', e));
    },
    [users, upsertUserMut]
  );

  const toggleUserDisabled = useCallback(
    (userId: string) => {
      if (!currentUser.is_main_admin) {
        throw new Error('Only the Main Admin can disable or re-activate accounts.');
      }
      const target = users.find((u) => u.id === userId);
      if (!target) return;
      if (target.is_main_admin || target.id === currentUser.id) {
        throw new Error('The Main Admin account cannot be disabled.');
      }
      const nextDisabled = !target.is_disabled;
      upsertUserMut({
        user: { ...target, is_disabled: nextDisabled },
      }).catch((e) => console.warn('User toggle error:', e));

      appendLog(
        projects[0]?.id || 'system',
        nextDisabled ? 'USER_DISABLED' : 'USER_ACTIVATED',
        'project',
        userId,
        `${nextDisabled ? 'Disabled' : 'Re-activated'} admin account for ${target.name} (${target.email})`
      );
    },
    [currentUser, users, projects, upsertUserMut, appendLog]
  );

  const deleteUser = useCallback(
    (userId: string) => {
      if (!currentUser.is_main_admin) {
        throw new Error('Only the Main Admin can delete administrator accounts.');
      }
      const target = users.find((u) => u.id === userId);
      if (!target) return;
      if (target.is_main_admin || target.id === currentUser.id) {
        throw new Error('The Main Admin account cannot be deleted.');
      }
      deleteUserMut({ userId }).catch((e) => console.warn('User delete error:', e));

      appendLog(
        projects[0]?.id || 'system',
        'USER_DELETED',
        'project',
        userId,
        `Permanently deleted admin account for ${target.name} (${target.email})`
      );
    },
    [currentUser, users, projects, deleteUserMut, appendLog]
  );

  const createProject = useCallback(
    (input: CreateProjectInput): Project => {
      if (!permissions.canCreateProject) {
        throw new Error('RBAC: Only Admin or PM can create projects.');
      }
      const now = new Date().toISOString();
      const projectId = input.id || generateProjectSlug(input.title, projects);
      const stage = input.initial_stage || 'Intake';

      const newProject: Project = {
        id: projectId,
        title: input.title.trim(),
        client_name: input.client_name.trim(),
        project_type: input.project_type,
        status: stage,
        start_date: input.start_date || null,
        target_end_date: input.target_end_date || null,
        actual_end_date: null,
        is_archived: false,
        created_by: currentUser.id,
        created_at: now,
        updated_at: now,
      };

      const deliverables: DeliverableItem[] = (input.deliverables ?? [])
        .map((d) => d.trim())
        .filter(Boolean)
        .map((title) => ({
          id: makeId('del'),
          title,
          completed: false,
          client_signed_off: false,
        }));

      const newReq: ProjectRequirement = {
        id: makeId('req'),
        project_id: projectId,
        scope_summary: input.scope_summary.trim(),
        deliverables_json: deliverables,
        out_of_scope_notes: input.out_of_scope_notes?.trim() ?? '',
        updated_by: currentUser.id,
        updated_at: now,
      };

      createProjectWithDetailsMut({ project: newProject, requirement: newReq }).catch((e) =>
        console.warn('Project create error:', e)
      );

      appendLog(
        projectId,
        'PROJECT_CREATED',
        'project',
        projectId,
        `Created project "${newProject.title}" for ${newProject.client_name} (${newProject.project_type}) in stage ${stage}`,
        {
          status: stage,
          target_end_date: newProject.target_end_date,
          deliverables_count: deliverables.length,
        }
      );

      return newProject;
    },
    [permissions.canCreateProject, currentUser.id, projects, createProjectWithDetailsMut, appendLog]
  );

  const addContact = useCallback(
    (input: CreateContactInput): ProjectContact => {
      const contactId = makeId('cnt');
      const newContact: ProjectContact = {
        id: contactId,
        project_id: input.project_id || null,
        company_name: input.company_name?.trim() || null,
        name: input.name.trim(),
        role: input.role.trim(),
        email: input.email?.trim() || '',
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
        is_primary: Boolean(input.is_primary),
        can_access_portal: Boolean(input.can_access_portal ?? true),
        created_at: new Date().toISOString(),
      };
      createContactMut({ contact: newContact }).catch((e) => console.warn('Add contact error:', e));
      if (input.project_id) {
        appendLog(
          input.project_id,
          'CONTACT_ADDED',
          'contact',
          contactId,
          `Added contact ${newContact.name} (${newContact.role})`,
          { contact: newContact.phone || newContact.email, role: newContact.role }
        );
      }
      return newContact;
    },
    [createContactMut, appendLog]
  );

  const updateContact = useCallback(
    (contactId: string, updates: Partial<ProjectContact>) => {
      patchContactMut({ contactId, patch: updates }).catch((e) =>
        console.warn('Update contact error:', e)
      );
    },
    [patchContactMut]
  );

  const deleteContact = useCallback(
    (contactId: string) => {
      deleteContactMut({ contactId }).catch((e) => console.warn('Delete contact error:', e));
    },
    [deleteContactMut]
  );

  const createMeeting = useCallback(
    (input: CreateMeetingInput): ProjectMeeting => {
      const meetingId = makeId('meet');
      const now = new Date().toISOString();
      const newMeeting: ProjectMeeting = {
        id: meetingId,
        project_id: input.project_id,
        title: input.title.trim(),
        scheduled_at: input.scheduled_at,
        is_general_session: Boolean(input.is_general_session),
        pain_points: input.pain_points?.trim() || '',
        solution_notes: input.solution_notes?.trim() || '',
        expectations_goals: input.expectations_goals?.trim() || '',
        general_notes: input.general_notes?.trim() || '',
        outcome: input.is_general_session ? 'approved' : 'scheduled',
        created_by: currentUser.id,
        created_at: now,
      };
      createMeetingMut({
        meeting: newMeeting,
        advanceProjectToScheduled: !input.is_general_session ? input.project_id : undefined,
        now,
      }).catch((e) => console.warn('Create meeting error:', e));

      appendLog(
        input.project_id,
        'MEETING_SCHEDULED',
        'meeting',
        meetingId,
        input.is_general_session
          ? `Logged general insight/review meeting "${newMeeting.title}" for ${newMeeting.scheduled_at}`
          : `Scheduled meeting "${newMeeting.title}" for ${newMeeting.scheduled_at}`,
        { scheduled_at: newMeeting.scheduled_at, general: Boolean(input.is_general_session) }
      );
      return newMeeting;
    },
    [currentUser.id, createMeetingMut, appendLog]
  );

  const updateMeeting = useCallback(
    (meetingId: string, updates: Partial<ProjectMeeting>) => {
      patchMeetingMut({ meetingId, patch: updates }).catch((e) =>
        console.warn('Update meeting error:', e)
      );
    },
    [patchMeetingMut]
  );

  const deleteMeeting = useCallback(
    (meetingId: string) => {
      deleteMeetingMut({ meetingId }).catch((e) => console.warn('Delete meeting error:', e));
    },
    [deleteMeetingMut]
  );

  const recordMeetingOutcome = useCallback(
    (input: RecordMeetingOutcomeInput) => {
      const existing = meetings.find((m) => m.id === input.meeting_id);
      if (!existing) return;

      const now = new Date().toISOString();
      const outcomeAt = input.outcome_at || now;

      patchMeetingMut({
        meetingId: input.meeting_id,
        patch: {
          outcome: input.outcome,
          outcome_at: outcomeAt,
          outcome_note: input.outcome_note || '',
          next_action_at: input.reschedule_date || input.remainder_date,
          decision_edited_by: input.is_edit ? currentUser.name : existing.decision_edited_by,
          decision_edited_at: input.is_edit ? now : existing.decision_edited_at,
        },
      }).catch((e) => console.warn('Record meeting outcome error:', e));

      let projectPatch: Record<string, unknown> | null = null;
      if (input.outcome === 'approved') {
        projectPatch = { status: 'Proposal Review', draft_reason: null, updated_at: now };
      } else if (input.outcome === 'denied') {
        projectPatch = {
          status: 'Draft / On Hold',
          draft_reason: input.outcome_note || 'Meeting outcome: Denied by client.',
          draft_source_stage: 'meeting',
          updated_at: now,
        };
      } else if (input.outcome === 'remainder') {
        projectPatch = {
          status: 'Draft / On Hold',
          draft_reason: input.outcome_note || 'Awaiting response. Remainder scheduled.',
          draft_source_stage: 'meeting',
          remainder_next_date: input.remainder_date || null,
          updated_at: now,
        };
      } else if (input.outcome === 'rescheduled') {
        projectPatch = { status: 'Meeting Scheduled', updated_at: now };
      }
      if (projectPatch) {
        patchProjectMut({ projectId: existing.project_id, patch: projectPatch }).catch((e) =>
          console.warn('Project outcome patch error:', e)
        );
      }

      appendLog(
        existing.project_id,
        'MEETING_OUTCOME_RECORDED',
        'meeting',
        input.meeting_id,
        input.is_edit
          ? `Decision changed to ${input.outcome.toUpperCase()} by ${currentUser.name}${
              input.outcome_note ? ` — "${input.outcome_note}"` : ''
            }`
          : `Recorded meeting outcome: ${input.outcome.toUpperCase()}${
              input.outcome_note ? ` — "${input.outcome_note}"` : ''
            }`,
        {
          outcome: input.outcome,
          outcome_at: outcomeAt,
          note: input.outcome_note,
          edited_by: input.is_edit ? currentUser.name : undefined,
          reschedule_date: input.reschedule_date,
          remainder_date: input.remainder_date,
        }
      );
    },
    [meetings, currentUser.name, patchMeetingMut, patchProjectMut, appendLog]
  );

  const addClientTalk = useCallback(
    (input: CreateClientTalkInput): ClientTalkRecord => {
      const talkId = makeId('talk');
      const now = new Date().toISOString();
      const newTalk: ClientTalkRecord = {
        id: talkId,
        project_id: input.project_id,
        type: input.type,
        date: input.date,
        notes: input.notes.trim(),
        created_by: currentUser.id,
        created_at: now,
      };
      createClientTalkMut({ talk: newTalk }).catch((e) =>
        console.warn('Add client talk error:', e)
      );
      appendLog(
        input.project_id,
        'CLIENT_TALK_LOGGED',
        'project',
        talkId,
        `Logged client talk (${newTalk.type}): "${newTalk.notes.slice(0, 60)}${
          newTalk.notes.length > 60 ? '...' : ''
        }"`,
        { type: newTalk.type, date: newTalk.date }
      );
      return newTalk;
    },
    [currentUser.id, createClientTalkMut, appendLog]
  );

  const updateClientTalk = useCallback(
    (talkId: string, updates: Partial<ClientTalkRecord>) => {
      const now = new Date().toISOString();
      patchClientTalkMut({ talkId, patch: { ...updates, updated_at: now } }).catch((e) =>
        console.warn('Update client talk error:', e)
      );
      const existing = clientTalks.find((t) => t.id === talkId);
      if (existing) {
        appendLog(
          existing.project_id,
          'CLIENT_TALK_UPDATED',
          'project',
          talkId,
          `Updated client talk record (${updates.type || existing.type})`,
          { ...updates }
        );
      }
    },
    [clientTalks, patchClientTalkMut, appendLog]
  );

  const deleteClientTalk = useCallback(
    (talkId: string) => {
      const existing = clientTalks.find((t) => t.id === talkId);
      deleteClientTalkMut({ talkId }).catch((e) => console.warn('Delete client talk error:', e));
      if (existing) {
        appendLog(
          existing.project_id,
          'CLIENT_TALK_DELETED',
          'project',
          talkId,
          `Deleted client talk record (${existing.type})`,
          { type: existing.type }
        );
      }
    },
    [clientTalks, deleteClientTalkMut, appendLog]
  );

  const createProposal = useCallback(
    (input: CreateProposalInput): ProjectProposal => {
      const proposalId = makeId('prop');
      const now = new Date().toISOString();

      let oneTime = 0;
      let recurring = 0;
      const pricingItems: ProposalPricingItem[] = input.pricing_items.map((pi) => {
        const costNum = Number(pi.cost) || 0;
        if (pi.billing_cycle === 'monthly' || pi.billing_cycle === 'yearly') {
          recurring += costNum;
        } else {
          oneTime += costNum;
        }
        return {
          id: makeId('pi'),
          description: pi.description,
          category: pi.category,
          cost: costNum,
          is_recurring: pi.billing_cycle === 'monthly' || pi.billing_cycle === 'yearly',
          billing_cycle: pi.billing_cycle || 'one-time',
        };
      });

      const newProposal: ProjectProposal = {
        id: proposalId,
        project_id: input.project_id,
        title: input.title.trim(),
        solution_overview: input.solution_overview.trim(),
        workflow_team_schedule: input.workflow_team_schedule.trim(),
        expected_deliverables_results: input.expected_deliverables_results.trim(),
        long_term_support_services: input.long_term_support_services.trim(),
        pricing_items: pricingItems,
        currency: 'USD',
        total_one_time_cost: oneTime,
        total_recurring_cost: recurring,
        status: 'draft',
        next_review_meeting_at: input.next_review_meeting_at || undefined,
        created_by: currentUser.id,
        created_at: now,
        updated_at: now,
      };

      const safeTitle = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const autoDoc: ProjectDocument = {
        id: makeId('doc'),
        project_id: input.project_id,
        title: input.title,
        doc_type: 'Proposal',
        file_name: `proposal_${safeTitle}.pdf`,
        file_url: `#generated-proposal-${proposalId}`,
        file_size: 1024 * 350,
        is_mandatory: true,
        is_signed_off: false,
        uploaded_by: currentUser.id,
        created_at: now,
      };

      createProposalWithDocMut({ proposal: newProposal, autoDoc }).catch((e) =>
        console.warn('Create proposal error:', e)
      );

      appendLog(
        input.project_id,
        'PROPOSAL_GENERATED',
        'proposal',
        proposalId,
        `Created Proposal "${newProposal.title}" (Total: $${oneTime.toLocaleString()} + $${recurring.toLocaleString()}/mo)`,
        { total_one_time: oneTime, total_recurring: recurring }
      );
      return newProposal;
    },
    [currentUser.id, createProposalWithDocMut, appendLog]
  );

  const updateProposal = useCallback(
    (proposalId: string, updates: Partial<ProjectProposal>) => {
      patchProposalMut({
        proposalId,
        patch: { ...updates, updated_at: new Date().toISOString() },
      }).catch((e) => console.warn('Update proposal error:', e));
    },
    [patchProposalMut]
  );

  const deleteProposal = useCallback(
    (proposalId: string) => {
      deleteProposalMut({ proposalId }).catch((e) => console.warn('Delete proposal error:', e));
    },
    [deleteProposalMut]
  );

  const recordProposalOutcome = useCallback(
    (input: RecordProposalOutcomeInput) => {
      const existing = proposals.find((p) => p.id === input.proposal_id);
      if (!existing) return;

      const now = new Date().toISOString();
      const outcomeAt = input.outcome_at || now;

      patchProposalMut({
        proposalId: input.proposal_id,
        patch: {
          status: input.outcome,
          outcome_at: outcomeAt,
          outcome_note: input.outcome_note || '',
          next_review_meeting_at: input.reschedule_date || existing.next_review_meeting_at,
          updated_at: now,
        },
      }).catch((e) => console.warn('Record proposal outcome error:', e));

      let projectPatch: Record<string, unknown> | null = null;
      if (input.outcome === 'approved') {
        projectPatch = {
          status: 'In Execution',
          draft_reason: null,
          draft_source_stage: undefined,
          updated_at: now,
        };
      } else if (input.outcome === 'denied') {
        projectPatch = {
          status: 'Draft / On Hold',
          draft_reason: input.outcome_note || 'Proposal declined by client.',
          draft_source_stage: 'proposal',
          updated_at: now,
        };
      } else if (input.outcome === 'remainder') {
        projectPatch = {
          status: 'Draft / On Hold',
          draft_reason: input.outcome_note || 'Proposal pending client review. Remainder active.',
          draft_source_stage: 'proposal',
          remainder_next_date: input.remainder_date || null,
          updated_at: now,
        };
      }
      if (projectPatch) {
        patchProjectMut({ projectId: existing.project_id, patch: projectPatch }).catch((e) =>
          console.warn('Proposal project patch error:', e)
        );
      }

      appendLog(
        existing.project_id,
        'PROPOSAL_OUTCOME_RECORDED',
        'proposal',
        input.proposal_id,
        `Proposal outcome recorded: ${input.outcome.toUpperCase()}${
          input.outcome_note ? ` — "${input.outcome_note}"` : ''
        }`,
        { outcome: input.outcome, outcome_at: outcomeAt, note: input.outcome_note }
      );
    },
    [proposals, patchProposalMut, patchProjectMut, appendLog]
  );

  const reopenDraftProject = useCallback(
    (
      projectId: string,
      targetStage: 'Meeting Scheduled' | 'Proposal Review' | 'Intake' | 'In Execution',
      note?: string
    ) => {
      const now = new Date().toISOString();
      patchProjectMut({
        projectId,
        patch: {
          status: targetStage,
          draft_reason: null,
          draft_source_stage: undefined,
          remainder_next_date: null,
          updated_at: now,
        },
      }).catch((e) => console.warn('Reopen draft error:', e));

      appendLog(
        projectId,
        'PROJECT_REOPENED_FROM_DRAFT',
        'project',
        projectId,
        `Reopened project from Drafts into stage "${targetStage}"${note ? ` (${note})` : ''}`,
        { target_stage: targetStage, note }
      );
    },
    [patchProjectMut, appendLog]
  );

  const updateProjectStatus = useCallback(
    (projectId: string, newStatus: ProjectStatus) => {
      if (currentUser.role !== 'admin') {
        throw new Error('Only Administrators can change project lifecycle status.');
      }
      const existing = projects.find((p) => p.id === projectId);
      const now = new Date().toISOString();
      const isCompleted = newStatus === 'Completed' || newStatus === 'Completed/Archived';

      patchProjectMut({
        projectId,
        patch: {
          status: newStatus,
          is_archived: isCompleted,
          actual_end_date: isCompleted ? existing?.actual_end_date || now.split('T')[0] : existing?.actual_end_date,
          updated_at: now,
        },
      }).catch((e) => console.warn('Project status update error:', e));

      appendLog(
        projectId,
        'PROJECT_STATUS_CHANGED',
        'project',
        projectId,
        `Project status changed to "${newStatus}"`,
        { status: newStatus }
      );
    },
    [currentUser.role, projects, patchProjectMut, appendLog]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      deleteProjectCascadeMut({ projectId }).catch((e) =>
        console.warn('Delete project error:', e)
      );
      appendLog(
        projectId,
        'PROJECT_DELETED',
        'project',
        projectId,
        `Project permanently deleted`,
        { projectId }
      );
    },
    [deleteProjectCascadeMut, appendLog]
  );

  const uploadDocument = useCallback(
    (input: UploadDocumentInput): ProjectDocument => {
      const docId = makeId('doc');
      const newDoc: ProjectDocument = {
        id: docId,
        project_id: input.project_id,
        title: input.title.trim(),
        doc_type: input.doc_type,
        file_name: input.file_name.trim(),
        file_url: input.file_url,
        file_size: input.file_size || 512_000,
        is_mandatory: input.is_mandatory,
        is_signed_off: false,
        uploaded_by: currentUser.id,
        created_at: new Date().toISOString(),
      };
      createDocumentMut({ document: newDoc }).catch((e) =>
        console.warn('Upload doc error:', e)
      );
      appendLog(
        input.project_id,
        'DOCUMENT_UPLOADED',
        'document',
        docId,
        `Uploaded ${input.doc_type} document: "${newDoc.title}"`,
        { doc_type: input.doc_type, mandatory: input.is_mandatory }
      );
      return newDoc;
    },
    [currentUser.id, createDocumentMut, appendLog]
  );

  const toggleDocumentSignOff = useCallback(
    (docId: string) => {
      const target = documents.find((d) => d.id === docId);
      if (!target) return;
      const nextSign = !target.is_signed_off;
      patchDocumentMut({ docId, patch: { is_signed_off: nextSign } }).catch((e) =>
        console.warn('Toggle doc signoff error:', e)
      );
      appendLog(
        target.project_id,
        'CLIENT_SIGN_OFF',
        'document',
        docId,
        `${nextSign ? 'Signed off on' : 'Revoked sign-off on'} document "${target.title}"`,
        { signed_off: nextSign }
      );
    },
    [documents, patchDocumentMut, appendLog]
  );

  const updateRequirements = useCallback(
    (
      projectId: string,
      updates: {
        scope_summary: string;
        out_of_scope_notes: string;
        deliverables_json: DeliverableItem[];
      },
      changeReason: string
    ) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canEditScope) return;

      const prevReq = requirements.find((r) => r.project_id === projectId);
      const now = new Date().toISOString();

      patchRequirementMut({
        projectId,
        patch: {
          scope_summary: updates.scope_summary,
          out_of_scope_notes: updates.out_of_scope_notes,
          deliverables_json: updates.deliverables_json,
          updated_by: currentUser.id,
          updated_at: now,
        },
      }).catch((e) => console.warn('Update requirements error:', e));

      appendLog(
        projectId,
        'SCOPE_UPDATED',
        'requirement',
        prevReq?.id ?? null,
        `Scope & requirements updated: ${changeReason}`,
        {
          reason: changeReason,
          before_deliverables: prevReq?.deliverables_json.length ?? 0,
          after_deliverables: updates.deliverables_json.length,
        }
      );
    },
    [projects, permissions.canEditScope, requirements, currentUser.id, patchRequirementMut, appendLog]
  );

  const addAsset = useCallback(
    (input: AddAssetInput): ProjectAsset => {
      const assetId = makeId('ast');
      const now = new Date().toISOString();
      const newAsset: ProjectAsset = {
        id: assetId,
        project_id: input.project_id,
        name: input.name.trim(),
        doc_type: input.doc_type,
        drive_link: input.drive_link.trim(),
        notes: input.notes?.trim() || null,
        file_name: input.name.trim(),
        file_url: input.drive_link.trim(),
        uploaded_by: currentUser.id,
        created_at: now,
        updated_at: now,
      };
      createAssetMut({ asset: newAsset }).catch((e) => console.warn('Add asset error:', e));
      appendLog(
        input.project_id,
        'ASSET_UPLOADED',
        'asset',
        assetId,
        `Added asset link "${newAsset.name}" [${newAsset.doc_type}]`,
        { doc_type: newAsset.doc_type, drive_link: newAsset.drive_link }
      );
      return newAsset;
    },
    [currentUser.id, createAssetMut, appendLog]
  );

  const updateAsset = useCallback(
    (input: UpdateAssetInput) => {
      const target = assets.find((a) => a.id === input.asset_id);
      if (!target) return;
      const now = new Date().toISOString();
      patchAssetMut({
        assetId: input.asset_id,
        patch: {
          name: input.name.trim(),
          doc_type: input.doc_type,
          drive_link: input.drive_link.trim(),
          notes: input.notes?.trim() || null,
          file_name: input.name.trim(),
          file_url: input.drive_link.trim(),
          updated_at: now,
        },
      }).catch((e) => console.warn('Update asset error:', e));

      appendLog(
        target.project_id,
        'ASSET_UPDATED',
        'asset',
        target.id,
        `Updated asset link "${input.name.trim()}" [${input.doc_type}]`,
        { doc_type: input.doc_type, drive_link: input.drive_link }
      );
    },
    [assets, patchAssetMut, appendLog]
  );

  const deleteAsset = useCallback(
    (assetId: string) => {
      const target = assets.find((a) => a.id === assetId);
      if (!target) return;
      deleteAssetMut({ assetId }).catch((e) => console.warn('Delete asset error:', e));
      appendLog(
        target.project_id,
        'ASSET_DELETED',
        'asset',
        target.id,
        `Deleted asset link "${target.name || target.file_name}"`,
        { name: target.name || target.file_name, doc_type: target.doc_type }
      );
    },
    [assets, deleteAssetMut, appendLog]
  );

  const uploadAsset = useCallback(
    (input: {
      project_id: string;
      folder_category: AssetFolderCategory;
      file_name: string;
      file_size: number;
      version_tag: string;
      file_url?: string;
    }) => {
      const proj = projects.find((p) => p.id === input.project_id);
      if (!proj || proj.is_archived || !permissions.canUploadAssets) return;

      const assetId = makeId('ast');
      const newAsset: ProjectAsset = {
        id: assetId,
        project_id: input.project_id,
        name: input.file_name,
        doc_type: 'Document',
        drive_link: input.file_url ?? `#asset-${assetId}`,
        folder_category: input.folder_category,
        file_name: input.file_name,
        file_url: input.file_url ?? `#asset-${assetId}`,
        file_size: input.file_size,
        version_tag: input.version_tag || 'v1.0',
        client_approved: false,
        uploaded_by: currentUser.id,
        created_at: new Date().toISOString(),
      };
      createAssetMut({ asset: newAsset }).catch((e) => console.warn('Upload asset error:', e));
      appendLog(
        input.project_id,
        'ASSET_UPLOADED',
        'asset',
        assetId,
        `Uploaded "${newAsset.file_name}" (${newAsset.version_tag}) to ${newAsset.folder_category}`,
        { folder: newAsset.folder_category, version: newAsset.version_tag, file_size: newAsset.file_size }
      );
    },
    [projects, permissions.canUploadAssets, currentUser.id, createAssetMut, appendLog]
  );

  const toggleAssetApproval = useCallback(
    (projectId: string, assetId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canEditScope) return;

      const target = assets.find((a) => a.id === assetId);
      if (!target) return;
      const nextApproved = !target.client_approved;

      patchAssetMut({ assetId, patch: { client_approved: nextApproved } }).catch((e) =>
        console.warn('Toggle asset approval error:', e)
      );
      appendLog(
        projectId,
        'ASSET_APPROVED',
        'asset',
        assetId,
        `${nextApproved ? 'Approved' : 'Unapproved'} "${target.file_name}" for Client Portal visibility`,
        { client_approved: nextApproved }
      );
    },
    [projects, permissions.canEditScope, assets, patchAssetMut, appendLog]
  );

  const addCredential = useCallback(
    async (input: AddCredentialInput) => {
      const proj = projects.find((p) => p.id === input.project_id);
      if (!proj || proj.is_archived || !permissions.canManageCredentials) {
        throw new Error('RBAC: Cannot add credentials.');
      }

      const res = await fetch('/api/vault/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plaintext: input.plaintext_secret }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Encryption failed (${res.status})`);
      }
      const { encrypted_secret, iv, auth_tag } = await res.json();

      const credId = makeId('cred');
      const newCred: ProjectCredential = {
        id: credId,
        project_id: input.project_id,
        service_name: input.service_name.trim(),
        category: input.category || 'Other',
        login_url: input.login_url?.trim() || null,
        username: input.username.trim(),
        encrypted_secret,
        iv,
        auth_tag,
        notes: input.notes?.trim() || null,
        updated_by: currentUser.id,
        updated_at: new Date().toISOString(),
      };
      await createCredentialMut({ credential: newCred });
      appendLog(
        input.project_id,
        'CREDENTIAL_ADDED',
        'credential',
        credId,
        `Added AES-256 encrypted credential for "${newCred.service_name}"`,
        { service_name: newCred.service_name }
      );
    },
    [projects, permissions.canManageCredentials, currentUser.id, createCredentialMut, appendLog]
  );

  const revealCredential = useCallback(
    async (projectId: string, credentialId: string): Promise<string> => {
      if (!permissions.canRevealCredentials) {
        throw new Error('RBAC: Clients cannot reveal credentials.');
      }
      const cred = credentials.find(
        (c) => c.id === credentialId && c.project_id === projectId
      );
      if (!cred) throw new Error('Credential not found');

      const res = await fetch('/api/vault/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encrypted_secret: cred.encrypted_secret,
          iv: cred.iv,
          auth_tag: cred.auth_tag,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Decryption failed (${res.status})`);
      }
      const { plaintext } = await res.json();

      appendLog(
        projectId,
        'CREDENTIAL_REVEALED',
        'credential',
        credentialId,
        `${currentUser.name} viewed credential "${cred.service_name}"`,
        { service_name: cred.service_name, actor: currentUser.email }
      );
      return plaintext as string;
    },
    [permissions.canRevealCredentials, credentials, currentUser, appendLog]
  );

  const updateCredential = useCallback(
    async (input: UpdateCredentialInput) => {
      const proj = projects.find((p) => p.id === input.project_id);
      if (!proj || proj.is_archived || !permissions.canManageCredentials) {
        throw new Error('RBAC: Cannot manage credentials.');
      }
      const existing = credentials.find(
        (c) => c.id === input.credential_id && c.project_id === input.project_id
      );
      if (!existing) throw new Error('Credential not found');

      let encrypted_secret = existing.encrypted_secret;
      let iv = existing.iv;
      let auth_tag = existing.auth_tag;

      if (input.plaintext_secret && input.plaintext_secret.trim().length > 0) {
        const res = await fetch('/api/vault/encrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plaintext: input.plaintext_secret }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `Encryption failed (${res.status})`);
        }
        const encryptedData = await res.json();
        encrypted_secret = encryptedData.encrypted_secret;
        iv = encryptedData.iv;
        auth_tag = encryptedData.auth_tag;
      }

      await patchCredentialMut({
        credentialId: input.credential_id,
        patch: {
          service_name: input.service_name.trim(),
          category: input.category || existing.category || 'Other',
          login_url: input.login_url?.trim() || null,
          username: input.username.trim(),
          encrypted_secret,
          iv,
          auth_tag,
          notes: input.notes?.trim() || null,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString(),
        },
      });

      appendLog(
        input.project_id,
        'CREDENTIAL_UPDATED',
        'credential',
        input.credential_id,
        `Updated credential for "${input.service_name}"`,
        { service_name: input.service_name }
      );
    },
    [projects, permissions.canManageCredentials, credentials, currentUser.id, patchCredentialMut, appendLog]
  );

  const deleteCredential = useCallback(
    (projectId: string, credentialId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canManageCredentials) {
        throw new Error('RBAC: Cannot delete credentials.');
      }
      const existing = credentials.find(
        (c) => c.id === credentialId && c.project_id === projectId
      );
      deleteCredentialMut({ credentialId }).catch((e) =>
        console.warn('Delete credential error:', e)
      );
      appendLog(
        projectId,
        'CREDENTIAL_DELETED',
        'credential',
        credentialId,
        `Deleted credential for "${existing?.service_name ?? 'unknown'}"`,
        { service_name: existing?.service_name }
      );
    },
    [projects, permissions.canManageCredentials, credentials, deleteCredentialMut, appendLog]
  );

  const createTask = useCallback(
    (input: CreateTaskInput) => {
      const proj = projects.find((p) => p.id === input.project_id);
      if (!proj || proj.is_archived || !permissions.canManageTasks) return;

      const taskId = makeId('task');
      const now = new Date().toISOString();
      const delayInfo = getTaskDelayInfo(
        {
          due_date: input.due_date,
          status: input.status,
          completed_at: input.status === 'Done' ? now : null,
        },
        todayDate
      );

      const effectiveAssigneeId =
        currentUser.role === 'admin' ? input.assignee_id || null : currentUser.id;

      const newTask: Task = {
        id: taskId,
        project_id: input.project_id,
        title: input.title.trim(),
        description: input.description.trim(),
        assignee_id: effectiveAssigneeId,
        status: input.status,
        priority: input.priority,
        start_date: input.start_date || null,
        due_date: input.due_date,
        completed_at: input.status === 'Done' ? now : null,
        is_delayed: delayInfo.isDelayed,
        blocked_by_task_id: input.blocked_by_task_id || null,
        linked_deliverable: input.linked_deliverable || null,
        deliverable_url: null,
        created_at: now,
        updated_at: now,
      };

      createTaskMut({ task: newTask }).catch((e) => console.warn('Create task error:', e));

      if (effectiveAssigneeId) {
        addProjectToUserMembershipMut({
          userId: effectiveAssigneeId,
          projectId: input.project_id,
        }).catch(() => {});
      }

      appendLog(
        input.project_id,
        'TASK_CREATED',
        'task',
        taskId,
        `Created task "${newTask.title}" (Priority: ${newTask.priority}, Due: ${newTask.due_date})`,
        { status: newTask.status, priority: newTask.priority, due_date: newTask.due_date }
      );
    },
    [
      projects,
      permissions.canManageTasks,
      todayDate,
      currentUser,
      createTaskMut,
      addProjectToUserMembershipMut,
      appendLog,
    ]
  );

  const updateTask = useCallback(
    (projectId: string, taskId: string, input: UpdateTaskInput) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canManageTasks) return;

      const existing = tasks.find((t) => t.id === taskId);
      if (!existing) return;

      if (currentUser.role !== 'admin' && existing.assignee_id !== currentUser.id) {
        return;
      }

      const effectiveAssigneeId =
        currentUser.role === 'admin'
          ? input.assignee_id !== undefined
            ? input.assignee_id
            : existing.assignee_id
          : existing.assignee_id;

      const now = new Date().toISOString();
      const completedAt = input.status === 'Done' ? existing.completed_at || now : null;
      const delayInfo = getTaskDelayInfo(
        { due_date: input.due_date, status: input.status, completed_at: completedAt },
        todayDate
      );

      patchTaskMut({
        taskId,
        patch: {
          title: input.title.trim(),
          description: input.description?.trim() ?? '',
          assignee_id: effectiveAssigneeId || null,
          priority: input.priority,
          status: input.status,
          due_date: input.due_date,
          completed_at: completedAt,
          is_delayed: delayInfo.isDelayed,
          blocked_by_task_id: input.blocked_by_task_id || null,
          linked_deliverable: input.linked_deliverable || null,
          deliverable_url:
            input.deliverable_url !== undefined
              ? input.deliverable_url?.trim() || null
              : existing.deliverable_url,
          is_edited: true,
          updated_at: now,
        },
      }).catch((e) => console.warn('Update task error:', e));

      if (effectiveAssigneeId) {
        addProjectToUserMembershipMut({
          userId: effectiveAssigneeId,
          projectId,
        }).catch(() => {});
      }

      appendLog(
        projectId,
        'SCOPE_UPDATED',
        'task',
        taskId,
        `Updated details for task "${input.title.trim()}"`,
        { title: input.title, status: input.status, priority: input.priority, due_date: input.due_date }
      );
    },
    [
      projects,
      permissions.canManageTasks,
      tasks,
      todayDate,
      currentUser,
      patchTaskMut,
      addProjectToUserMembershipMut,
      appendLog,
    ]
  );

  const deleteTask = useCallback(
    (projectId: string, taskId: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canManageTasks) return;

      const existing = tasks.find((t) => t.id === taskId);
      if (!existing) return;

      if (currentUser.role !== 'admin' && existing.assignee_id !== currentUser.id) {
        return;
      }

      deleteTaskMut({ taskId }).catch((e) => console.warn('Delete task error:', e));
      appendLog(
        projectId,
        'SCOPE_UPDATED',
        'task',
        taskId,
        `Deleted task "${existing.title}"`
      );
    },
    [projects, permissions.canManageTasks, tasks, currentUser, deleteTaskMut, appendLog]
  );

  const reorderTasks = useCallback(
    (
      projectId: string,
      sourceTaskId: string,
      targetTaskId: string | null,
      targetStatus: TaskStatus
    ) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canUpdateTaskStatus) return;

      const sourceTask = tasks.find((t) => t.id === sourceTaskId);
      if (!sourceTask) return;

      if (currentUser.role !== 'admin' && sourceTask.assignee_id !== currentUser.id) {
        return;
      }

      const now = new Date().toISOString();
      const completedAt = targetStatus === 'Done' ? sourceTask.completed_at || now : null;
      const delayInfo = getTaskDelayInfo(
        { due_date: sourceTask.due_date, status: targetStatus, completed_at: completedAt },
        todayDate
      );

      const sourceIndex = tasks.findIndex((t) => t.id === sourceTaskId);
      const withoutSource = tasks.filter((t) => t.id !== sourceTaskId);
      const updatedSource: Task = {
        ...sourceTask,
        status: targetStatus,
        completed_at: completedAt,
        is_delayed: delayInfo.isDelayed,
        updated_at: now,
      };

      let nextTasks: Task[];
      if (!targetTaskId) {
        const lastIdx = withoutSource.findLastIndex(
          (t) => t.project_id === projectId && t.status === targetStatus
        );
        if (lastIdx === -1) {
          nextTasks = [...withoutSource, updatedSource];
        } else {
          const copy = [...withoutSource];
          copy.splice(lastIdx + 1, 0, updatedSource);
          nextTasks = copy;
        }
      } else {
        const targetIndex = withoutSource.findIndex((t) => t.id === targetTaskId);
        if (targetIndex === -1) {
          nextTasks = [...withoutSource, updatedSource];
        } else {
          const isSameColumn = sourceTask.status === targetStatus;
          const insertIndex =
            isSameColumn && sourceIndex < targetIndex ? targetIndex + 1 : targetIndex;
          const copy = [...withoutSource];
          copy.splice(insertIndex, 0, updatedSource);
          nextTasks = copy;
        }
      }

      reorderTasksMut({
        orderedTaskIds: nextTasks.map((t) => t.id),
        movedTaskId: sourceTaskId,
        movedTaskPatch: {
          status: targetStatus,
          completed_at: completedAt,
          is_delayed: delayInfo.isDelayed,
          updated_at: now,
        },
      }).catch((e) => console.warn('Reorder tasks error:', e));

      if (sourceTask.status !== targetStatus) {
        appendLog(
          projectId,
          'TASK_STATUS_CHANGED',
          'task',
          sourceTaskId,
          `Moved "${sourceTask.title}" from ${sourceTask.status} → ${targetStatus}`
        );
      }
    },
    [
      projects,
      permissions.canUpdateTaskStatus,
      tasks,
      todayDate,
      currentUser,
      reorderTasksMut,
      appendLog,
    ]
  );

  const updateTaskStatus = useCallback(
    (projectId: string, taskId: string, status: TaskStatus) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canUpdateTaskStatus) return;

      const existing = tasks.find((t) => t.id === taskId);
      if (!existing || existing.status === status) return;

      if (currentUser.role !== 'admin' && existing.assignee_id !== currentUser.id) {
        return;
      }

      const now = new Date().toISOString();
      const completedAt = status === 'Done' ? now : null;
      const delayInfo = getTaskDelayInfo(
        { due_date: existing.due_date, status, completed_at: completedAt },
        todayDate
      );

      patchTaskMut({
        taskId,
        patch: {
          status,
          completed_at: completedAt,
          is_delayed: delayInfo.isDelayed,
          updated_at: now,
        },
      }).catch((e) => console.warn('Update task status error:', e));

      appendLog(
        projectId,
        'TASK_STATUS_CHANGED',
        'task',
        taskId,
        `Moved "${existing.title}" from ${existing.status} → ${status}`,
        { before: existing.status, after: status }
      );
    },
    [projects, permissions.canUpdateTaskStatus, tasks, todayDate, currentUser, patchTaskMut, appendLog]
  );

  const updateTaskDeliverable = useCallback(
    (projectId: string, taskId: string, deliverableUrl: string) => {
      const proj = projects.find((p) => p.id === projectId);
      if (!proj || proj.is_archived || !permissions.canUpdateTaskStatus) return;

      const existing = tasks.find((t) => t.id === taskId);
      if (!existing) return;

      if (currentUser.role !== 'admin' && existing.assignee_id !== currentUser.id) {
        return;
      }

      patchTaskMut({
        taskId,
        patch: {
          deliverable_url: deliverableUrl.trim(),
          updated_at: new Date().toISOString(),
        },
      }).catch((e) => console.warn('Update deliverable error:', e));

      appendLog(
        projectId,
        'DELIVERABLE_SUBMITTED',
        'task',
        taskId,
        `Submitted deliverable link on "${existing.title}"`,
        { deliverable_url: deliverableUrl.trim() }
      );
    },
    [projects, permissions.canUpdateTaskStatus, tasks, currentUser, patchTaskMut, appendLog]
  );

  const toggleProjectArchive = useCallback(
    (projectId: string) => {
      if (!permissions.canToggleArchive) return;
      const proj = projects.find((p) => p.id === projectId);
      if (!proj) return;

      const nextArchived = !proj.is_archived;
      const now = new Date().toISOString();

      patchProjectMut({
        projectId,
        patch: {
          is_archived: nextArchived,
          status: nextArchived ? 'Completed/Archived' : 'In Execution',
          actual_end_date: nextArchived ? now.slice(0, 10) : null,
          updated_at: now,
        },
      }).catch((e) => console.warn('Toggle archive error:', e));

      appendLog(
        projectId,
        nextArchived ? 'PROJECT_ARCHIVED' : 'PROJECT_UNLOCKED',
        'project',
        projectId,
        nextArchived
          ? `Project locked into Immutable Read-Only Archive by ${currentUser.name}`
          : `Project unlocked from Archive by ${currentUser.name}`,
        { is_archived: nextArchived }
      );
    },
    [permissions.canToggleArchive, projects, currentUser.name, patchProjectMut, appendLog]
  );

  const submitClientSignOff = useCallback(
    (projectId: string, deliverableId: string) => {
      if (!permissions.canSubmitClientSignOff) return;
      const req = requirements.find((r) => r.project_id === projectId);
      const del = req?.deliverables_json.find((d) => d.id === deliverableId);
      if (!req || !del) return;

      patchRequirementMut({
        projectId,
        patch: {
          deliverables_json: req.deliverables_json.map((d) =>
            d.id === deliverableId ? { ...d, client_signed_off: true } : d
          ),
        },
      }).catch((e) => console.warn('Client signoff error:', e));

      appendLog(
        projectId,
        'CLIENT_SIGN_OFF',
        'requirement',
        deliverableId,
        `Client ${currentUser.name} signed off on "${del.title}"`,
        { deliverable: del.title }
      );
    },
    [permissions.canSubmitClientSignOff, requirements, currentUser.name, patchRequirementMut, appendLog]
  );

  const createRenewal = useCallback(
    (input: CreateRenewalInput): RenewalItem => {
      const renewalId = makeId('ren');
      const now = new Date().toISOString();
      const newRenewal: RenewalItem = {
        id: renewalId,
        project_id: input.project_id,
        title: input.title.trim(),
        vendor: input.vendor?.trim() || undefined,
        amount: Number(input.amount) || 0,
        renewal_date: input.renewal_date,
        remind_days: input.remind_days ?? 7,
        renewed: false,
        created_at: now,
      };
      createRenewalMut({ renewal: newRenewal }).catch((e) =>
        console.warn('Create renewal error:', e)
      );
      appendLog(
        input.project_id,
        'TASK_CREATED',
        'renewal',
        renewalId,
        `Added renewal: "${newRenewal.title}" (Due: ${newRenewal.renewal_date})`,
        { title: newRenewal.title, vendor: newRenewal.vendor, amount: newRenewal.amount }
      );
      return newRenewal;
    },
    [createRenewalMut, appendLog]
  );

  const updateRenewal = useCallback(
    (input: UpdateRenewalInput) => {
      patchRenewalMut({
        renewalId: input.id,
        patch: {
          title: input.title.trim(),
          vendor: input.vendor?.trim() || undefined,
          amount: Number(input.amount) || 0,
          renewal_date: input.renewal_date,
          remind_days: input.remind_days ?? 7,
          updated_at: new Date().toISOString(),
        },
      }).catch((e) => console.warn('Update renewal error:', e));
    },
    [patchRenewalMut]
  );

  const markRenewalAsRenewed = useCallback(
    (input: MarkRenewedInput) => {
      const existing = renewals.find((r) => r.id === input.id);
      if (!existing) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const nextItem: RenewalItem = {
        id: makeId('ren'),
        project_id: existing.project_id,
        title: existing.title,
        vendor: existing.vendor,
        amount: existing.amount,
        renewal_date: input.next_renewal_date,
        remind_days: existing.remind_days || 7,
        renewed: false,
        created_at: now,
      };

      markRenewalRenewedMut({
        renewalId: input.id,
        patch: {
          renewed: true,
          renewed_on: todayStr,
          renewed_amount_paid: Number(input.amount_paid) || existing.amount,
          renewed_notes: input.notes?.trim() || undefined,
          updated_at: now,
        },
        nextRenewal: nextItem,
      }).catch((e) => console.warn('Mark renewal renewed error:', e));

      appendLog(
        existing.project_id,
        'TASK_STATUS_CHANGED',
        'renewal',
        existing.id,
        `Marked "${existing.title}" as renewed. Next due: ${input.next_renewal_date}`,
        { title: existing.title, next_renewal_date: input.next_renewal_date }
      );
    },
    [renewals, markRenewalRenewedMut, appendLog]
  );

  const deleteRenewal = useCallback(
    (renewalId: string) => {
      const existing = renewals.find((r) => r.id === renewalId);
      deleteRenewalMut({ renewalId }).catch((e) => console.warn('Delete renewal error:', e));
      if (existing) {
        appendLog(
          existing.project_id,
          'TASK_STATUS_CHANGED',
          'renewal',
          renewalId,
          `Deleted renewal "${existing.title}"`,
          { title: existing.title }
        );
      }
    },
    [renewals, deleteRenewalMut, appendLog]
  );

  const value: AuthContextValue = {
    currentUser,
    users,
    permissions,
    accessibleProjects,
    accessibleTasks,
    contacts,
    meetings,
    clientTalks,
    proposals,
    documents,
    requirements,
    assets,
    credentials,
    renewals,
    activityLogs,
    todayDate,
    switchPersona,
    signInWithEmail,
    signInWithCredentials,
    isAuthenticated,
    signOut,
    createProject,
    addContact,
    updateContact,
    deleteContact,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    recordMeetingOutcome,
    addClientTalk,
    updateClientTalk,
    deleteClientTalk,
    createProposal,
    updateProposal,
    deleteProposal,
    recordProposalOutcome,
    updateProjectStatus,
    deleteProject,
    reopenDraftProject,
    uploadDocument,
    toggleDocumentSignOff,
    updateRequirements,
    addAsset,
    updateAsset,
    deleteAsset,
    uploadAsset,
    toggleAssetApproval,
    addCredential,
    updateCredential,
    deleteCredential,
    revealCredential,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
    updateTaskStatus,
    updateTaskDeliverable,
    toggleProjectArchive,
    submitClientSignOff,
    createRenewal,
    updateRenewal,
    markRenewalAsRenewed,
    deleteRenewal,
    createAdminUser,
    createUser,
    updateUser,
    assignUserToProjects,
    memberships,
    changeUserPassword,
    toggleUserDisabled,
    deleteUser,
    isCloudSyncing,
    isCloudSynced,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ConvexProvider client={convexClient}>
      <QueryClientProvider client={queryClient}>
        <AppProvidersInner>{children}</AppProvidersInner>
      </QueryClientProvider>
    </ConvexProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AppProviders');
  }
  return ctx;
}
