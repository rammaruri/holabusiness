import type { Project, Task, User } from '@/types/agency';

export const DEMO_USERS: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Ram Maruri',
    email: 'ram@holabusiness.in',
    role: 'admin',
    is_main_admin: true,
    title: 'Primary Founder & Managing Partner',
    password: 'admin123',
    created_at: '2025-01-10T09:00:00Z',
  },
];

export const INITIAL_SHELL_PROJECTS: Project[] = [
  // 1. Active Website Project
  {
    id: 'proj-aurora-web',
    title: 'Aurora Labs Marketing Site',
    client_name: 'Aurora Labs',
    project_type: 'Website',
    status: 'In Execution',
    start_date: '2026-10-01',
    target_end_date: '2026-11-25',
    actual_end_date: null,
    is_archived: false,
    created_by: 'usr-admin-1',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-11-10T14:30:00Z',
  },
  // 2. Active Web App Project
  {
    id: 'proj-veridian-app',
    title: 'Veridian FinTech Portal',
    client_name: 'Veridian Capital',
    project_type: 'Web App',
    status: 'QA & Handover',
    start_date: '2026-08-15',
    target_end_date: '2026-11-14',
    actual_end_date: null,
    is_archived: false,
    created_by: 'usr-admin-1',
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-11-11T16:00:00Z',
  },
  // 3. Maintenance Retainer Marketing Project
  {
    id: 'proj-kestrel-growth',
    title: 'Kestrel Q4 Paid Acquisition',
    client_name: 'Kestrel Mobility',
    project_type: 'Digital Marketing',
    status: 'Maintenance',
    start_date: '2026-07-01',
    target_end_date: '2026-12-31',
    actual_end_date: null,
    is_archived: false,
    created_by: 'usr-pm-1',
    created_at: '2026-07-01T08:00:00Z',
    updated_at: '2026-11-09T11:20:00Z',
  },
  // 4. Pre-Sales Discovery / Proposal Project
  {
    id: 'proj-solaris-health',
    title: 'Solaris Patient Telemetry Portal',
    client_name: 'Solaris Health Tech',
    project_type: 'Web App',
    status: 'Proposal Review',
    start_date: '2026-11-08',
    target_end_date: '2027-02-28',
    actual_end_date: null,
    is_archived: false,
    created_by: 'usr-pm-1',
    created_at: '2026-11-08T09:30:00Z',
    updated_at: '2026-11-12T10:00:00Z',
  },
  // 5. Drafts / Remainder / On-Hold Project
  {
    id: 'proj-vortex-cloud',
    title: 'Vortex Cloud FinOps Portal',
    client_name: 'Vortex Cloud Inc.',
    project_type: 'Web App',
    status: 'Draft / On Hold',
    start_date: '2026-09-01',
    target_end_date: '2027-03-31',
    actual_end_date: null,
    is_archived: false,
    draft_reason: 'Client Q3 budget postponed to Q1 2027. Remainder follow-up scheduled.',
    draft_source_stage: 'meeting',
    remainder_next_date: '2027-01-15',
    created_by: 'usr-pm-1',
    created_at: '2026-09-01T14:00:00Z',
    updated_at: '2026-09-14T10:00:00Z',
  },
];

export const DEMO_PROJECT_MEMBERSHIPS: Record<string, string[]> = {
  'usr-admin-1': [
    'proj-aurora-web',
    'proj-veridian-app',
    'proj-kestrel-growth',
    'proj-solaris-health',
    'proj-vortex-cloud',
  ],
};
