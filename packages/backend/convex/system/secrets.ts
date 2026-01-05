/**
 * system/secrets.ts - Internal actions for Azure Key Vault operations
 *
 * PURPOSE:
 * - Called ONLY by backend (other Convex functions)
 * - NOT exposed to frontend clients
 * - Makes actual HTTP calls to Azure Key Vault
 *
 * WHY INTERNAL ACTION?
 * - internalAction CAN make HTTP calls (unlike mutations)
 * - "internal" means clients cannot call directly (security)
 * - Only backend can invoke via: internal.system.secrets.upsert
 *
 * WHO CALLS THIS?
 * - private/secrets.ts mutations (via scheduler)
 * - Other backend functions that need to read secrets
 *
 * FLOW:
 * private/secrets.upsert (mutation)
 *   → ctx.scheduler.runAfter(0, internal.system.secrets.upsert, {...})
 *   → THIS FILE: upsert (internalAction)
 *   → lib/secrets.ts: setOrgSecretJson()
 *   → Azure Key Vault REST API
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import {
  setOrgSecretJson,
  getOrgSecretJson,
  deleteOrgSecret,
} from "../lib/secrets";

/**
 * Internal action to upsert a secret in Azure Key Vault
 * Called by the private mutation via scheduler
 */
export const upsert = internalAction({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
    organizationId: v.string(),
    value: v.any(),
  },
  handler: async (_ctx, args) => {
    const { service, organizationId, value } = args;

    // Store the secret in Azure Key Vault
    const secretName = await setOrgSecretJson(organizationId, service, {
      ...value,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Secret stored: ${secretName} for org ${organizationId}`);

    return { success: true, secretName };
  },
});

/**
 * Internal action to get a secret from Azure Key Vault
 */
export const get = internalAction({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
    organizationId: v.string(),
  },
  handler: async (_ctx, args) => {
    const { service, organizationId } = args;

    const secret = await getOrgSecretJson(organizationId, service);

    return secret;
  },
});

/**
 * Internal action to delete a secret from Azure Key Vault
 */
export const remove = internalAction({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
    organizationId: v.string(),
    purge: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const { service, organizationId, purge = false } = args;

    await deleteOrgSecret(organizationId, service, purge);

    console.log(`Secret deleted: org-${organizationId}-${service}`);

    return { success: true };
  },
});

/**
 * Internal action to check if a secret exists
 */
export const exists = internalAction({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
    organizationId: v.string(),
  },
  handler: async (_ctx, args) => {
    const { service, organizationId } = args;

    const secret = await getOrgSecretJson(organizationId, service);

    return { exists: secret !== null };
  },
});
