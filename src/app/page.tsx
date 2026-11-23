'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  FolderKanban,
  FolderOpen,
  Globe,
  Layers,
  Lock,
  Megaphone,
  Plus,
  RotateCcw,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { NewProjectModal } from '@/components/projects/new-project-modal';
import { useAuth } from '@/components/providers/app-providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTaskDelayInfo } from '@/lib/rbac';
import { cn, formatDate } from '@/lib/utils';
import { getProjectSimpleStatus, type ProjectStatus, type ProjectType, type SimpleProjectStatus } from '@/types/agency';

const PROJECT_TYPES: Array<'All' | ProjectType> = [
  'All',
  'Website',
  'Web App',
  'Mobile App',
  'Digital Marketing',
];

const TYPE_ICON: Record<ProjectType, React.ReactNode> = {
  Website: <Globe className="h-4 w-4 text-[#4361ee]" />,
  'Web App': <Layers className="h-4 w-4 text-[#8b5cf6]" />,
  'Mobile App': <Smartphone className="h-4 w-4 text-[#10b981]" />,
  'Digital Marketing': <Megaphone className="h-4 w-4 text-[#f59e0b]" />,
};

function NewProjectUrlModal({
  manualOpen,
  onCloseManual,
}: {
  manualOpen: boolean;
  onCloseManual: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlOpen = searchParams.get('newProject') === '1';

  return (
    <NewProjectModal
      open={manualOpen || urlOpen}
      onClose={() => {
        onCloseManual();
        if (urlOpen) {
          router.replace('/');
        }
      }}
    />
  );
}

export default function DashboardPage() {
  const { currentUser, permissions, accessibleProjects, accessibleTasks, renewals, todayDate } =
    useAuth();
  const [typeFilter, setTypeFilter] = useState<'All' | ProjectType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | SimpleProjectStatus>('All');
  const [newModalOpen, setNewModalOpen] = useState(false);

  const isAdmin = currentUser.role === 'admin';

  // Active projects for Admins; Inactive & Completed are in Drafts
  const activeProjectsList = useMemo(() => {
    return accessibleProjects.filter((p) => getProjectSimpleStatus(p) === 'Active');
  }, [accessibleProjects]);

  const draftsCount = useMemo(() => {
    return accessibleProjects.filter((p) => getProjectSimpleStatus(p) !== 'Active').length;
  }, [accessibleProjects]);

  const metrics = useMemo(() => {
    let dueToday = 0;
    let overdue = 0;
    let completedTasks = 0;
    for (const task of accessibleTasks) {
      if (task.status === 'Done') {
        completedTasks += 1;
      }
      const info = getTaskDelayInfo(task, todayDate);
      if (info.isDueToday) dueToday += 1;
      if (info.isDelayed) overdue += 1;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcomingRenewals = renewals.filter((r) => {
      if (r.renewed) return false;
      const d = new Date(r.renewal_date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }).length;

    const overdueRenewals = renewals.filter((r) => {
      if (r.renewed) return false;
      const d = new Date(r.renewal_date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff < 0;
    }).length;

    return {
      activeProjectsCount: activeProjectsList.length,
      totalAssignedProjects: accessibleProjects.length,
      completedTasks,
      draftsCount,
      dueToday,
      overdue,
      upcomingRenewals,
      overdueRenewals,
    };
  }, [activeProjectsList.length, accessibleProjects.length, draftsCount, accessibleTasks, todayDate, renewals]);

  const filteredProjects = useMemo(() => {
    if (isAdmin) {
      return activeProjectsList.filter((p) => {
        if (typeFilter !== 'All' && p.project_type !== typeFilter) return false;
        return true;
      });
    }
    // Employees see ALL their assigned projects (Active, Inactive, Completed)
    return accessibleProjects.filter((p) => {
      if (typeFilter !== 'All' && p.project_type !== typeFilter) return false;
      if (statusFilter !== 'All' && getProjectSimpleStatus(p) !== statusFilter) return false;
      return true;
    });
  }, [isAdmin, activeProjectsList, accessibleProjects, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header Row: Title (20px / 700) + Subtitle (13px) + Action Buttons */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#111827] tracking-tight">
            {currentUser.role === 'client'
              ? `Welcome back, ${currentUser.name}`
              : 'HolaBusiness Dashboard'}
          </h1>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            {currentUser.role === 'client'
              ? 'Client portal for inspecting project milestones and approved deliverables.'
              : 'Live operational health across active projects. Inactive & completed projects are in Drafts.'}
          </p>
        </div>
        {permissions.canCreateProject && (
          <Button
            onClick={() => setNewModalOpen(true)}
            className="h-[36px] px-4 rounded-[8px] bg-[#4361ee] hover:bg-[#3451d1] text-white shadow-[0_2px_6px_rgba(67,97,238,0.25)] text-[13px] font-medium gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      <Suspense fallback={null}>
        <NewProjectUrlModal
          manualOpen={newModalOpen}
          onCloseManual={() => setNewModalOpen(false)}
        />
      </Suspense>

      {/* 2. Stat Cards (Dashboard): 4 across, radius 14px, padding 18px 16px */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stat 1: Projects */}
        <div className="rounded-[14px] p-[18px_16px] bg-[#eef0fd] flex items-start justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <div>
            <div className="text-[13px] font-semibold text-[#4361ee]">
              {isAdmin ? 'Active Projects' : 'Assigned Projects'}
            </div>
            <div className="text-[32px] font-bold text-[#111827] leading-none my-1.5">
              {isAdmin ? metrics.activeProjectsCount : metrics.totalAssignedProjects}
            </div>
            <div className="text-[12px] text-[#6b7280]">
              {isAdmin ? 'In active execution' : `${metrics.activeProjectsCount} currently active`}
            </div>
          </div>
          <div className="w-[46px] h-[46px] rounded-[12px] bg-[rgba(67,97,238,0.13)] text-[#4361ee] flex items-center justify-center shrink-0">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        {/* Stat 2: Task Deadlines */}
        <div className="rounded-[14px] p-[18px_16px] bg-[#fff4e6] flex items-start justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <div>
            <div className="text-[13px] font-semibold text-[#c2410c]">Task Deadlines</div>
            <div className="text-[32px] font-bold text-[#111827] leading-none my-1.5">
              {metrics.overdue}
            </div>
            <div className="text-[12px] text-[#6b7280]">
              {metrics.dueToday} task(s) due today
            </div>
          </div>
          <div className="w-[46px] h-[46px] rounded-[12px] bg-[rgba(245,158,11,0.15)] text-[#d97706] flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        {/* Stat 3: Renewals (Admin) or Completed Tasks (Employee) */}
        {isAdmin ? (
          <div className="rounded-[14px] p-[18px_16px] bg-[#edfcf3] flex items-start justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-[#059669]">Upcoming Renewals</div>
              <div className="text-[32px] font-bold text-[#111827] leading-none my-1.5">
                {metrics.upcomingRenewals}
              </div>
              <div className="text-[12px] text-[#6b7280]">
                Due in next 7 days{metrics.overdueRenewals > 0 ? ` · ${metrics.overdueRenewals} overdue` : ''}
              </div>
            </div>
            <div className="w-[46px] h-[46px] rounded-[12px] bg-[rgba(16,185,129,0.15)] text-[#10b981] flex items-center justify-center shrink-0">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
        ) : (
          <div className="rounded-[14px] p-[18px_16px] bg-[#edfcf3] flex items-start justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-[#059669]">Completed Tasks</div>
              <div className="text-[32px] font-bold text-[#111827] leading-none my-1.5">
                {metrics.completedTasks}
              </div>
              <div className="text-[12px] text-[#6b7280]">
                Across assigned workspaces
              </div>
            </div>
            <div className="w-[46px] h-[46px] rounded-[12px] bg-[rgba(16,185,129,0.15)] text-[#10b981] flex items-center justify-center shrink-0">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* Stat 4: Drafts (Admin) or Total Accessible Tasks (Employee) */}
        {isAdmin ? (
          <Link href="/drafts" className="block group">
            <div className="rounded-[14px] p-[18px_16px] bg-[#eef4ff] flex items-start justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all cursor-pointer">
              <div>
                <div className="text-[13px] font-semibold text-[#1d4ed8]">Drafts &amp; Archives</div>
                <div className="text-[32px] font-bold text-[#111827] leading-none my-1.5">
                  {metrics.draftsCount}
                </div>
                <div className="text-[12px] text-[#6b7280]">
                  Stored separately →
                </div>
              </div>
              <div className="w-[46px] h-[46px] rounded-[12px] bg-[rgba(37,99,235,0.12)] text-[#2563eb] flex items-center justify-center shrink-0">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-[14px] p-[18px_16px] bg-[#eef4ff] flex items-start justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-[#1d4ed8]">Total Work Items</div>
              <div className="text-[32px] font-bold text-[#111827] leading-none my-1.5">
                {accessibleTasks.length}
              </div>
              <div className="text-[12px] text-[#6b7280]">
                Tasks on Kanban boards
              </div>
            </div>
            <div className="w-[46px] h-[46px] rounded-[12px] bg-[rgba(37,99,235,0.12)] text-[#2563eb] flex items-center justify-center shrink-0">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>

      {/* 3. Tinted Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-[12px] bg-gradient-to-r from-[#eef0fd] to-[#e8f0fe] border border-[rgba(67,97,238,0.18)] px-4 py-3 text-[12px] text-[#111827]">
        <span className="font-medium">
          {isAdmin ? (
            <>
              Showing <strong>{filteredProjects.length} Active Projects</strong>. Inactive and completed client projects are safely stored in Drafts.
            </>
          ) : (
            <>
              Showing <strong>{filteredProjects.length} Assigned Project(s)</strong>. You have access to collaborate and finish tasks across these workspaces.
            </>
          )}
        </span>
        {isAdmin && (
          <Link
            href="/drafts"
            className="font-semibold text-[#4361ee] hover:underline flex items-center gap-1 shrink-0"
          >
            View Drafts ({metrics.draftsCount}) →
          </Link>
        )}
      </div>

      {/* 4. Projects Directory */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-[#111827]">
              {isAdmin ? 'Active Projects Directory' : 'Assigned Projects'}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[20px] text-[11px] font-medium bg-[#f3f4f6] text-[#4b5563]">
              {filteredProjects.length} Projects
            </span>
          </div>

          {/* Filter Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isAdmin && (
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'All' | SimpleProjectStatus)
                }
                className="h-[32px] rounded-[7px] border border-[#e5e7eb] bg-white px-2.5 text-[12.5px] text-[#111827] focus:border-[#4361ee] focus:outline-none cursor-pointer"
                aria-label="Filter by project status"
              >
                <option value="All">Status: All</option>
                <option value="Active">Status: Active</option>
                <option value="Inactive">Status: Inactive</option>
                <option value="Completed">Status: Completed</option>
              </select>
            )}

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as 'All' | ProjectType)
              }
              className="h-[32px] rounded-[7px] border border-[#e5e7eb] bg-white px-2.5 text-[12.5px] text-[#111827] focus:border-[#4361ee] focus:outline-none cursor-pointer"
              aria-label="Filter by project type"
            >
              {PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  Type: {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const simpleStatus = getProjectSimpleStatus(project);
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block"
              >
                <div className="h-full rounded-[12px] bg-white border border-[#e5e7eb] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {TYPE_ICON[project.project_type]}
                      <span className="text-[11px] font-semibold text-[#6b7280]">
                        {project.project_type}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-[20px] text-[11px] font-semibold',
                        simpleStatus === 'Active'
                          ? 'bg-[#d1fae5] text-[#065f46]'
                          : simpleStatus === 'Inactive'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      )}
                    >
                      ● {simpleStatus}
                    </span>
                  </div>

                  <h3 className="text-[15px] font-bold text-[#111827] group-hover:text-[#4361ee] transition-colors flex items-center justify-between">
                    <span className="truncate">{project.title}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9ca3af] group-hover:text-[#4361ee] transition-colors" />
                  </h3>

                  <div className="text-[12px] text-[#6b7280] mt-1.5">
                    Client: <span className="font-semibold text-[#111827]">{project.client_name}</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#e5e7eb] flex items-center justify-between text-[11px] text-[#9ca3af]">
                    <span>Stage: <strong className="text-[#111827] font-semibold">{project.status}</strong></span>
                    <span>Target: {formatDate(project.target_end_date)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
