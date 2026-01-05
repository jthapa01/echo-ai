/**
 * private/secrets.ts - Client-facing actions for secret management
 *
 * PURPOSE:
 * - Called by frontend clients (React components via useAction hook)
 * - Handles authentication and authorization
 * - Validates user identity and extracts orgId
 *
 * WHY ACTION (not MUTATION)?
 * ─────────────────────────────────────────────────────────────────────
 * We need to call Azure Key Vault API (HTTP) and WAIT for the result
 * so the frontend knows if it succeeded or failed.
 *
 * OPTION 1: mutation + scheduler.runAfter(0, ...) ❌
 *   - scheduler.runAfter is FIRE-AND-FORGET
 *   - Mutation returns immediately, before action even starts
 *   - Frontend shows "success" but action might fail later
 *   - Error is logged in Convex dashboard but lost to frontend
 *
 * OPTION 2: action + ctx.runAction(...) ✅ (what we use)
 *   - ctx.runAction WAITS for the internal action to complete
 *   - If Azure Key Vault fails, error propagates to frontend
 *   - Frontend can catch error and show toast.error
 *
 * From Convex docs on scheduler.runAfter:
 *   "Scheduling from actions does not depend on the outcome of the function.
 *    This means an action might succeed to schedule some functions and later
 *    fail due to transient error. The scheduled functions will still execute."
 *
 * FLOW:
 * Frontend (useAction) → private/secrets.upsert (action)
 *                      → validates auth, gets orgId
 *                      → ctx.runAction(internal.system.secrets.upsert) ← WAITS
 *                      → system/secrets.upsert (internalAction)
 *                      → lib/secrets.ts → Azure Key Vault API
 *                      → returns result OR throws error to frontend
 */

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuth } from "../lib/auth";

/**
 * Upsert a secret for the authenticated organization
 * Uses ctx.runAction to WAIT for Azure Key Vault response
 *
 * @throws Error if Azure Key Vault operation fails (caught by frontend try/catch)
 */
export const upsert = action({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    // TODO: Check for subscription

    // Step 1: Store secret in Azure Key Vault
    // ctx.runAction WAITS for the internal action to complete
    // If Azure fails, the error propagates up to the frontend's catch block
    const result = await ctx.runAction(internal.system.secrets.upsert, {
      service: args.service,
      organizationId: orgId,
      value: args.value,
    });

    // Step 2: Create/update plugin record in database
    // Only runs if Key Vault operation succeeded
    await ctx.runMutation(internal.system.plugins.upsert, {
      service: args.service,
      organizationId: orgId,
      secretName: result.secretName,
    });

    // Only reaches here if both operations succeeded
    return { success: true };
  },
});

/**
 * Delete a secret for the authenticated organization
 * Uses ctx.runAction to WAIT for Azure Key Vault response
 *
 * @throws Error if Azure Key Vault operation fails (caught by frontend try/catch)
 */
export const remove = action({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    // Step 1: Delete secret from Azure Key Vault
    // ctx.runAction WAITS for deletion to complete
    await ctx.runAction(internal.system.secrets.remove, {
      service: args.service,
      organizationId: orgId,
    });

    // Step 2: Remove plugin record from database
    // Only runs if Key Vault deletion succeeded
    await ctx.runMutation(internal.system.plugins.remove, {
      service: args.service,
      organizationId: orgId,
    });

    // Only reaches here if both operations succeeded
    return { success: true };
  },
});
