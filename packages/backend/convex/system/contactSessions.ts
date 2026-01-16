import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { SESSION_DURATION_MS } from "../constants";

const AUTO_REFRESH_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 1 hour

export const refresh = internalMutation({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact session not found",
      });
    }

    if(session.expiresAt < Date.now() ) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Contact session has expired",
      });
    }

    const timeRemaining = session.expiresAt - Date.now();
    if(timeRemaining < AUTO_REFRESH_THRESHOLD_MS) {
      const newExpiresAt = Date.now() + SESSION_DURATION_MS;
      await ctx.db.patch(args.contactSessionId, { expiresAt: newExpiresAt });
      return { ...session, expiresAt: newExpiresAt };
    }
  },
});

export const getOne = internalQuery({
  args: {
    contactSessionId: v.id("contactSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.contactSessionId);
    return session;
  },
});
