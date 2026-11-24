'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  Columns3,
  GripVertical,
  Link2,
  List,
  MoreVertical,
  Pencil,
  Plus,
  ShieldBan,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/providers/app-providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { getTaskDelayInfo } from '@/lib/rbac';
import { cn, formatDate } from '@/lib/utils';
import type { Project, Task, TaskPriority, TaskStatus } from '@/types/agency';

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
    updateTask,
    deleteTask,
    reorderTasks,
    updateTaskStatus,
    updateTaskDeliverable,
  } = useAuth();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showNewTask, setShowNewTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [menuOpenTaskId, setMenuOpenTaskId] = useState<string | null>(null);
  const [editingLinkTaskId, setEditingLinkTaskId] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Close 3-dot menu when clicking anywhere outside
  useEffect(() => {
    if (!menuOpenTaskId) return;
    const handleClick = () => setMenuOpenTaskId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [menuOpenTaskId]);

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

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<NewTaskFormValues>({
    resolver: zodResolver(newTaskSchema),
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

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setMenuOpenTaskId(null);
    resetEdit({
      title: task.title,
      description: task.description || '',
      assignee_id: task.assignee_id || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      blocked_by_task_id: task.blocked_by_task_id || '',
      linked_deliverable: task.linked_deliverable || '',
    });
  };

  const onEditSubmit = (values: NewTaskFormValues) => {
    if (!editingTask) return;
    updateTask(project.id, editingTask.id, {
      title: values.title,
      description: values.description ?? '',
      assignee_id: values.assignee_id || null,
      priority: values.priority,
      status: values.status || editingTask.status,
      due_date: values.due_date,
      blocked_by_task_id: values.blocked_by_task_id || null,
      linked_deliverable: values.linked_deliverable || null,
    });
    setEditingTask(null);
  };

  const handleDeleteTask = (task: Task) => {
    deleteTask(project.id, task.id);
    setDeletingTask(null);
    setMenuOpenTaskId(null);
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
            const isTargetCol = dragOverCol === col && !dragOverTaskId;
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
                  const sourceId =
                    e.dataTransfer.getData('text/plain') || draggedTaskId;
                  if (sourceId && canUpdateStatus) {
                    reorderTasks(project.id, sourceId, null, col);
                  }
                  setDraggedTaskId(null);
                  setDragOverTaskId(null);
                  setDragOverCol(null);
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
                    const isDropTarget = dragOverTaskId === task.id;
                    const isTaskOwner =
                      currentUser.role === 'admin' ||
                      task.assignee_id === currentUser.id;
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
                          setDragOverTaskId(null);
                          setDragOverCol(null);
                        }}
                        onDragOver={(e) => {
                          if (!canDragAndMove) return;
                          if (!draggedTaskId || draggedTaskId === task.id) return;
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverTaskId !== task.id) {
                            setDragOverTaskId(task.id);
                          }
                          if (dragOverCol !== col) {
                            setDragOverCol(col);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (dragOverTaskId === task.id) {
                            setDragOverTaskId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const sourceId =
                            e.dataTransfer.getData('text/plain') || draggedTaskId;
                          if (sourceId && sourceId !== task.id && canUpdateStatus) {
                            reorderTasks(project.id, sourceId, task.id, col);
                          }
                          setDraggedTaskId(null);
                          setDragOverTaskId(null);
                          setDragOverCol(null);
                        }}
                        className={cn(
                          'rounded-[10px] border bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] space-y-2 transition-all relative',
                          canDragAndMove &&
                            'cursor-grab active:cursor-grabbing hover:border-[#4361ee] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5',
                          isBeingDragged &&
                            'opacity-40 scale-95 border-dashed border-[#4361ee]',
                          isDropTarget &&
                            'border-t-4 border-t-[#4361ee] bg-[#eff3ff] shadow-[0_4px_16px_rgba(67,97,238,0.15)] -translate-y-1',
                          delay.isDelayed
                            ? 'border-[#fca5a5] bg-[#fef2f2]'
                            : 'border-[#e5e7eb]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1 min-w-0 flex-1">
                            {canDragAndMove && (
                              <GripVertical className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#9ca3af]" />
                            )}
                            <span className="text-[13px] font-medium text-[#111827] leading-[1.4] break-words">
                              {task.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant={PRIORITY_BADGE[task.priority]}>
                              {task.priority}
                            </Badge>

                            {/* Three-Dot Menu */}
                            {isTaskOwner && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenTaskId(
                                      menuOpenTaskId === task.id ? null : task.id
                                    );
                                  }}
                                  className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                                  title="Task actions"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>

                                {menuOpenTaskId === task.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-7 z-30 w-36 rounded-[10px] border border-[#e5e7eb] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)] animate-drop-in text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => openEditTaskModal(task)}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-zinc-500" />
                                      <span>Edit Task</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingLinkTaskId(task.id);
                                        setLinkDraft(task.deliverable_url ?? '');
                                        setMenuOpenTaskId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                                    >
                                      <Link2 className="h-3.5 w-3.5 text-zinc-500" />
                                      <span>Attach Link</span>
                                    </button>

                                    <div className="my-1 border-t border-zinc-100" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeletingTask(task);
                                        setMenuOpenTaskId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                      <span>Delete Task</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-[11.5px] text-zinc-500 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

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

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{assignee?.name ?? 'Unassigned'}</span>
                            {Boolean(task.is_edited) && (
                              <span
                                className="text-[10px] text-zinc-400 font-normal italic shrink-0"
                                title={`Last edited: ${formatDate(task.updated_at)}`}
                              >
                                (edited)
                              </span>
                            )}
                          </div>
                          <span
                            className={cn(
                              delay.isDelayed && 'text-red-600 font-medium shrink-0'
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
                            className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline truncate pt-0.5"
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{task.deliverable_url}</span>
                          </a>
                        )}

                        {editingLinkTaskId === task.id && (
                          <div className="flex gap-1 pt-1.5 border-t border-zinc-100">
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
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-1.5 text-[11px]"
                              onClick={() => setEditingLinkTaskId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
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
                  <th className="py-2 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {projectTasks.map((task) => {
                  const delay = permissions.canViewInternalDelays
                    ? getTaskDelayInfo(task, todayDate)
                    : { isDelayed: false, daysOverdue: 0, isDueToday: false };
                  const assignee = users.find((u) => u.id === task.assignee_id);
                  const isTaskOwner =
                    currentUser.role === 'admin' ||
                    task.assignee_id === currentUser.id;

                  return (
                    <tr
                      key={task.id}
                      className={cn(delay.isDelayed && 'bg-red-50/40')}
                    >
                      <td className="py-2.5 pr-4 font-medium text-zinc-900">
                        <div className="flex items-center gap-1.5">
                          <span>{task.title}</span>
                          {Boolean(task.is_edited) && (
                            <span
                              className="text-[10px] text-zinc-400 font-normal italic"
                              title={`Last edited: ${formatDate(task.updated_at)}`}
                            >
                              (edited)
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-zinc-400 font-normal truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
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
                      <td className="py-2.5 pr-2 text-right">
                        {isTaskOwner && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditTaskModal(task)}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                              title="Edit Task"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTask(task)}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Edit Task Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Execution Task"
        maxWidth="max-w-[560px]"
      >
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Task Title *</label>
            <Input
              placeholder="e.g. Configure Stripe Webhook Handler"
              {...registerEdit('title')}
            />
            {errorsEdit.title && (
              <p className="text-[11px] text-red-600">{errorsEdit.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Hard Deadline *</label>
              <Input type="date" {...registerEdit('due_date')} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Priority</label>
              <select
                {...registerEdit('priority')}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Assignee</label>
            {currentUser.role === 'admin' ? (
              <select
                {...registerEdit('assignee_id')}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800"
              >
                <option value="">Unassigned</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex h-9 w-full items-center rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-700">
                <span>{currentUser.name} (Assigned to you)</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Blocked By (Dependency)</label>
            <select
              {...registerEdit('blocked_by_task_id')}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-xs"
            >
              <option value="">None</option>
              {projectTasks
                .filter((t) => !editingTask || t.id !== editingTask.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Description</label>
            <textarea
              rows={3}
              placeholder="Acceptance criteria & notes..."
              className="w-full rounded-md border border-zinc-200 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
              {...registerEdit('description')}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700">Linked Deliverable</label>
            <Input
              placeholder="e.g. Interactive Landing Page"
              {...registerEdit('linked_deliverable')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditingTask(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Task Confirmation Modal */}
      <Modal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        title="Delete Execution Task"
        maxWidth="max-w-[420px]"
      >
        <div className="space-y-4 pt-1">
          <p className="text-[13px] text-zinc-600 leading-normal">
            Are you sure you want to delete <span className="font-semibold text-zinc-900">"{deletingTask?.title}"</span>? This will permanently remove the task and clear any blockers depending on it.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDeletingTask(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletingTask && handleDeleteTask(deletingTask)}
            >
              Delete Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
