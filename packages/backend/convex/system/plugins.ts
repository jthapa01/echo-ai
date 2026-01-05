/**
 * system/plugins.ts - Internal mutations for plugin record management
 *
 * PURPOSE:
 * - Called ONLY by backend (other Convex functions)
 * - NOT exposed to frontend clients
 * - Manages plugin records in the database
 *
 * WHY INTERNAL MUTATION?
 * - Actions cannot write to the database directly
 * - After storing secret in Key Vault (via action), we need to record
 *   the plugin in the database (via mutation)
 * - "internal" means clients cannot call directly (security)
 *
 * FLOW:
 * private/secrets.upsert (action)
 *   → ctx.runAction(internal.system.secrets.upsert) → Azure Key Vault
 *   → ctx.runMutation(internal.system.plugins.upsert) → Database
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Internal mutation to upsert a plugin record in the database
 * Called by private/secrets.ts action after Key Vault operation succeeds
 */
export const upsert = internalMutation({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
    organizationId: v.string(),
    secretName: v.string(),
  },
  handler: async (ctx, args) => {
    const { service, organizationId, secretName } = args;

    // Check if plugin record already exists
    const existingPlugin = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", organizationId).eq("service", service)
      )
      .unique();

    if (existingPlugin) {
      // Update existing record
      await ctx.db.patch(existingPlugin._id, { secretName });
      return { pluginId: existingPlugin._id, updated: true };
    } else {
      // Create new record
      const pluginId = await ctx.db.insert("plugins", {
        organizationId,
        service,
        secretName,
      });
      return { pluginId, updated: false };
    }
  },
});

/**
 * Internal mutation to remove a plugin record from the database
 * Called by private/secrets.ts action after Key Vault deletion succeeds
 */
export const remove = internalMutation({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { service, organizationId } = args;

    const existingPlugin = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", organizationId).eq("service", service)
      )
      .unique();

    if (existingPlugin) {
      await ctx.db.delete(existingPlugin._id);
      return { deleted: true };
    }

    return { deleted: false };
  },
});


// Key Convex constraint:

// Mutations can write to the database but cannot make HTTP calls
// Actions can make HTTP calls but cannot write to the database directly