import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuth, requireAuth } from "../lib/auth";

export const upsert = mutation({
  args: {
    greetMessage: v.string(),
    defaultSuggestions: v.object({
      suggestion1: v.optional(v.string()),
      suggestion2: v.optional(v.string()),
      suggestion3: v.optional(v.string()),
    }),
    vapiSettings: v.object({
      assistantId: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);
    const existingWidgetSettings = await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();

    if (existingWidgetSettings) {
      await ctx.db.patch(existingWidgetSettings._id, {
        greetMessage: args.greetMessage,
        defaultSuggestions: args.defaultSuggestions,
        vapiSettings: args.vapiSettings,
      });
      return { widgetSettingsId: existingWidgetSettings._id, updated: true };
    } else {
      const widgetSettingsId = await ctx.db.insert("widgetSettings", {
        organizationId: orgId,
        greetMessage: args.greetMessage,
        defaultSuggestions: args.defaultSuggestions,
        vapiSettings: args.vapiSettings,
      });
      return { widgetSettingsId, updated: false };
    }
  },
});

export const getOne = query({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuth(ctx);
    if (!auth) {
      return null;
    }
    const { orgId } = auth;
    return await ctx.db
      .query("widgetSettings")
      .withIndex("by_organization_id", (q) => q.eq("organizationId", orgId))
      .unique();
  },
});
