import type { Project, RolePermissions, Task, UserRole } from '@/types/agency';

const ADMIN_PERMISSIONS: RolePermissions = {
  canCreateProject: true,
  canEditScope: true,
  canManageTasks: true,
  canUpdateTaskStatus: true,
  canUploadAssets: true,
  canViewCredentials: true,
  canManageCredentials: true,
  canRevealCredentials: true,
  canViewInternalDelays: true,
  canViewAuditLogs: true,
  canToggleArchive: true,
  canManageUsers: true,
  canSubmitClientSignOff: false,
  canManageMeetingsAndProposals: true,
};

const EMPLOYEE_PERMISSIONS: RolePermissions = {
  canCreateProject: false,
  canEditScope: false,
  canManageTasks: true,
  canUpdateTaskStatus: true,
  canUploadAssets: true,
  canViewCredentials: false,
  canManageCredentials: false,
  canRevealCredentials: false,
  canViewInternalDelays: true,
  canViewAuditLogs: false,
  canToggleArchive: false,
  canManageUsers: false,
  canSubmitClientSignOff: false,
  canManageMeetingsAndProposals: false,
};

const CLIENT_PERMISSIONS: RolePermissions = {
  canCreateProject: false,
  canEditScope: false,
  canManageTasks: false,
  canUpdateTaskStatus: false,
  canUploadAssets: false,
  canViewCredentials: false,
  canManageCredentials: false,
  canRevealCredentials: false,
  canViewInternalDelays: false,
  canViewAuditLogs: false,
  canToggleArchive: false,
  canManageUsers: false,
  canSubmitClientSignOff: true,
  canManageMeetingsAndProposals: false,
};

const PERMISSION_MATRIX: Record<UserRole, RolePermissions> = {
  admin: ADMIN_PERMISSIONS,
  pm: ADMIN_PERMISSIONS,
  member: EMPLOYEE_PERMISSIONS,
  client: CLIENT_PERMISSIONS,
};

export function getPermissions(
  role: UserRole,
  user?: { is_main_admin?: boolean; role?: UserRole }
): RolePermissions {
  const base = PERMISSION_MATRIX[role] || EMPLOYEE_PERMISSIONS;
  return {
    ...base,
    canManageUsers: role === 'admin' && Boolean(user?.is_main_admin ?? true),
  };
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (role !== 'admin' && pathname.startsWith('/team')) {
    return false;
  }
  return true;
}

export function canMutateProject(role: UserRole, project?: Project): boolean {
  if (!project) return false;
  return !project.is_archived;
}

export interface TaskDelayInfo {
  isDelayed: boolean;
  daysOverdue: number;
  isDueToday: boolean;
}

/**
 * Automated Delay Detection:
 * If Current Date > Hard Deadline and status !== 'Done', flag as DELAYED
 * and calculate days overdue.
 */
export function getTaskDelayInfo(
  task: Pick<Task, 'due_date' | 'status' | 'completed_at'>,
  referenceDate: Date | null
): TaskDelayInfo {
  if (!referenceDate) {
    return { isDelayed: false, daysOverdue: 0, isDueToday: false };
  }
  const todayStr = referenceDate.toISOString().slice(0, 10);
  const dueStr = task.due_date.slice(0, 10);

  if (task.status === 'Done') {
    if (task.completed_at) {
      const completedStr = task.completed_at.slice(0, 10);
      const diff = diffDays(dueStr, completedStr);
      return {
        isDelayed: diff > 0,
        daysOverdue: Math.max(0, diff),
        isDueToday: false,
      };
    }
    return { isDelayed: false, daysOverdue: 0, isDueToday: false };
  }

  const daysOverdue = diffDays(dueStr, todayStr);
  return {
    isDelayed: daysOverdue > 0,
    daysOverdue: Math.max(0, daysOverdue),
    isDueToday: daysOverdue === 0,
  };
}

function diffDays(fromYmd: string, toYmd: string): number {
  const from = new Date(`${fromYmd}T00:00:00Z`).getTime();
  const to = new Date(`${toYmd}T00:00:00Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}
