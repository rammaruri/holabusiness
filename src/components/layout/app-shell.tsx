'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckSquare,
  ChevronDown,
  CloudCheck,
  CloudSync,
  Command,
  Contact,
  FolderOpen,
  Globe,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/providers/app-providers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTaskDelayInfo } from '@/lib/rbac';
import { cn, formatDate } from '@/lib/utils';
import { ROLE_LABELS, getProjectSimpleStatus, type ProjectType, type UserRole } from '@/types/agency';

const PROJECT_TYPE_ICONS: Record<ProjectType, React.ReactNode> = {
  Website: <Globe className="h-3.5 w-3.5 text-[#4361ee]" />,
  'Web App': <Layers className="h-3.5 w-3.5 text-[#8b5cf6]" />,
  'Mobile App': <Smartphone className="h-3.5 w-3.5 text-[#10b981]" />,
  'Digital Marketing': <Megaphone className="h-3.5 w-3.5 text-[#f59e0b]" />,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    users,
    permissions,
    accessibleProjects,
    accessibleTasks,
    renewals,
    todayDate,
    switchPersona,
    isAuthenticated,
    signOut,
    isCloudSyncing,
    isCloudSynced,
  } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const switcherRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close floating menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (switcherOpen && switcherRef.current && !switcherRef.current.contains(target)) {
        setSwitcherOpen(false);
      }
      if (notificationsOpen && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (personaMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setPersonaMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [switcherOpen, notificationsOpen, personaMenuOpen]);

  // Redirect to /login if signed out (unless already on /login)
  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, pathname, router]);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSwitcherOpen(false);
        setNotificationsOpen(false);
        setPersonaMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const delayedTasks = useMemo(() => {
    if (!permissions.canViewInternalDelays) return [];
    return accessibleTasks
      .map((task) => ({
        task,
        delay: getTaskDelayInfo(task, todayDate),
        project: accessibleProjects.find((p) => p.id === task.project_id),
      }))
      .filter((item) => item.delay.isDelayed);
  }, [accessibleTasks, accessibleProjects, permissions.canViewInternalDelays, todayDate]);

  const activeProjectId = pathname.startsWith('/projects/')
    ? pathname.split('/')[2]
    : null;
  const activeProject = accessibleProjects.find((p) => p.id === activeProjectId);

  const activeProjects = useMemo(() => {
    return accessibleProjects.filter((p) => getProjectSimpleStatus(p) === 'Active');
  }, [accessibleProjects]);

  const draftsCount = useMemo(() => {
    return accessibleProjects.filter((p) => getProjectSimpleStatus(p) !== 'Active').length;
  }, [accessibleProjects]);

  // Filter projects for the switcher dropdown
  const filteredSwitcherProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    const sourceList = currentUser.role === 'admin' ? activeProjects : accessibleProjects;
    return sourceList.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q)
    );
  }, [activeProjects, accessibleProjects, currentUser.role, projectSearch]);

  const navItems = useMemo(() => {
    const isAdmin = currentUser.role === 'admin';
    const items = [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        badge: undefined,
        visible: true,
      },
      {
        label: 'Business Contacts',
        href: '/contacts',
        icon: Contact,
        badge: undefined,
        visible: isAdmin,
      },
      {
        label: 'Drafts',
        href: '/drafts',
        icon: Archive,
        badge: undefined,
        visible: isAdmin,
      },
      {
        label: 'Team Management',
        href: '/team',
        icon: Users,
        badge: undefined,
        visible: isAdmin,
      },
    ];
    return items.filter((i) => i.visible);
  }, [currentUser.role]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchedProjects = accessibleProjects.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.project_type.toLowerCase().includes(q)
    );
    const matchedTasks = accessibleTasks.filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
    );
    return { matchedProjects, matchedTasks };
  }, [searchQuery, accessibleProjects, accessibleTasks]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#4361ee] border-t-transparent animate-spin" />
          <p className="text-[13px] text-zinc-500 font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const userInitials = (currentUser.name || 'User')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white text-[#111827] select-none border-r border-[#e5e7eb] w-[232px]">
      {/* 1. Top Logo Block (60px tall, bottom border) */}
      <div className="flex h-[60px] items-center px-[18px] border-b border-[#e5e7eb] shrink-0 gap-2.5 justify-between">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-[32px] h-[32px] rounded-[8px] bg-[#4361ee] text-white font-bold text-[14px] flex items-center justify-center shrink-0">
            HB
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="text-[13px] font-bold text-[#111827] truncate">
              HolaBusiness
            </span>
            <span className="text-[10px] text-[#6b7280]">
              Project Operations
            </span>
          </div>
        </Link>
        {process.env.NEXT_PUBLIC_APP_ENV === 'staging' && (
          <span className="rounded-[4px] bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider text-amber-800 uppercase border border-amber-300">
            Staging
          </span>
        )}
        {process.env.NEXT_PUBLIC_APP_ENV === 'development' && (
          <span className="rounded-[4px] bg-blue-50 px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[#4361ee] uppercase border border-blue-200">
            Dev
          </span>
        )}
      </div>

      {/* 2. Navigation & Project Selector */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1">
        {/* Dashboard Nav Item */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer',
            pathname === '/'
              ? 'bg-[rgba(67,97,238,0.08)] text-[#4361ee] font-semibold'
              : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]'
          )}
        >
          <LayoutDashboard className={cn('h-4 w-4 shrink-0', pathname === '/' ? 'text-[#4361ee]' : 'text-[#9ca3af]')} />
          <span className="flex-1 truncate">Dashboard</span>
        </Link>

        {/* Project Selector Button */}
        <div ref={switcherRef} className="relative">
          <button
            onClick={() => setSwitcherOpen((o) => !o)}
            className={cn(
              'flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-left transition-colors cursor-pointer',
              activeProject
                ? 'bg-[rgba(67,97,238,0.08)] text-[#4361ee]'
                : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]'
            )}
          >
            <FolderOpen
              className={cn(
                'h-4 w-4 shrink-0',
                activeProject ? 'text-[#4361ee]' : 'text-[#9ca3af]'
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium leading-none">Projects</div>
              {activeProject && (
                <div className="text-[11px] font-semibold text-[#4361ee] truncate mt-1">
                  {activeProject.title}
                </div>
              )}
            </div>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                switcherOpen ? 'rotate-180 text-[#4361ee]' : 'text-[#9ca3af]'
              )}
            />
          </button>

          {/* Project Dropdown Panel (240px wide, floating) */}
          {switcherOpen && (
            <div className="absolute left-0 top-[46px] z-50 w-[240px] rounded-[12px] border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-2.5 space-y-2 animate-drop-in">
              <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-[0.06em]">
                Select Project
              </div>
              <div className="flex items-center gap-1.5 bg-[#f5f6fa] border border-[#e5e7eb] rounded-[7px] px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-[#9ca3af] shrink-0" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="bg-transparent border-none text-[12px] text-[#111827] outline-none w-full placeholder:text-[#9ca3af]"
                  autoFocus
                />
              </div>

              {permissions.canCreateProject && (
                <Link
                  href="/?newProject=1"
                  onClick={() => setSwitcherOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-[7px] text-[12px] font-medium text-[#4361ee] hover:bg-[rgba(67,97,238,0.08)] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ New Project</span>
                </Link>
              )}

              <div className="max-h-[220px] overflow-y-auto space-y-0.5 pt-1">
                {filteredSwitcherProjects.length === 0 ? (
                  <div className="p-3 text-center text-[12px] text-[#9ca3af]">
                    No matching projects
                  </div>
                ) : (
                  filteredSwitcherProjects.map((p) => {
                    const isSelected = activeProjectId === p.id;
                    const pStatus = getProjectSimpleStatus(p);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSwitcherOpen(false);
                          router.push(`/projects/${p.id}`);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-2 py-1.5 rounded-[7px] text-left text-[12.5px] transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-[rgba(67,97,238,0.08)] text-[#4361ee] font-semibold'
                            : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]'
                        )}
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            pStatus === 'Active'
                              ? 'bg-[#10b981]'
                              : pStatus === 'Inactive'
                              ? 'bg-[#f59e0b]'
                              : 'bg-[#3b82f6]'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium flex items-center justify-between gap-1">
                            <span className="truncate">{p.title}</span>
                            <span
                              className={cn(
                                'text-[9.5px] px-1.5 py-0.2 rounded font-semibold',
                                pStatus === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : pStatus === 'Inactive'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50 text-blue-700'
                              )}
                            >
                              {pStatus}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9ca3af] truncate">{p.project_type}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section: Modules */}
        <div className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em] px-2 pt-3 pb-1">
          Modules
        </div>

        {navItems
          .filter((i) => i.href !== '/')
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-[rgba(67,97,238,0.08)] text-[#4361ee] font-semibold'
                    : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#111827]'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive ? 'text-[#4361ee]' : 'text-[#9ca3af]'
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-[10px] min-w-[18px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </div>

      {/* 3. Bottom Sidebar (Logout) */}
      <div className="p-2.5 border-t border-[#e5e7eb] shrink-0 space-y-0.5">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium text-[#6b7280] hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors cursor-pointer group"
        >
          <LogOut className="h-4 w-4 text-[#9ca3af] group-hover:text-[#ef4444]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f6fa] text-[#111827]">
      {/* Desktop Fixed Left Sidebar (232px) */}
      <aside className="hidden lg:block shrink-0 w-[232px] h-full z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-fade-up">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[3px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[232px] h-full shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header (60px tall, white, bottom border, 24px side padding) */}
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#e5e7eb] bg-white px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-[8px] p-1.5 text-[#6b7280] hover:bg-[#f3f4f6] cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Header Search Box (grey bg, border, max-width 240px) */}
            <div
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-[#f5f6fa] px-3 py-1.5 w-[220px] text-[13px] text-[#9ca3af] hover:border-[#4361ee] transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-[#9ca3af] shrink-0" />
              <span className="truncate">Search anything...</span>
            </div>
          </div>

          {/* Center Page Title (16px / 700) */}
          <div className="flex-1 text-center font-bold text-[16px] text-[#111827] truncate px-4">
            {activeProject ? activeProject.title : 'Dashboard'}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Cloud Sync Status Indicator */}
            {isCloudSyncing ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                <CloudSync className="h-3.5 w-3.5 animate-spin text-[#4361ee]" />
                <span>Syncing...</span>
              </span>
            ) : isCloudSynced ? (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                title="Connected & Synced with Turso Cloud Database"
              >
                <CloudCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Cloud Synced</span>
              </span>
            ) : null}

            {/* Notification Bell (34x34 square button, white, border, radius 8) */}
            {permissions.canViewInternalDelays && (
              <div ref={notificationsRef} className="relative">
                <button
                  onClick={() => setNotificationsOpen((o) => !o)}
                  className="relative flex h-[34px] w-[34px] items-center justify-center rounded-[8px] border border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#4361ee] hover:text-[#4361ee] hover:bg-[rgba(67,97,238,0.08)] transition-all cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {delayedTasks.length > 0 && (
                    <span className="absolute top-[7px] right-[7px] w-[6px] h-[6px] rounded-full bg-[#ef4444] ring-1.5 ring-white" />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-11 z-50 w-80 rounded-[12px] border border-[#e5e7eb] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-drop-in">
                    <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2 mb-2">
                      <span className="text-[13px] font-bold text-[#111827]">
                        Overdue Task Alerts
                      </span>
                      <span className="px-2 py-0.5 rounded-[20px] text-[11px] font-medium bg-[#fee2e2] text-[#991b1b]">
                        {delayedTasks.length} Delayed
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {delayedTasks.length === 0 ? (
                        <div className="p-3 text-center text-[12px] text-[#6b7280]">
                          All tasks are on schedule! 🎉
                        </div>
                      ) : (
                        delayedTasks.map(({ task, delay, project: p }) => (
                          <div
                            key={task.id}
                            className="rounded-[8px] border border-[#fee2e2] bg-[#fef2f2] p-2 text-[12px]"
                          >
                            <div className="font-semibold text-[#991b1b]">
                              {task.title}
                            </div>
                            <div className="text-[11px] text-[#6b7280]">
                              {p?.title} · Due: {formatDate(task.due_date)} ({delay.daysOverdue}d overdue)
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setPersonaMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-2.5 py-1 text-left hover:border-[#4361ee] transition-all cursor-pointer"
              >
                <div className="w-[28px] h-[28px] rounded-full bg-[#4361ee] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-[12px] font-semibold text-[#111827] max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[#9ca3af]">
                    {currentUser.title || ROLE_LABELS[currentUser.role]}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-[#9ca3af] hidden sm:block" />
              </button>

              {personaMenuOpen && (
                <div className="absolute right-0 top-11 z-50 w-64 rounded-[12px] border border-[#e5e7eb] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-drop-in">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#e5e7eb]">
                    <div className="w-10 h-10 rounded-full bg-[#4361ee] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {userInitials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13px] text-[#111827] truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-[#6b7280] truncate">
                        {currentUser.email}
                      </div>
                      <div className="mt-1">
                        <span className="inline-block text-[10px] font-semibold text-[#4361ee] bg-[#eef0fd] px-2 py-0.5 rounded-full">
                          {currentUser.title || ROLE_LABELS[currentUser.role]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1">
                    {currentUser.role === 'admin' && (
                      <Link
                        href="/team"
                        onClick={() => setPersonaMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[7px] text-[12.5px] font-medium text-[#4b5563] hover:bg-[#f3f4f6] hover:text-[#111827] transition-colors"
                      >
                        <Users className="h-4 w-4 text-[#9ca3af]" />
                        <span>Manage Team &amp; Access</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPersonaMenuOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded-[7px] text-[12.5px] font-medium text-[#ef4444] hover:bg-[#fef2f2] transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-[#ef4444]" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Scroll Area (adaptive padding, pale grey #f5f6fa background) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 bg-[#f5f6fa]">
          <div className="w-full max-w-[1600px] mx-auto animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      {/* Global Cmd+K Search Dialog */}
      {searchOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 sm:pt-20 bg-black/40 backdrop-blur-[3px] p-4 animate-fade-up">
          <div className="w-full max-w-lg rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] px-4 py-3">
              <Search className="h-4 w-4 text-[#9ca3af] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects, client deliverables, tasks..."
                className="flex-1 bg-transparent text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none"
                autoFocus
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded-[6px] p-1 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-2">
              <div>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                  Projects ({searchResults.matchedProjects.length})
                </div>
                {searchResults.matchedProjects.length === 0 ? (
                  <div className="px-2 py-1.5 text-[12px] text-[#9ca3af]">
                    No matching projects.
                  </div>
                ) : (
                  searchResults.matchedProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(`/projects/${p.id}`);
                      }}
                      className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-[#111827]">{p.title}</span>
                      <span className="text-[11px] text-[#9ca3af]">{p.client_name}</span>
                    </button>
                  ))
                )}
              </div>

              <div>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                  Tasks ({searchResults.matchedTasks.length})
                </div>
                {searchResults.matchedTasks.length === 0 ? (
                  <div className="px-2 py-1.5 text-[12px] text-[#9ca3af]">
                    No matching tasks.
                  </div>
                ) : (
                  searchResults.matchedTasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(`/projects/${t.project_id}`);
                      }}
                      className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[#f3f4f6] transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-[#111827] truncate mr-2">{t.title}</span>
                      <span className="text-[11px] text-[#9ca3af] shrink-0">{t.status}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
