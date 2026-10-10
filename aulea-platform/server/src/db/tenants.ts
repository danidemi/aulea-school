import { eq } from 'drizzle-orm'
import { createDb } from './client.js'
import { tenants, users } from './schema.js'
import { isUniqueViolation } from './users.js'

export interface Tenant {
  id: string
  name: string
}

/**
 * TENANT-001: "check whether I'm already associated with a tenant, if not
 * create one and associate me to it". No multi-user-per-tenant membership
 * exists yet (the DoD only asks for a single `current tenant` per
 * `registered user`) — each user who has none gets their own, named after
 * their email so it's guaranteed unique without a separate name-picking
 * step. A later story can add inviting other users into an existing
 * tenant; this one doesn't need to anticipate that shape.
 */
export interface TenantRepository {
  ensureCurrentTenant(userId: string, email: string): Promise<Tenant>
}

export function createTenantRepository(databaseUrl: string): TenantRepository {
  const { db } = createDb(databaseUrl)

  async function findTenantById(tenantId: string): Promise<Tenant | null> {
    const rows = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1)
    return rows[0] ?? null
  }

  return {
    async ensureCurrentTenant(userId, email) {
      const userRows = await db.select({ currentTenantId: users.currentTenantId }).from(users).where(eq(users.id, userId)).limit(1)
      const existingTenantId = userRows[0]?.currentTenantId

      if (existingTenantId) {
        const existing = await findTenantById(existingTenantId)
        if (existing) return existing
        // currentTenantId pointed at a tenant that no longer exists — fall
        // through and create a fresh one, same as a user with none yet.
      }

      const tenantName = `${email}'s workspace`

      try {
        const created = await db.insert(tenants).values({ name: tenantName }).returning({ id: tenants.id, name: tenants.name })
        await db.update(users).set({ currentTenantId: created[0].id }).where(eq(users.id, userId))
        return created[0]
      } catch (err) {
        if (!isUniqueViolation(err)) throw err
        // A concurrent login for the same never-before-tenant user already
        // created and assigned it (the unique constraint is on
        // tenants.name, which is derived from this same email) — re-read
        // what that request set, rather than racing it.
        const retryRows = await db.select({ currentTenantId: users.currentTenantId }).from(users).where(eq(users.id, userId)).limit(1)
        const tenantId = retryRows[0]?.currentTenantId
        const tenant = tenantId ? await findTenantById(tenantId) : null
        if (!tenant) throw err
        return tenant
      }
    },
  }
}
