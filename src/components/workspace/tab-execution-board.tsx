'use client';

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Columns3,
  GripVertical,
  Link2,
  List,
  Plus,
  ShieldBan,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/providers/app-providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getTaskDelayInfo } from '@/lib/rbac';
import { cn, formatDate } from '@/lib/utils';
import type { Project, TaskPriority, TaskStatus } from '@/types/agency';

const COLUMNS: TaskStatus[] = [
  'Backlog',
  'To Do',
  'In Progress',
  'Internal Review',
  'Done',
];

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const PRIORITY_BADGE: Record<
  TaskPriority,
  'secondary' | 'info' | 'warning' | 'danger'
> = {
  Low: 'secondary',
  Medium: 'info',
  High: 'warning',
  Critical: 'danger',
};

const newTaskSchema = z.object({
  title: z.string().min(3, 'Task title is required'),
  description: z.string().optional(),
  assignee_id: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Backlog', 'To Do', 'In Progress', 'Internal Review', 'Done']),
  due_date: z.string().min(1, 'Hard deadline is required'),
  blocked_by_task_id: z.string().optional(),
  linked_deliverable: z.string().optional(),
});

type NewTaskFormValues = z.infer<typeof newTaskSchema>;

export function TabExecutionBoard({ project }: { project: Project }) {
  const {
    currentUser,
    permissions,
    accessibleTasks,
    users,
    todayDate,
    createTask,
    updateTaskStatus,
    updateTaskDeliverable,
  } = useAuth();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showNewTask, setShowNewTask] = useState(false);
  const [editingLinkTaskId, setEditingLinkTaskId] = useState<string | null>(
    null
  );
  const [linkDraft, setLinkDraft] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const projectTasks = useMemo(
    () => accessibleTasks.filter((t) => t.project_id === project.id),
    [accessibleTasks, project.id]
  );

  const staffUsers = useMemo(
    () => users.filter((u) => u.role !== 'client'),
    [users]
  );

  const getTodayFormatted = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewTaskFormValues>({
    resolver: zodResolver(newTaskSchema),
    defaultValues: {
      priority: 'Medium',
      status: 'To Do',
      due_date: getTodayFormatted(),
      assignee_id: currentUser.role === 'admin' ? '' : currentUser.id,
    },
  });

  const canCreate = permissions.canManageTasks && !project.is_archived;
  const canUpdateStatus =
    permissions.canUpdateTaskStatus && !project.is_archived;

  const handleOpenNewTask = () => {
    reset({
      priority: 'Medium',
      status: 'To Do',
      due_date: getTodayFormatted(),
      title: '',
      description: '',
      assignee_id: currentUser.role === 'admin' ? '' : currentUser.id,
      blocked_by_task_id: '',
      linked_deliverable: '',
    });
    setShowNewTask(true);
  };

  const onCreateSubmit = (values: NewTaskFormValues) => {
    createTask({
      project_id: project.id,
      title: values.title,
      description: values.description ?? '',
      assignee_id: values.assignee_id || null,
      priority: values.priority,
      status: values.status,
      due_date: values.due_date,
      blocked_by_task_id: values.blocked_by_task_id || null,
      linked_deliverable: values.linked_deliverable || null,
    });
    reset({
      priority: 'Medium',
      status: 'To Do',
      due_date: getTodayFormatted(),
      assignee_id: currentUser.role === 'admin' ? '' : currentUser.id,
    });
    setShowNewTask(false);
  };

  const visibleColumns: TaskStatus[] =
    currentUser.role === 'client' ? ['Done'] : COLUMNS;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
              viewMode === 'kanban'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <Columns3 className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
              viewMode === 'list'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            )}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>

        {canCreate && (
          <Button size="sm" onClick={handleOpenNewTask}>
            <Plus className="h-3.5 w-3.5" /> New Task
          </Button>
        )}
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <Card className="border-zinc-300 bg-zinc-50/70">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between pb-3">
              <span className="text-xs font-semibold text-zinc-900">
                Create Execution Task
              </span>
              <button
                type="button"
                onClick={() => setShowNewTask(false)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit(onCreateSubmit)}
              className="grid gap-3 sm:grid-cols-3"
            >
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-zinc-700">
                  Task Title *
                </label>
                <Input
                  placeholder="e.g. Configure Stripe Webhook Handler"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-[11px] text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Hard Deadline *
                </label>
                <Input type="date" {...register('due_date')} />
              </div>

              {currentUser.role === 'admin' ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Assignee
                  </label>
                  <select
                    {...register('assignee_id')}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Assignee
                  </label>
                  <div className="flex h-9 w-full items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-700">
                    <span>{currentUser.name} (Assigned to you)</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Priority
                </label>
                <select
                  {...register('priority')}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Blocked By (Dependency)
                </label>
                <select
                  {...register('blocked_by_task_id')}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs"
                >
                  <option value="">None</option>
                  {projectTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-zinc-700">
                  Description
                </label>
                <Input
                  placeholder="Acceptance criteria & notes..."
                  {...register('description')}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">
                  Linked Deliverable
                </label>
                <Input
                  placeholder="e.g. Interactive Landing Page"
                  {...register('linked_deliverable')}
                />
              </div>

              <div className="sm:col-span-3 flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewTask(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Add Task
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div
          className={cn(
            'grid gap-3',
            visibleColumns.length === 1
              ? 'grid-cols-1 max-w-xl'
              : 'md:grid-cols-3 xl:grid-cols-5'
          )}
        >
          {visibleColumns.map((col) => {
            const colTasks = projectTasks.filter((t) => t.status === col);
            const isTargetCol = dragOverCol === col;
            return (
              <div
                key={col}
                onDragOver={(e) => {
                  if (!canUpdateStatus) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverCol !== col) {
                    setDragOverCol(col);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverCol === col) setDragOverCol(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const taskId =
                    e.dataTransfer.getData('text/plain') || draggedTaskId;
                  if (taskId && canUpdateStatus) {
                    updateTaskStatus(project.id, taskId, col);
                  }
                  setDraggedTaskId(null);
                }}
                className={cn(
                  'flex flex-col rounded-[12px] border p-2.5 min-h-[260px] transition-all',
                  isTargetCol
                    ? 'border-2 border-dashed border-[#4361ee] bg-[rgba(67,97,238,0.06)]'
                    : 'border-[#e5e7eb] bg-[#f9fafb]'
                )}
              >
                <div className="flex items-center justify-between pb-2.5 px-1">
                  <span className="text-[12.5px] font-semibold text-[#6b7280]">
                    {col}
                  </span>
                  <span className="bg-[#f3f4f6] text-[#9ca3af] text-[10px] font-bold px-2 py-0.5 rounded-[10px]">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {colTasks.map((task) => {
                    const delay = permissions.canViewInternalDelays
                      ? getTaskDelayInfo(task, todayDate)
                      : { isDelayed: false, daysOverdue: 0, isDueToday: false };
                    const assignee = users.find(
                      (u) => u.id === task.assignee_id
                    );
                    const blocker = task.blocked_by_task_id
                      ? projectTasks.find(
                          (b) => b.id === task.blocked_by_task_id
                        )
                      : null;
                    const isBeingDragged = draggedTaskId === task.id;
                    const isTaskOwner = currentUser.role === 'admin' || task.assignee_id === currentUser.id;
                    const canDragAndMove = canUpdateStatus && isTaskOwner;

                    return (
                      <div
                        key={task.id}
                        draggable={canDragAndMove}
                        onDragStart={(e) => {
                          if (!canDragAndMove) return;
                          e.dataTransfer.setData('text/plain', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDragOverCol(null);
                        }}
                        className={cn(
                          'rounded-[10px] border bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] space-y-2 transition-all',
                          canDragAndMove &&
                            'cursor-grab active:cursor-grabbing hover:border-[#4361ee] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
                          isBeingDragged &&
                            'opacity-40 scale-95 border-dashed border-[#4361ee]',
                          delay.isDelayed
                            ? 'border-[#fca5a5] bg-[#fef2f2]'
                            : 'border-[#e5e7eb]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1 min-w-0">
                            {canDragAndMove && (
                              <GripVertical className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#9ca3af]" />
                            )}
                            <span className="text-[13px] font-medium text-[#111827] leading-[1.4]">
                              {task.title}
                            </span>
                          </div>
                          <Badge variant={PRIORITY_BADGE[task.priority]}>
                            {task.priority}
                          </Badge>
                        </div>

                        {delay.isDelayed && (
                          <div className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            DELAYED · {delay.daysOverdue}d overdue
                          </div>
                        )}

                        {blocker && blocker.status !== 'Done' && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
                            <ShieldBan className="h-3 w-3 shrink-0" />
                            Blocked by: {blocker.title}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>{assignee?.name ?? 'Unassigned'}</span>
                          <span
                            className={cn(
                              delay.isDelayed && 'text-red-600 font-medium'
                            )}
                          >
                            {formatDate(task.due_date)}
                          </span>
                        </div>

                        {task.deliverable_url && (
                          <a
                            href={task.deliverable_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline truncate"
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            {task.deliverable_url}
                          </a>
                        )}

                        {canDragAndMove && (
                          <div className="pt-1 border-t border-zinc-100 flex items-center justify-between gap-1">
                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateTaskStatus(
                                  project.id,
                                  task.id,
                                  e.target.value as TaskStatus
                                )
                              }
                              className="h-7 flex-1 rounded border border-zinc-200 bg-zinc-50 px-1.5 text-[11px] text-zinc-800"
                            >
                              {COLUMNS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLinkTaskId(task.id);
                                setLinkDraft(task.deliverable_url ?? '');
                              }}
                              className="h-7 rounded border border-zinc-200 px-2 text-[10px] text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                              title="Attach PR / Figma / Deliverable URL"
                            >
                              Link
                            </button>
                          </div>
                        )}

                        {editingLinkTaskId === task.id && (
                          <div className="flex gap-1 pt-1">
                            <Input
                              value={linkDraft}
                              onChange={(e) => setLinkDraft(e.target.value)}
                              placeholder="https://github.com/..."
                              className="h-7 text-[11px]"
                            />
                            <Button
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => {
                                updateTaskDeliverable(
                                  project.id,
                                  task.id,
                                  linkDraft
                                );
                                setEditingLinkTaskId(null);
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 text-[11px] uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Task</th>
                  <th className="py-2 pr-4">Assignee</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Deadline</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {projectTasks.map((task) => {
                  const delay = permissions.canViewInternalDelays
                    ? getTaskDelayInfo(task, todayDate)
                    : { isDelayed: false, daysOverdue: 0, isDueToday: false };
                  const assignee = users.find((u) => u.id === task.assignee_id);
                  return (
                    <tr
                      key={task.id}
                      className={cn(delay.isDelayed && 'bg-red-50/40')}
                    >
                      <td className="py-2.5 pr-4 font-medium text-zinc-900">
                        <div>{task.title}</div>
                        {delay.isDelayed && (
                          <span className="text-[10px] font-semibold text-red-600">
                            DELAYED ({delay.daysOverdue}d overdue)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-600">
                        {assignee?.name ?? 'Unassigned'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={PRIORITY_BADGE[task.priority]}>
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-600">
                        {formatDate(task.due_date)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="secondary">{task.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
