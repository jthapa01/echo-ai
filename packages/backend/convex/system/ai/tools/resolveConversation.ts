import { createTool } from "@convex-dev/agent";
import { supportAgent } from "../agents/supportAgent";
import z from "zod";
import { internal } from "../../../_generated/api";

export const resolveConversationTool = createTool({
  description: "Resolve a customer support conversation.",
  args: z.object({}),
  handler: async (ctx) => {
    if (!ctx.threadId) {
      return "Missing thread ID";
    }

    await ctx.runMutation(internal.system.conversations.resolve, {
      threadId: ctx.threadId,
    });

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: "The conversation has been resolved.",
      },
    });
    return "Conversation resolved.";
  },
});
