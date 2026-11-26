import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

function stripInternal<T extends Record<string, any>>(doc: T): Omit<T, '_id' | '_creationTime'> {
  const { _id, _creationTime, ...rest } = doc;
  return rest;
}

export const getWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const seededMeta = await ctx.db
      .query('meta')
      .withIndex('by_key', (q) => q.eq('key', 'seeded'))
      .first();

    const [
      usersDocs,
      projectsDocs,
      membershipsDocs,
      contactsDocs,
      meetingsDocs,
      clientTalksDocs,
      proposalsDocs,
      documentsDocs,
      requirementsDocs,
      assetsDocs,
      credentialsDocs,
      tasksDocs,
      renewalsDocs,
      activityLogsDocs,
    ] = await Promise.all([
      ctx.db.query('users').collect(),
      ctx.db.query('projects').collect(),
      ctx.db.query('memberships').collect(),
      ctx.db.query('contacts').collect(),
      ctx.db.query('meetings').collect(),
      ctx.db.query('clientTalks').collect(),
      ctx.db.query('proposals').collect(),
      ctx.db.query('documents').collect(),
      ctx.db.query('requirements').collect(),
      ctx.db.query('assets').collect(),
      ctx.db.query('credentials').collect(),
      ctx.db.query('tasks').collect(),
      ctx.db.query('renewals').collect(),
      ctx.db.query('activityLogs').collect(),
    ]);

    const memberships: Record<string, string[]> = {};
    for (const m of membershipsDocs) {
      memberships[m.user_id] = m.project_ids;
    }

    const tasks = tasksDocs
      .map(stripInternal)
      .sort((a, b) => {
        const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return b.created_at.localeCompare(a.created_at);
      });

    const projects = projectsDocs
      .map(stripInternal)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const activityLogs = activityLogsDocs
      .map(stripInternal)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return {
      seeded: Boolean(seededMeta?.value),
      users: usersDocs.map(stripInternal),
      projects,
      memberships,
      contacts: contactsDocs.map(stripInternal).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      meetings: meetingsDocs.map(stripInternal).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      clientTalks: clientTalksDocs.map(stripInternal).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      proposals: proposalsDocs.map(stripInternal).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      documents: documentsDocs.map(stripInternal).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      requirements: requirementsDocs.map(stripInternal),
      assets: assetsDocs.map(stripInternal).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      credentials: credentialsDocs.map(stripInternal),
      tasks,
      renewals: renewalsDocs.map(stripInternal).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      activityLogs,
    };
  },
});

export const seedOrMigrate = mutation({
  args: {
    users: v.array(v.any()),
    projects: v.array(v.any()),
    memberships: v.any(),
    contacts: v.array(v.any()),
    meetings: v.array(v.any()),
    clientTalks: v.array(v.any()),
    proposals: v.array(v.any()),
    documents: v.array(v.any()),
    requirements: v.array(v.any()),
    assets: v.array(v.any()),
    credentials: v.array(v.any()),
    tasks: v.array(v.any()),
    renewals: v.array(v.any()),
    activityLogs: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const existingSeed = await ctx.db
      .query('meta')
      .withIndex('by_key', (q) => q.eq('key', 'seeded'))
      .first();
    if (existingSeed?.value) return { alreadySeeded: true };

    for (const u of args.users) await ctx.db.insert('users', u);
    for (const p of args.projects) await ctx.db.insert('projects', p);
    if (args.memberships && typeof args.memberships === 'object') {
      for (const [userId, projectIds] of Object.entries(args.memberships)) {
        if (Array.isArray(projectIds)) {
          await ctx.db.insert('memberships', {
            user_id: userId,
            project_ids: projectIds as string[],
          });
        }
      }
    }
    for (const c of args.contacts) await ctx.db.insert('contacts', c);
    for (const m of args.meetings) await ctx.db.insert('meetings', m);
    for (const t of args.clientTalks) await ctx.db.insert('clientTalks', t);
    for (const p of args.proposals) await ctx.db.insert('proposals', p);
    for (const d of args.documents) await ctx.db.insert('documents', d);
    for (const r of args.requirements) await ctx.db.insert('requirements', r);
    for (const a of args.assets) await ctx.db.insert('assets', a);
    for (const cr of args.credentials) await ctx.db.insert('credentials', cr);
    for (let i = 0; i < args.tasks.length; i++) {
      await ctx.db.insert('tasks', {
        ...args.tasks[i],
        sort_order: args.tasks[i].sort_order ?? i,
      });
    }
    for (const rn of args.renewals) await ctx.db.insert('renewals', rn);
    for (const l of args.activityLogs) await ctx.db.insert('activityLogs', l);

    await ctx.db.insert('meta', { key: 'seeded', value: true });
    return { alreadySeeded: false };
  },
});

// ─── USERS & MEMBERSHIPS ──────────────────────────────────────────────────────

export const upsertUser = mutation({
  args: { user: v.any(), assignedProjectIds: v.optional(v.array(v.string())) },
  handler: async (ctx, { user, assignedProjectIds }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_app_id', (q) => q.eq('id', user.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, user);
    } else {
      await ctx.db.insert('users', user);
    }

    if (assignedProjectIds !== undefined) {
      const mem = await ctx.db
        .query('memberships')
        .withIndex('by_user_id', (q) => q.eq('user_id', user.id))
        .first();
      if (mem) {
        await ctx.db.patch(mem._id, { project_ids: assignedProjectIds });
      } else {
        await ctx.db.insert('memberships', {
          user_id: user.id,
          project_ids: assignedProjectIds,
        });
      }
    }
  },
});

export const deleteUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_app_id', (q) => q.eq('id', userId))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    const mem = await ctx.db
      .query('memberships')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .first();
    if (mem) await ctx.db.delete(mem._id);
  },
});

export const setUserMemberships = mutation({
  args: { userId: v.string(), projectIds: v.array(v.string()) },
  handler: async (ctx, { userId, projectIds }) => {
    const existing = await ctx.db
      .query('memberships')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { project_ids: projectIds });
    } else {
      await ctx.db.insert('memberships', { user_id: userId, project_ids: projectIds });
    }
  },
});

export const addProjectToUserMembership = mutation({
  args: { userId: v.string(), projectId: v.string() },
  handler: async (ctx, { userId, projectId }) => {
    const existing = await ctx.db
      .query('memberships')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .first();
    if (existing) {
      if (!existing.project_ids.includes(projectId)) {
        await ctx.db.patch(existing._id, {
          project_ids: [...existing.project_ids, projectId],
        });
      }
    } else {
      await ctx.db.insert('memberships', { user_id: userId, project_ids: [projectId] });
    }
  },
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

export const createProjectWithDetails = mutation({
  args: { project: v.any(), requirement: v.any() },
  handler: async (ctx, { project, requirement }) => {
    await ctx.db.insert('projects', project);
    await ctx.db.insert('requirements', requirement);

    // Grant access to all non-client users
    const allUsers = await ctx.db.query('users').collect();
    for (const u of allUsers) {
      if (u.role !== 'client') {
        const mem = await ctx.db
          .query('memberships')
          .withIndex('by_user_id', (q) => q.eq('user_id', u.id))
          .first();
        if (mem) {
          if (!mem.project_ids.includes(project.id)) {
            await ctx.db.patch(mem._id, {
              project_ids: [...mem.project_ids, project.id],
            });
          }
        } else {
          await ctx.db.insert('memberships', {
            user_id: u.id,
            project_ids: [project.id],
          });
        }
      }
    }
  },
});

export const patchProject = mutation({
  args: { projectId: v.string(), patch: v.any() },
  handler: async (ctx, { projectId, patch }) => {
    const existing = await ctx.db
      .query('projects')
      .withIndex('by_app_id', (q) => q.eq('id', projectId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteProjectCascade = mutation({
  args: { projectId: v.string() },
  handler: async (ctx, { projectId }) => {
    const tables = [
      'tasks',
      'clientTalks',
      'meetings',
      'proposals',
      'assets',
      'credentials',
      'renewals',
      'requirements',
      'documents',
      'activityLogs',
      'contacts',
    ] as const;

    const proj = await ctx.db
      .query('projects')
      .withIndex('by_app_id', (q) => q.eq('id', projectId))
      .first();
    if (proj) await ctx.db.delete(proj._id);

    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_project_id', (q) => q.eq('project_id', projectId))
        .collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
  },
});

// ─── CONTACTS ─────────────────────────────────────────────────────────────────

export const createContact = mutation({
  args: { contact: v.any() },
  handler: async (ctx, { contact }) => {
    await ctx.db.insert('contacts', contact);
  },
});

export const patchContact = mutation({
  args: { contactId: v.string(), patch: v.any() },
  handler: async (ctx, { contactId, patch }) => {
    const existing = await ctx.db
      .query('contacts')
      .withIndex('by_app_id', (q) => q.eq('id', contactId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteContact = mutation({
  args: { contactId: v.string() },
  handler: async (ctx, { contactId }) => {
    const existing = await ctx.db
      .query('contacts')
      .withIndex('by_app_id', (q) => q.eq('id', contactId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── MEETINGS ─────────────────────────────────────────────────────────────────

export const createMeeting = mutation({
  args: { meeting: v.any(), advanceProjectToScheduled: v.optional(v.string()), now: v.optional(v.string()) },
  handler: async (ctx, { meeting, advanceProjectToScheduled, now }) => {
    await ctx.db.insert('meetings', meeting);
    if (advanceProjectToScheduled && now) {
      const proj = await ctx.db
        .query('projects')
        .withIndex('by_app_id', (q) => q.eq('id', advanceProjectToScheduled))
        .first();
      if (proj && proj.status === 'Lead/Discovery') {
        await ctx.db.patch(proj._id, { status: 'Meeting Scheduled', updated_at: now });
      }
    }
  },
});

export const patchMeeting = mutation({
  args: { meetingId: v.string(), patch: v.any() },
  handler: async (ctx, { meetingId, patch }) => {
    const existing = await ctx.db
      .query('meetings')
      .withIndex('by_app_id', (q) => q.eq('id', meetingId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteMeeting = mutation({
  args: { meetingId: v.string() },
  handler: async (ctx, { meetingId }) => {
    const existing = await ctx.db
      .query('meetings')
      .withIndex('by_app_id', (q) => q.eq('id', meetingId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── CLIENT TALKS ─────────────────────────────────────────────────────────────

export const createClientTalk = mutation({
  args: { talk: v.any() },
  handler: async (ctx, { talk }) => {
    await ctx.db.insert('clientTalks', talk);
  },
});

export const patchClientTalk = mutation({
  args: { talkId: v.string(), patch: v.any() },
  handler: async (ctx, { talkId, patch }) => {
    const existing = await ctx.db
      .query('clientTalks')
      .withIndex('by_app_id', (q) => q.eq('id', talkId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteClientTalk = mutation({
  args: { talkId: v.string() },
  handler: async (ctx, { talkId }) => {
    const existing = await ctx.db
      .query('clientTalks')
      .withIndex('by_app_id', (q) => q.eq('id', talkId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── PROPOSALS & DOCUMENTS ────────────────────────────────────────────────────

export const createProposalWithDoc = mutation({
  args: { proposal: v.any(), autoDoc: v.any() },
  handler: async (ctx, { proposal, autoDoc }) => {
    await ctx.db.insert('proposals', proposal);
    await ctx.db.insert('documents', autoDoc);
  },
});

export const patchProposal = mutation({
  args: { proposalId: v.string(), patch: v.any() },
  handler: async (ctx, { proposalId, patch }) => {
    const existing = await ctx.db
      .query('proposals')
      .withIndex('by_app_id', (q) => q.eq('id', proposalId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteProposal = mutation({
  args: { proposalId: v.string() },
  handler: async (ctx, { proposalId }) => {
    const existing = await ctx.db
      .query('proposals')
      .withIndex('by_app_id', (q) => q.eq('id', proposalId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const createDocument = mutation({
  args: { document: v.any() },
  handler: async (ctx, { document }) => {
    await ctx.db.insert('documents', document);
  },
});

export const patchDocument = mutation({
  args: { docId: v.string(), patch: v.any() },
  handler: async (ctx, { docId, patch }) => {
    const existing = await ctx.db
      .query('documents')
      .withIndex('by_app_id', (q) => q.eq('id', docId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

// ─── REQUIREMENTS ─────────────────────────────────────────────────────────────

export const patchRequirementByProject = mutation({
  args: { projectId: v.string(), patch: v.any() },
  handler: async (ctx, { projectId, patch }) => {
    const existing = await ctx.db
      .query('requirements')
      .withIndex('by_project_id', (q) => q.eq('project_id', projectId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

// ─── ASSETS ───────────────────────────────────────────────────────────────────

export const createAsset = mutation({
  args: { asset: v.any() },
  handler: async (ctx, { asset }) => {
    await ctx.db.insert('assets', asset);
  },
});

export const patchAsset = mutation({
  args: { assetId: v.string(), patch: v.any() },
  handler: async (ctx, { assetId, patch }) => {
    const existing = await ctx.db
      .query('assets')
      .withIndex('by_app_id', (q) => q.eq('id', assetId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteAsset = mutation({
  args: { assetId: v.string() },
  handler: async (ctx, { assetId }) => {
    const existing = await ctx.db
      .query('assets')
      .withIndex('by_app_id', (q) => q.eq('id', assetId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── CREDENTIALS ──────────────────────────────────────────────────────────────

export const createCredential = mutation({
  args: { credential: v.any() },
  handler: async (ctx, { credential }) => {
    await ctx.db.insert('credentials', credential);
  },
});

export const patchCredential = mutation({
  args: { credentialId: v.string(), patch: v.any() },
  handler: async (ctx, { credentialId, patch }) => {
    const existing = await ctx.db
      .query('credentials')
      .withIndex('by_app_id', (q) => q.eq('id', credentialId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteCredential = mutation({
  args: { credentialId: v.string() },
  handler: async (ctx, { credentialId }) => {
    const existing = await ctx.db
      .query('credentials')
      .withIndex('by_app_id', (q) => q.eq('id', credentialId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── TASKS ────────────────────────────────────────────────────────────────────

export const createTask = mutation({
  args: { task: v.any() },
  handler: async (ctx, { task }) => {
    const existingTasks = await ctx.db
      .query('tasks')
      .withIndex('by_project_id', (q) => q.eq('project_id', task.project_id))
      .collect();
    let minOrder = 0;
    for (const t of existingTasks) {
      if (typeof t.sort_order === 'number' && t.sort_order <= minOrder) {
        minOrder = t.sort_order - 1;
      }
    }
    await ctx.db.insert('tasks', { ...task, sort_order: minOrder });
  },
});

export const patchTask = mutation({
  args: { taskId: v.string(), patch: v.any() },
  handler: async (ctx, { taskId, patch }) => {
    const existing = await ctx.db
      .query('tasks')
      .withIndex('by_app_id', (q) => q.eq('id', taskId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const deleteTask = mutation({
  args: { taskId: v.string() },
  handler: async (ctx, { taskId }) => {
    const existing = await ctx.db
      .query('tasks')
      .withIndex('by_app_id', (q) => q.eq('id', taskId))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    // Clear blocked_by_task_id references pointing to deleted task
    const allTasks = await ctx.db.query('tasks').collect();
    for (const t of allTasks) {
      if (t.blocked_by_task_id === taskId) {
        await ctx.db.patch(t._id, { blocked_by_task_id: null });
      }
    }
  },
});

export const reorderTasks = mutation({
  args: {
    orderedTaskIds: v.array(v.string()),
    movedTaskId: v.string(),
    movedTaskPatch: v.any(),
  },
  handler: async (ctx, { orderedTaskIds, movedTaskId, movedTaskPatch }) => {
    const moved = await ctx.db
      .query('tasks')
      .withIndex('by_app_id', (q) => q.eq('id', movedTaskId))
      .first();
    if (moved) {
      await ctx.db.patch(moved._id, movedTaskPatch);
    }
    for (let i = 0; i < orderedTaskIds.length; i++) {
      const id = orderedTaskIds[i];
      const doc = await ctx.db
        .query('tasks')
        .withIndex('by_app_id', (q) => q.eq('id', id))
        .first();
      if (doc && doc.sort_order !== i) {
        await ctx.db.patch(doc._id, { sort_order: i });
      }
    }
  },
});

// ─── RENEWALS ─────────────────────────────────────────────────────────────────

export const createRenewal = mutation({
  args: { renewal: v.any() },
  handler: async (ctx, { renewal }) => {
    await ctx.db.insert('renewals', renewal);
  },
});

export const patchRenewal = mutation({
  args: { renewalId: v.string(), patch: v.any() },
  handler: async (ctx, { renewalId, patch }) => {
    const existing = await ctx.db
      .query('renewals')
      .withIndex('by_app_id', (q) => q.eq('id', renewalId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
  },
});

export const markRenewalRenewed = mutation({
  args: { renewalId: v.string(), patch: v.any(), nextRenewal: v.any() },
  handler: async (ctx, { renewalId, patch, nextRenewal }) => {
    const existing = await ctx.db
      .query('renewals')
      .withIndex('by_app_id', (q) => q.eq('id', renewalId))
      .first();
    if (existing) await ctx.db.patch(existing._id, patch);
    await ctx.db.insert('renewals', nextRenewal);
  },
});

export const deleteRenewal = mutation({
  args: { renewalId: v.string() },
  handler: async (ctx, { renewalId }) => {
    const existing = await ctx.db
      .query('renewals')
      .withIndex('by_app_id', (q) => q.eq('id', renewalId))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

export const appendLog = mutation({
  args: { log: v.any() },
  handler: async (ctx, { log }) => {
    await ctx.db.insert('activityLogs', log);
  },
});
