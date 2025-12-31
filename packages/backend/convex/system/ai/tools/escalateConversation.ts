import { createTool } from "@convex-dev/agent";
import z from "zod";
import { internal } from "../../../_generated/api";
import { supportAgent } from "../agents/supportAgent";

export const escalateConversationTool = createTool({
    description: "Escalate a customer support conversation to a human agent.",
    args: z.object({}),
    handler: async (ctx) => {
        if (!ctx.threadId) {
            return "Missing thread ID";
        }
        await ctx.runMutation(internal.system.conversations.escalate, {
            threadId: ctx.threadId,
        });

        await supportAgent.saveMessage(ctx, {
            threadId: ctx.threadId,
            message: {
                role: "assistant",
                content: "The conversation has been escalated to a human agent.",
            },
        });
        return "Conversation escalated to a human agent.";
    },
});