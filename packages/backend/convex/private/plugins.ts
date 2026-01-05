import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

export const remove = mutation({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const existingPlugin = await ctx.db
      .query("plugins")
      .withIndex("by_organization_id_and_service", (q) =>
        q.eq("organizationId", orgId).eq("service", args.service)
      )
      .unique();

    if (!existingPlugin) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Plugin not found for organization and service.",
      });
    }

    await ctx.db.delete(existingPlugin._id);
  },
});

export const getOne = query({
  args: {
    service: v.union(
      v.literal("vapi"),
      v.literal("openai"),
      v.literal("anthropic")
    ),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);
    return await ctx.db
        .query("plugins")
        .withIndex("by_organization_id_and_service", (q) =>
          q.eq("organizationId", orgId).eq("service", args.service)
        )
        .unique();
  }
});

// convex/
// ├── private/        # Client-facing, requires auth
// │   └── secrets.ts  # Validates user, schedules system action
// ├── system/         # Backend-only, trusted
// │   └── secrets.ts  # Calls Azure Key Vault
// ├── public/         # Client-facing, maybe less restrictive
// ├── lib/            # Helper functions (not Convex functions)
// │   └── secrets.ts  # Azure SDK wrapper
// └── _generated/     # Auto-generated types
