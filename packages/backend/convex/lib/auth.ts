/**
 * lib/auth.ts - Authentication utilities for Convex functions
 *
 * PURPOSE:
 * - Provides reusable authentication helpers
 * - Reduces code duplication across private/ functions
 * - Centralizes error handling for auth-related checks
 *
 * USAGE:
 * ```typescript
 * const { orgId, identity } = await requireAuth(ctx);
 * // Use orgId safely - it's guaranteed to be a valid string
 * ```
 */

import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { UserIdentity } from "convex/server";

/**
 * Context type that has auth capabilities
 * Works with query, mutation, and action contexts
 */
type AuthCapableCtx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Result of successful authentication
 */
export type AuthResult = {
  /** The authenticated user's identity (from Clerk/Auth0/etc) */
  identity: UserIdentity;
  /** The organization ID the user belongs to */
  orgId: string;
};

/**
 * Validates that the user is authenticated and belongs to an organization.
 * Throws ConvexError if either check fails.
 *
 * @param ctx - The Convex context (query, mutation, or action)
 * @returns The identity object and orgId, both guaranteed to be valid
 * @throws ConvexError with code "UNAUTHORIZED" if not authenticated or missing orgId
 *
 * @example
 * ```typescript
 * export const myMutation = mutation({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const { orgId, identity } = await requireAuth(ctx);
 *     // orgId is guaranteed to be a valid string
 *     // identity is the full user identity object
 *   },
 * });
 * ```
 */
export async function requireAuth(ctx: AuthCapableCtx): Promise<AuthResult> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "User must be authenticated",
    });
  }

  const orgId = identity.orgId as string | undefined;

  if (!orgId) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "User must belong to an organization",
    });
  }

  return { identity, orgId };
}

/**
 * Gets the user identity if authenticated, returns null otherwise.
 * Does NOT throw an error - useful for optional auth scenarios.
 *
 * @param ctx - The Convex context (query, mutation, or action)
 * @returns The identity and orgId if authenticated with an org, or null
 */
export async function getAuth(ctx: AuthCapableCtx): Promise<AuthResult | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    return null;
  }

  const orgId = identity.orgId as string | undefined;

  if (!orgId) {
    return null;
  }

  return { identity, orgId };
}
