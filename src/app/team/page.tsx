'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  Eye,
  EyeOff,
  FolderKanban,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/providers/app-providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ROLE_LABELS, type User, type UserRole, getProjectSimpleStatus } from '@/types/agency';
import { cn } from '@/lib/utils';

export default function TeamPage() {
  const {
    currentUser,
    users,
    accessibleProjects,
    memberships,
    createUser,
    updateUser,
    changeUserPassword,
    toggleUserDisabled,
    deleteUser,
  } = useAuth();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPassUser, setChangingPassUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editAssignedProjects, setEditAssignedProjects] = useState<string[]>([]);

  // Add User Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);

  // Change Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  // Access guard: only admins can manage the team
  if (currentUser.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="rounded-[12px] border border-amber-200 bg-amber-50/50 p-6 space-y-3">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-600" />
          <h2 className="text-[16px] font-bold text-amber-900">
            Access Restricted
          </h2>
          <p className="text-[13px] text-amber-700">
            Team Management and user invitations are reserved for Founders &amp; Administrators.
          </p>
        </div>
      </div>
    );
  }

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditTitle(u.title || '');
    setEditRole(u.role || 'member');
    setEditAssignedProjects(memberships[u.id] || []);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim() || !editEmail.trim()) return;

    updateUser(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      title: editTitle.trim() || undefined,
      role: editRole,
      assignedProjectIds: editRole === 'member' ? editAssignedProjects : undefined,
    });
    setEditingUser(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    createUser({
      name: name.trim(),
      email: email.trim(),
      role,
      title: title.trim() || (role === 'member' ? 'Team Member' : 'Co-Founder & Admin'),
      password: password.trim() || undefined,
      assignedProjectIds: role === 'member' ? assignedProjectIds : [],
    });

    setIsAddOpen(false);
    setName('');
    setEmail('');
    setTitle('');
    setRole('member');
    setPassword('');
    setAssignedProjectIds([]);
  };

  const toggleProjectSelection = (
    projectId: string,
    isEdit: boolean = false
  ) => {
    if (isEdit) {
      setEditAssignedProjects((prev) =>
        prev.includes(projectId)
          ? prev.filter((id) => id !== projectId)
          : [...prev, projectId]
      );
    } else {
      setAssignedProjectIds((prev) =>
        prev.includes(projectId)
          ? prev.filter((id) => id !== projectId)
          : [...prev, projectId]
      );
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (newPassword.length < 4) {
      setPassError('Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    if (changingPassUser) {
      changeUserPassword(changingPassUser.id, newPassword);
      setPassSuccess(true);
      setTimeout(() => {
        setChangingPassUser(null);
        setNewPassword('');
        setConfirmPassword('');
        setPassSuccess(false);
      }, 1000);
    }
  };

  const handleConfirmDelete = () => {
    if (deletingUser) {
      deleteUser(deletingUser.id);
      setDeletingUser(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Page Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#111827] tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-[#4361ee]" />
            Team &amp; Access Management
          </h1>
          <p className="text-[13px] text-[#6b7280] mt-0.5">
            Manage Founders, Admins, and Employees. Assign team members to specific projects and Kanban task boards.
          </p>
        </div>

        {currentUser.is_main_admin ? (
          <Button
            onClick={() => setIsAddOpen(true)}
            className="h-[36px] px-4 rounded-[8px] bg-[#4361ee] hover:bg-[#3451d1] text-white shadow-[0_2px_6px_rgba(67,97,238,0.25)] text-[13px] font-medium gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Team Member
          </Button>
        ) : (
          <div className="rounded-[8px] bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 border border-zinc-200 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-zinc-400" />
            <span>Only Main Admin can invite new members</span>
          </div>
        )}
      </div>

      {/* 2. Info Banner */}
      <div className="rounded-[12px] bg-gradient-to-r from-[#eef0fd] to-[#e8f0fe] border border-[rgba(67,97,238,0.18)] p-4">
        <div className="flex items-start gap-3">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-[#4361ee] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-[12px]">
            <div className="font-bold text-[#111827] flex items-center gap-2">
              <span>Role-Based Access Control (RBAC)</span>
              <span className="rounded-[20px] bg-[#dbeafe] px-2 py-0.5 text-[10.5px] font-semibold text-[#1d4ed8]">
                Admins &amp; Employees
              </span>
            </div>
            <p className="text-[#6b7280] leading-relaxed">
              <strong>Founders &amp; Admins</strong> have full visibility over client meetings, proposals, billing, credentials, and all projects. 
              <strong> Employees</strong> only see the specific projects they are assigned to, where they can execute tasks on the Kanban board and submit deliverables.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Team Directory Card */}
      <div className="rounded-[12px] bg-white border border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#e5e7eb]">
          <h2 className="text-[15px] font-bold text-[#111827]">
            Active Team Members ({users.length})
          </h2>
          <span className="text-[12px] text-[#9ca3af]">
            Logged in as: <strong className="text-[#111827]">{currentUser.name}</strong>
          </span>
        </div>

        <div className="divide-y divide-[#e5e7eb]">
          {users.map((u) => {
            const isCurrent = u.id === currentUser.id;
            const initials = u.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const userProjectIds = memberships[u.id] || [];
            const userAssignedProjects = accessibleProjects.filter((p) =>
              userProjectIds.includes(p.id)
            );

            return (
              <div
                key={u.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors ${
                  u.is_disabled ? 'bg-zinc-50/70 opacity-90' : 'hover:bg-[#fafbff]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-[40px] h-[40px] rounded-full font-bold text-[13px] flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                      u.is_disabled
                        ? 'bg-zinc-300 text-zinc-600'
                        : u.role === 'admin'
                        ? 'bg-[#4361ee] text-white'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[14px] font-semibold ${
                          u.is_disabled ? 'text-zinc-500 line-through' : 'text-[#111827]'
                        }`}
                      >
                        {u.name}
                      </span>
                      {isCurrent && (
                        <span className="rounded-[20px] bg-[#f3f4f6] px-2 py-0.5 text-[10.5px] font-semibold text-[#4b5563]">
                          You
                        </span>
                      )}
                      {u.is_disabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[20px] text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
                          <Ban className="h-3 w-3 mr-1" />
                          Account Disabled
                        </span>
                      ) : u.is_main_admin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[20px] text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Main Admin
                        </span>
                      ) : u.role === 'admin' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[20px] text-[11px] font-semibold bg-[#d1fae5] text-[#065f46]">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Founder &amp; Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[20px] text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          Employee
                        </span>
                      )}
                    </div>

                    <div className="text-[12px] text-[#6b7280] mt-0.5">
                      {u.email} · {u.title || (u.role === 'admin' ? 'Co-Founder & Admin' : 'Employee')}
                    </div>

                    {/* Assigned Projects Preview for Employees */}
                    {u.role !== 'admin' && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-[#6b7280] flex items-center gap-1">
                          <FolderKanban className="h-3 w-3 text-purple-500" />
                          Assigned:
                        </span>
                        {userAssignedProjects.length > 0 ? (
                          userAssignedProjects.map((p) => {
                            const pStatus = getProjectSimpleStatus(p);
                            return (
                              <span
                                key={p.id}
                                className={cn(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10.5px] font-medium border',
                                  pStatus === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : pStatus === 'Inactive'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                )}
                              >
                                <span>{p.title}</span>
                                <span className="text-[9px] opacity-75">({pStatus})</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">
                            No projects assigned yet
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                  {(isCurrent || currentUser.is_main_admin) && (
                    <button
                      type="button"
                      onClick={() => openEditModal(u)}
                      className="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-[7px] border border-[#e5e7eb] bg-white text-[#4b5563] hover:border-[#4361ee] hover:text-[#4361ee] text-[12px] font-medium transition-colors cursor-pointer"
                      title="Edit name, email, or role title"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Details
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setChangingPassUser(u);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPassError('');
                      setPassSuccess(false);
                    }}
                    className="inline-flex items-center gap-1.5 h-[32px] px-3 rounded-[7px] border border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#4361ee] hover:text-[#4361ee] text-[12px] font-medium transition-colors cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Change Password
                  </button>

                  {/* Main Admin Only Controls for other accounts */}
                  {currentUser.is_main_admin && !u.is_main_admin && !isCurrent && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleUserDisabled(u.id)}
                        className={`inline-flex items-center gap-1.5 h-[32px] px-2.5 rounded-[7px] text-[12px] font-medium border transition-colors cursor-pointer ${
                          u.is_disabled
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                        title={u.is_disabled ? 'Re-enable account' : 'Temporarily suspend account'}
                      >
                        {u.is_disabled ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Enable
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Disable
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingUser(u)}
                        className="inline-flex items-center gap-1.5 h-[32px] px-2.5 rounded-[7px] border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 text-[12px] font-medium transition-colors cursor-pointer"
                        title="Permanently remove account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Edit User Details & Project Assignments */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Edit Member: ${editingUser.name}`}
          icon={<Pencil className="h-5 w-5 text-[#4361ee]" />}
          maxWidth="max-w-[480px]"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
                className="h-[36px] px-4 text-[13px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-user-form"
                className="h-[36px] px-5 rounded-[8px] bg-[#4361ee] hover:bg-[#3451d1] text-white text-[13px]"
              >
                Save Changes
              </Button>
            </>
          }
        >
          <form id="edit-user-form" onSubmit={handleSaveEditUser} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#6b7280]">
                Full Name *
              </label>
              <Input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="text-[13px] h-[36px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#6b7280]">
                Email Address *
              </label>
              <Input
                required
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="ramesh@holabusiness.in"
                className="text-[13px] h-[36px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-[#6b7280]">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full h-[36px] rounded-[6px] border border-[#e5e7eb] bg-white px-2.5 text-[13px] text-[#111827] outline-none focus:border-[#4361ee]"
                  disabled={editingUser.is_main_admin}
                >
                  <option value="member">Employee</option>
                  <option value="admin">Founder &amp; Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-[#6b7280]">
                  Title / Designation
                </label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  className="text-[13px] h-[36px]"
                />
              </div>
            </div>

            {/* Project Assignments if Employee */}
            {editRole === 'member' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[12px] font-medium text-[#374151]">
                  Assign to Projects (Access Scope)
                </label>
                <div className="max-h-44 overflow-y-auto rounded-[8px] border border-[#e5e7eb] p-2 space-y-1 bg-[#f9fafb]">
                  {accessibleProjects.length === 0 ? (
                    <p className="text-[12px] text-zinc-400 p-1">No projects available.</p>
                  ) : (
                    accessibleProjects.map((p) => {
                      const isChecked = editAssignedProjects.includes(p.id);
                      const pStatus = getProjectSimpleStatus(p);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] hover:bg-white text-[12.5px] text-[#111827] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProjectSelection(p.id, true)}
                            className="rounded border-[#d1d5db] text-[#4361ee] focus:ring-[#4361ee]"
                          />
                          <span className="font-medium truncate flex-1 min-w-0">{p.title}</span>
                          <span className="text-[10px] text-[#9ca3af] shrink-0">({p.project_type})</span>
                          <span
                            className={cn(
                              'text-[9.5px] px-1.5 py-0.2 rounded font-semibold shrink-0',
                              pStatus === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : pStatus === 'Inactive'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            )}
                          >
                            ● {pStatus}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}

      {/* Modal: Add New Team Member (Admin or Employee) */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Team Member"
        icon={<Plus className="h-5 w-5 text-[#4361ee]" />}
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="h-[36px] px-4 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-member-form"
              className="h-[36px] px-5 rounded-[8px] bg-[#4361ee] hover:bg-[#3451d1] text-white text-[13px]"
            >
              Create Account
            </Button>
          </>
        }
      >
        <form id="add-member-form" onSubmit={handleCreateUser} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#6b7280]">
                Account Role *
              </label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  setRole(newRole);
                  if (newRole === 'admin') {
                    setTitle('Co-Founder & Admin');
                  } else {
                    setTitle('Software Engineer');
                  }
                }}
                className="w-full h-[36px] rounded-[6px] border border-[#e5e7eb] bg-white px-2.5 text-[13px] text-[#111827] outline-none focus:border-[#4361ee]"
              >
                <option value="member">Employee</option>
                <option value="admin">Founder &amp; Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#6b7280]">
                Title / Designation
              </label>
              <Input
                placeholder={role === 'member' ? 'e.g. UI/UX Designer' : 'e.g. Co-Founder'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-[36px] text-[13px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6b7280] mb-1">
              Full Name *
            </label>
            <Input
              required
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-[36px] text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6b7280] mb-1">
              Email Address *
            </label>
            <Input
              required
              type="email"
              placeholder="alex@holabusiness.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[36px] text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6b7280] mb-1">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                placeholder={`Leave blank for default: ${role === 'member' ? 'employee123' : 'admin123'}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[36px] text-[13px] pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#111827]"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Project Assignments if Employee */}
          {role === 'member' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-[12px] font-medium text-[#374151]">
                  Assign to Projects
                </label>
                <span className="text-[11px] text-[#9ca3af]">
                  {assignedProjectIds.length} selected
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-[8px] border border-[#e5e7eb] p-2 space-y-1 bg-[#f9fafb]">
                {accessibleProjects.length === 0 ? (
                  <p className="text-[12px] text-zinc-400 p-1">No projects available.</p>
                ) : (
                  accessibleProjects.map((p) => {
                    const isChecked = assignedProjectIds.includes(p.id);
                    const pStatus = getProjectSimpleStatus(p);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] hover:bg-white text-[12.5px] text-[#111827] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProjectSelection(p.id, false)}
                          className="rounded border-[#d1d5db] text-[#4361ee] focus:ring-[#4361ee]"
                        />
                        <span className="font-medium truncate flex-1 min-w-0">{p.title}</span>
                        <span className="text-[10px] text-[#9ca3af] shrink-0">({p.project_type})</span>
                        <span
                          className={cn(
                            'text-[9.5px] px-1.5 py-0.2 rounded font-semibold shrink-0',
                            pStatus === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : pStatus === 'Inactive'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          )}
                        >
                          ● {pStatus}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal: Change Password */}
      <Modal
        isOpen={!!changingPassUser}
        onClose={() => setChangingPassUser(null)}
        title={changingPassUser ? `Change Password for ${changingPassUser.name}` : 'Change Password'}
        icon={<KeyRound className="h-4 w-4 text-[#4361ee]" />}
        maxWidth="max-w-[420px]"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangingPassUser(null)}
              className="h-[36px] px-4 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="change-pass-form"
              className="h-[36px] px-5 rounded-[8px] bg-[#4361ee] hover:bg-[#3451d1] text-white text-[13px]"
            >
              Update Password
            </Button>
          </>
        }
      >
        <form id="change-pass-form" onSubmit={handleChangePassword} className="space-y-3.5">
          {passError && (
            <div className="rounded-[8px] bg-[#fef2f2] border border-[#fca5a5] p-2 text-[12px] text-[#ef4444]">
              {passError}
            </div>
          )}
          {passSuccess && (
            <div className="rounded-[8px] bg-[#f0fdf4] border border-[#86efac] p-2 text-[12px] text-[#16a34a] flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#6b7280] mb-1">
              New Password
            </label>
            <Input
              type="password"
              required
              placeholder="Minimum 4 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-[36px] text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#6b7280] mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              required
              placeholder="Re-type new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-[36px] text-[13px]"
            />
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Permanent Deletion */}
      {deletingUser && (
        <Modal
          isOpen={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          title="Delete Account"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          maxWidth="max-w-[420px]"
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingUser(null)}
                className="h-[36px] px-4 text-[13px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                className="h-[36px] px-5 rounded-[8px] bg-red-600 hover:bg-red-700 text-white text-[13px]"
              >
                Permanently Delete
              </Button>
            </>
          }
        >
          <div className="space-y-2 text-[13px] text-zinc-600">
            <p>
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-zinc-900">{deletingUser.name}</strong> ({deletingUser.email})?
            </p>
            <p className="text-[12px] text-red-600">
              This action cannot be undone. They will immediately lose access to all workspaces and tasks.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
