import { query, mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const getMany = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

export const add = mutation({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx);

    throw new Error("Tracking test");

    const userId = await ctx.db.insert("users", {
      name: "John Doe",
    });
    return userId;
  },
});
