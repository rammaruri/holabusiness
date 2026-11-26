import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    is_main_admin: v.optional(v.boolean()),
    is_disabled: v.optional(v.boolean()),
    password: v.optional(v.string()),
    avatar_url: v.optional(v.union(v.string(), v.null())),
    title: v.optional(v.union(v.string(), v.null())),
    client_company: v.optional(v.union(v.string(), v.null())),
    created_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_email', ['email']),

  projects: defineTable({
    id: v.string(),
    title: v.string(),
    client_name: v.string(),
    project_type: v.string(),
    status: v.string(),
    start_date: v.optional(v.union(v.string(), v.null())),
    target_end_date: v.optional(v.union(v.string(), v.null())),
    actual_end_date: v.optional(v.union(v.string(), v.null())),
    is_archived: v.boolean(),
    draft_reason: v.optional(v.union(v.string(), v.null())),
    draft_source_stage: v.optional(v.string()),
    remainder_next_date: v.optional(v.union(v.string(), v.null())),
    created_by: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  }).index('by_app_id', ['id']),

  memberships: defineTable({
    user_id: v.string(),
    project_ids: v.array(v.string()),
  }).index('by_user_id', ['user_id']),

  contacts: defineTable({
    id: v.string(),
    project_id: v.optional(v.union(v.string(), v.null())),
    company_name: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    role: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
    is_primary: v.optional(v.boolean()),
    can_access_portal: v.optional(v.boolean()),
    created_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  meetings: defineTable({
    id: v.string(),
    project_id: v.string(),
    title: v.string(),
    scheduled_at: v.string(),
    is_general_session: v.optional(v.boolean()),
    pain_points: v.optional(v.string()),
    solution_notes: v.optional(v.string()),
    expectations_goals: v.optional(v.string()),
    general_notes: v.optional(v.string()),
    outcome: v.string(),
    outcome_at: v.optional(v.string()),
    outcome_note: v.optional(v.string()),
    decision_edited_by: v.optional(v.string()),
    decision_edited_at: v.optional(v.string()),
    next_action_at: v.optional(v.string()),
    created_by: v.string(),
    created_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  clientTalks: defineTable({
    id: v.string(),
    project_id: v.string(),
    type: v.string(),
    date: v.string(),
    notes: v.string(),
    created_by: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.optional(v.string()),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  proposals: defineTable({
    id: v.string(),
    project_id: v.string(),
    title: v.string(),
    solution_overview: v.string(),
    workflow_team_schedule: v.string(),
    expected_deliverables_results: v.string(),
    long_term_support_services: v.string(),
    pricing_items: v.array(v.any()),
    currency: v.string(),
    total_one_time_cost: v.number(),
    total_recurring_cost: v.number(),
    status: v.string(),
    outcome_at: v.optional(v.string()),
    outcome_note: v.optional(v.string()),
    next_review_meeting_at: v.optional(v.string()),
    created_by: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  documents: defineTable({
    id: v.string(),
    project_id: v.string(),
    title: v.string(),
    doc_type: v.string(),
    file_name: v.string(),
    file_url: v.string(),
    file_size: v.optional(v.number()),
    is_mandatory: v.boolean(),
    is_signed_off: v.optional(v.boolean()),
    uploaded_by: v.string(),
    created_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  requirements: defineTable({
    id: v.string(),
    project_id: v.string(),
    scope_summary: v.string(),
    deliverables_json: v.array(v.any()),
    out_of_scope_notes: v.string(),
    updated_by: v.optional(v.union(v.string(), v.null())),
    updated_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  assets: defineTable({
    id: v.string(),
    project_id: v.string(),
    name: v.string(),
    doc_type: v.string(),
    drive_link: v.string(),
    notes: v.optional(v.union(v.string(), v.null())),
    folder_category: v.optional(v.string()),
    file_name: v.optional(v.string()),
    file_url: v.optional(v.string()),
    file_size: v.optional(v.number()),
    version_tag: v.optional(v.string()),
    client_approved: v.optional(v.boolean()),
    uploaded_by: v.string(),
    created_at: v.string(),
    updated_at: v.optional(v.string()),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  credentials: defineTable({
    id: v.string(),
    project_id: v.string(),
    service_name: v.string(),
    category: v.optional(v.union(v.string(), v.null())),
    login_url: v.optional(v.union(v.string(), v.null())),
    username: v.string(),
    encrypted_secret: v.string(),
    iv: v.string(),
    auth_tag: v.string(),
    notes: v.optional(v.union(v.string(), v.null())),
    updated_by: v.string(),
    updated_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  tasks: defineTable({
    id: v.string(),
    project_id: v.string(),
    title: v.string(),
    description: v.string(),
    assignee_id: v.optional(v.union(v.string(), v.null())),
    status: v.string(),
    priority: v.string(),
    start_date: v.optional(v.union(v.string(), v.null())),
    due_date: v.string(),
    completed_at: v.optional(v.union(v.string(), v.null())),
    is_delayed: v.boolean(),
    blocked_by_task_id: v.optional(v.union(v.string(), v.null())),
    linked_deliverable: v.optional(v.union(v.string(), v.null())),
    deliverable_url: v.optional(v.union(v.string(), v.null())),
    is_edited: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  renewals: defineTable({
    id: v.string(),
    project_id: v.string(),
    title: v.string(),
    vendor: v.optional(v.string()),
    amount: v.number(),
    renewal_date: v.string(),
    remind_days: v.number(),
    renewed: v.boolean(),
    renewed_on: v.optional(v.string()),
    renewed_amount_paid: v.optional(v.number()),
    renewed_notes: v.optional(v.string()),
    created_at: v.string(),
    updated_at: v.optional(v.string()),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  activityLogs: defineTable({
    id: v.string(),
    project_id: v.string(),
    user_id: v.string(),
    action_type: v.string(),
    entity_type: v.string(),
    entity_id: v.optional(v.union(v.string(), v.null())),
    change_summary: v.string(),
    metadata_json: v.any(),
    created_at: v.string(),
  })
    .index('by_app_id', ['id'])
    .index('by_project_id', ['project_id']),

  meta: defineTable({
    key: v.string(),
    value: v.any(),
  }).index('by_key', ['key']),
});
