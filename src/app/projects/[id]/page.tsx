'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronDown,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  FolderKanban,
  History,
  Kanban,
  KeyRound,
  Lock,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/providers/app-providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TabAssetRepository } from '@/components/workspace/tab-asset-repository';
import { TabAuditTimeline } from '@/components/workspace/tab-audit-timeline';
import { TabClientTalk } from '@/components/workspace/tab-client-talk';
import { TabContactsManager } from '@/components/workspace/tab-contacts-manager';
import { TabCredentialVault } from '@/components/workspace/tab-credential-vault';
import { TabDocuments } from '@/components/workspace/tab-documents';
import { TabExecutionBoard } from '@/components/workspace/tab-execution-board';
import { TabMeetingsPreSales } from '@/components/workspace/tab-meetings-presales';
import { TabOverviewScope } from '@/components/workspace/tab-overview-scope';
import { TabProposalBuilder } from '@/components/workspace/tab-proposal-builder';
import { TabRenewals } from '@/components/workspace/tab-renewals';
import { TabTeamContributions } from '@/components/workspace/tab-team-contributions';
import { cn, formatDate } from '@/lib/utils';
import { getProjectSimpleStatus, type ProjectStatus } from '@/types/agency';

type WorkspaceTab =
  | 'overview'
  | 'contacts'
  | 'meetings'
  | 'talks'
  | 'proposals'
  | 'documents'
  | 'assets'
  | 'vault'
  | 'renewals'
  | 'board'
  | 'contributions'
  | 'audit';

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { accessibleProjects, currentUser, permissions, renewals, updateProjectStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() =>
    currentUser.role === 'admin' ? 'overview' : 'board'
  );

  const project = accessibleProjects.find(
    (p) =>
      p.id === params.id ||
      p.id.toLowerCase() === params.id.toLowerCase() ||
      p.id.replace(/^proj-/, '').toLowerCase() === params.id.toLowerCase() ||
      p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === params.id.toLowerCase()
  );

  const projectUpcomingRenewals = useMemo(() => {
    if (!project) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return renewals.filter((r) => {
      if (r.project_id !== project.id || r.renewed) return false;
      const target = new Date(r.renewal_date);
      target.setHours(0, 0, 0, 0);
      const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 7;
    }).length;
  }, [renewals, project]);

  const tabs = useMemo(() => {
    const isClient = currentUser.role === 'client';
    const isAdmin = currentUser.role === 'admin';

    const allTabs: Array<{
      id: WorkspaceTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      visible: boolean;
      badge?: string;
    }> = [
      {
        id: 'board',
        label: isClient ? 'Approved Deliverables' : 'Execution Kanban Board',
        icon: Kanban,
        visible: true,
      },
      {
        id: 'overview',
        label: 'Overview & Scope',
        icon: FileText,
        visible: true,
      },
      {
        id: 'assets',
        label: 'Asset Repository',
        icon: FolderArchive,
        visible: true,
      },
      {
        id: 'contacts',
        label: 'Contacts',
        icon: Users,
        visible: true,
      },
      {
        id: 'meetings',
        label: 'Meetings',
        icon: MessageSquare,
        visible: isAdmin,
      },
      {
        id: 'talks',
        label: 'Client Talk',
        icon: MessageCircle,
        visible: isAdmin,
      },
      {
        id: 'proposals',
        label: 'Proposals',
        icon: FileSpreadsheet,
        visible: isAdmin,
      },
      {
        id: 'vault',
        label: 'Credential Vault',
        icon: KeyRound,
        visible: permissions.canViewCredentials,
      },
      {
        id: 'renewals',
        label: 'Renewals',
        icon: RotateCcw,
        visible: isAdmin,
        badge: projectUpcomingRenewals > 0 ? String(projectUpcomingRenewals) : undefined,
      },
    ];
    return allTabs.filter((t) => t.visible);
  }, [permissions.canViewCredentials, currentUser.role, projectUpcomingRenewals]);

  if (!project) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="pt-6 space-y-2">
            <ShieldAlert className="mx-auto h-8 w-8 text-red-600" />
            <h2 className="text-sm font-semibold text-red-900">
              Project Not Found or Access Denied
            </h2>
            <p className="text-xs text-red-700">
              You do not have permission to view this project under your current
              RBAC role.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resolvedTab = tabs.some((t) => t.id === activeTab)
    ? activeTab
    : 'overview';

  const simpleStatus = getProjectSimpleStatus(project);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[1500px] space-y-5">
      {/* Project Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FolderKanban className="h-4 w-4 text-zinc-500" />
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              {project.title}
            </h1>
            <Badge variant="outline">{project.project_type}</Badge>
            {currentUser.role === 'admin' ? (
              <div className="relative inline-flex items-center">
                <select
                  value={simpleStatus}
                  onChange={(e) =>
                    updateProjectStatus(
                      project.id,
                      e.target.value as ProjectStatus
                    )
                  }
                  className={cn(
                    'h-6 rounded-full border px-2.5 pr-6 text-xs font-semibold cursor-pointer transition-colors appearance-none focus:outline-none focus:ring-1 focus:ring-zinc-900',
                    simpleStatus === 'Active'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : simpleStatus === 'Inactive'
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                  )}
                  aria-label="Project Status"
                >
                  <option value="Active">● Active</option>
                  <option value="Inactive">● Inactive</option>
                  <option value="Completed">● Completed</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-zinc-500" />
              </div>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center h-6 rounded-full border px-2.5 text-xs font-semibold select-none',
                  simpleStatus === 'Active'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : simpleStatus === 'Inactive'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-blue-300 bg-blue-50 text-blue-800'
                )}
                title="Project status managed by Administrators"
              >
                ● {simpleStatus}
              </span>
            )}
            {project.is_archived && simpleStatus !== 'Completed' && (
              <Badge variant="secondary">
                <Lock className="h-3 w-3" /> Read-Only Archive
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Client: <strong className="text-zinc-700">{project.client_name}</strong>{' '}
            · Start: {formatDate(project.start_date)} · Target Delivery:{' '}
            {formatDate(project.target_end_date)}
            {project.draft_reason && (
              <span className="ml-2 text-violet-700 font-medium">
                (Draft Note: {project.draft_reason})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Navigation Tab Bar (Segmented Control Pill Container) */}
      <div className="flex items-center gap-1 overflow-x-auto bg-[#f3f4f6] p-[3px] rounded-[9px] w-fit max-w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = resolvedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium transition-all cursor-pointer',
                isActive
                  ? 'bg-white text-[#4361ee] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                  : 'text-[#6b7280] hover:text-[#111827] hover:bg-white/60'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 rounded-[10px] bg-[#ef4444] text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div>
        {resolvedTab === 'overview' && <TabOverviewScope project={project} />}
        {resolvedTab === 'contacts' && <TabContactsManager project={project} />}
        {resolvedTab === 'meetings' && <TabMeetingsPreSales project={project} />}
        {resolvedTab === 'talks' && <TabClientTalk project={project} />}
        {resolvedTab === 'proposals' && <TabProposalBuilder project={project} />}
        {resolvedTab === 'documents' && <TabDocuments project={project} />}
        {resolvedTab === 'assets' && <TabAssetRepository project={project} />}
        {resolvedTab === 'vault' && <TabCredentialVault project={project} />}
        {resolvedTab === 'renewals' && <TabRenewals project={project} />}
        {resolvedTab === 'board' && <TabExecutionBoard project={project} />}
      </div>
    </div>
  );
}
