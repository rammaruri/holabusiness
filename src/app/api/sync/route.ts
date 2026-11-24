import { NextResponse } from 'next/server';
import { getTursoClient } from '@/lib/turso';
import { DEMO_USERS, INITIAL_SHELL_PROJECTS } from '@/lib/auth-personas';
import {
  INITIAL_ACTIVITY_LOGS,
  INITIAL_ASSETS,
  INITIAL_CLIENT_TALKS,
  INITIAL_CONTACTS,
  INITIAL_CREDENTIALS,
  INITIAL_DOCUMENTS,
  INITIAL_MEETINGS,
  INITIAL_PROPOSALS,
  INITIAL_RENEWALS,
  INITIAL_REQUIREMENTS,
  INITIAL_TASKS,
} from '@/lib/initial-data';

async function ensureStoreTable(client: any) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS workspace_store (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export async function GET(req: Request) {
  const client = getTursoClient();

  if (!client) {
    return NextResponse.json({
      configured: false,
      message: 'Turso database is not configured. Running in local fallback mode.',
    });
  }

  try {
    await ensureStoreTable(client);

    const { searchParams } = new URL(req.url);
    if (searchParams.get('check') === 'version') {
      const verRes = await client.execute('SELECT MAX(updated_at) as latest_version FROM workspace_store');
      const latest_version = verRes.rows[0]?.latest_version || null;
      return NextResponse.json({
        configured: true,
        latest_version,
      });
    }

    // Fetch all keys from workspace_store
    const res = await client.execute('SELECT key, value_json, updated_at FROM workspace_store');
    const store: Record<string, any> = {};
    let latest_version: string | null = null;

    for (const row of res.rows) {
      if (row.updated_at && (latest_version === null || String(row.updated_at) > latest_version)) {
        latest_version = String(row.updated_at);
      }
      if (typeof row.key === 'string' && typeof row.value_json === 'string') {
        try {
          store[row.key] = JSON.parse(row.value_json);
        } catch {
          store[row.key] = null;
        }
      }
    }

    // Seeding happens ONLY ONCE on absolute first initialization.
    // We check _system_seeded so that user deletions (e.g. 0 projects or customized users) are NEVER wiped!
    if (!store._system_seeded) {
      const initialSeed: Record<string, any> = {
        _system_seeded: true,
        users: DEMO_USERS,
        projects: INITIAL_SHELL_PROJECTS,
        contacts: INITIAL_CONTACTS,
        meetings: INITIAL_MEETINGS,
        clientTalks: INITIAL_CLIENT_TALKS,
        proposals: INITIAL_PROPOSALS,
        documents: INITIAL_DOCUMENTS,
        requirements: INITIAL_REQUIREMENTS,
        assets: INITIAL_ASSETS,
        credentials: INITIAL_CREDENTIALS,
        tasks: INITIAL_TASKS,
        renewals: INITIAL_RENEWALS,
        activityLogs: INITIAL_ACTIVITY_LOGS,
      };

      for (const [k, v] of Object.entries(initialSeed)) {
        await client.execute({
          sql: `INSERT INTO workspace_store (key, value_json, updated_at) 
                VALUES (?, ?, datetime('now')) 
                ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=datetime('now')`,
          args: [k, JSON.stringify(v)],
        });
        store[k] = v;
      }
    }

    // Clean migration: If store.users contains dummy accounts (Elena Vance or Marcus Chen), upgrade to real founder
    if (Array.isArray(store.users)) {
      let needsMigration = false;
      const cleanedUsers = store.users
        .filter((u: any) => u.id !== 'usr-admin-2') // Remove Marcus Chen
        .map((u: any) => {
          if (u.id === 'usr-admin-1' && (u.email === 'elena@holabusiness.io' || u.name === 'Elena Vance')) {
            needsMigration = true;
            return {
              ...u,
              name: 'Ram Maruri',
              email: 'ram@holabusiness.in',
              title: 'Primary Founder & Managing Partner',
              password: u.password === 'admin' ? 'admin123' : (u.password || 'admin123'),
              role: 'admin',
              is_main_admin: true,
            };
          }
          return u;
        });

      if (needsMigration || cleanedUsers.length !== store.users.length) {
        store.users = cleanedUsers;
        try {
          await client.execute({
            sql: `INSERT INTO workspace_store (key, value_json, updated_at) 
                  VALUES ('users', ?, datetime('now')) 
                  ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=datetime('now')`,
            args: [JSON.stringify(cleanedUsers)],
          });
          await client.execute("DELETE FROM users WHERE id = 'usr-admin-2'");
          await client.execute({
            sql: `UPDATE users SET name = 'Ram Maruri', email = 'ram@holabusiness.in', title = 'Primary Founder & Managing Partner', password = 'admin123' WHERE id = 'usr-admin-1'`,
          });
        } catch (e) {
          console.warn('User migration warning:', e);
        }
      }
    }

    return NextResponse.json({
      configured: true,
      latest_version,
      data: store,
    });
  } catch (err: any) {
    console.error('Error in GET /api/sync:', err);
    return NextResponse.json(
      { configured: false, error: err.message || 'Failed to fetch from Turso' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const client = getTursoClient();

  if (!client) {
    return NextResponse.json(
      { success: false, error: 'Turso database is not configured' },
      { status: 503 }
    );
  }

  try {
    await ensureStoreTable(client);
    const body = await req.json();

    // Supports updating a single key: { key: 'projects', data: [...] }
    // Or multiple keys: { updates: { projects: [...], tasks: [...] } }
    const updates: Record<string, any> = {};

    if (body.key && body.data !== undefined) {
      updates[body.key] = body.data;
    } else if (body.updates && typeof body.updates === 'object') {
      Object.assign(updates, body.updates);
    }

    for (const [key, value] of Object.entries(updates)) {
      await client.execute({
        sql: `INSERT INTO workspace_store (key, value_json, updated_at) 
              VALUES (?, ?, datetime('now')) 
              ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=datetime('now')`,
        args: [key, JSON.stringify(value)],
      });

      // Synchronize to relational tables where relevant for external SQL querying
      if (key === 'projects' && Array.isArray(value)) {
        if (value.length > 0) {
          const ids = value.map((p) => `'${p.id.replace(/'/g, "''")}'`).join(',');
          try {
            await client.execute(`DELETE FROM projects WHERE id NOT IN (${ids})`);
          } catch (e) {}
        } else {
          try {
            await client.execute('DELETE FROM projects');
          } catch (e) {}
        }

        for (const p of value) {
          try {
            await client.execute({
              sql: `INSERT INTO projects (id, title, client_name, project_type, status, start_date, target_end_date, actual_end_date, is_archived, draft_reason, draft_source_stage, remainder_next_date, created_by, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET 
                      title=excluded.title, client_name=excluded.client_name, project_type=excluded.project_type, status=excluded.status, 
                      start_date=excluded.start_date, target_end_date=excluded.target_end_date, actual_end_date=excluded.actual_end_date, 
                      is_archived=excluded.is_archived, draft_reason=excluded.draft_reason, draft_source_stage=excluded.draft_source_stage, 
                      remainder_next_date=excluded.remainder_next_date, updated_at=datetime('now')`,
              args: [
                p.id,
                p.title,
                p.client_name,
                p.project_type,
                p.status,
                p.start_date ?? null,
                p.target_end_date ?? null,
                p.actual_end_date ?? null,
                p.is_archived ? 1 : 0,
                p.draft_reason ?? null,
                p.draft_source_stage ?? null,
                p.remainder_next_date ?? null,
                p.created_by ?? 'usr-admin-1',
                p.created_at ?? new Date().toISOString(),
                p.updated_at ?? new Date().toISOString(),
              ],
            });
          } catch (e) {
            // Ignore minor relation constraint warnings during batch
          }
        }
      }

      if (key === 'users' && Array.isArray(value)) {
        if (value.length > 0) {
          const ids = value.map((u) => `'${u.id.replace(/'/g, "''")}'`).join(',');
          try {
            await client.execute(`DELETE FROM users WHERE id NOT IN (${ids}) AND is_main_admin = 0`);
            await client.execute("DELETE FROM users WHERE id = 'usr-admin-2'");
          } catch (e) {}
        }
        for (const u of value) {
          try {
            await client.execute({
              sql: `INSERT INTO users (id, name, email, role, is_main_admin, is_disabled, password, title, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                      name=excluded.name, email=excluded.email, role=excluded.role,
                      is_main_admin=excluded.is_main_admin, is_disabled=excluded.is_disabled,
                      password=excluded.password, title=excluded.title`,
              args: [
                u.id,
                u.name,
                u.email,
                u.role ?? 'admin',
                u.is_main_admin ? 1 : 0,
                u.is_disabled ? 1 : 0,
                u.password ?? 'admin123',
                u.title ?? null,
                u.created_at ?? new Date().toISOString(),
              ],
            });
          } catch (e) {
            try {
              await client.execute({
                sql: `UPDATE users SET name = ?, email = ?, role = ?, title = ?, password = ? WHERE id = ?`,
                args: [u.name, u.email, u.role ?? 'admin', u.title ?? null, u.password ?? 'admin123', u.id],
              });
            } catch (e2) {}
          }
        }
      }
    }

    return NextResponse.json({ success: true, updatedKeys: Object.keys(updates) });
  } catch (err: any) {
    console.error('Error in POST /api/sync:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update Turso' },
      { status: 500 }
    );
  }
}
