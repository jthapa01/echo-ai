import { CONTACT_SESSION_KEY } from './../../../../apps/widget/modules/widget/constants';
import { ConvexError, v } from "convex/values";
import { action, query } from "../_generated/server";
import { internal, components } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { escalateConversationTool } from "../system/ai/tools/escalateConversation";
import { resolveConversationTool } from "../system/ai/tools/resolveConversation";
import { saveMessage } from "@convex-dev/agent";

export const create = action({
    args: {
        prompt: v.string(),
        threadId: v.string(),
        contactSessionId: v.id("contactSessions"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.runQuery(
            internal.system.contactSessions.getOne, 
            { contactSessionId: args.contactSessionId }
        );

        if (!session || session.expiresAt < Date.now()) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Contact session is invalid or expired",
            });
        }

        const conversation = await ctx.runQuery(
            internal.system.conversations.getByThreadId, 
            { threadId: args.threadId }
        );

        if (!conversation) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Conversation not found",
            });
        }

        if(conversation.status === "resolved") {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Conversation is resolved",
            });
        }

        // TODO: Implement subscription check here
        const shouldTriggerAgent = conversation.status === "unresolved";
        //This sends a message to the AI agent and gets a response.
        if(shouldTriggerAgent) {
            await supportAgent.generateText(
                ctx,
                { threadId: args.threadId },
                { 
                    prompt: args.prompt,
                    tools: {escalateConversationTool, resolveConversationTool}
                }
            )
        } else {
            await saveMessage(ctx, components.agent, {
                threadId: args.threadId,
                prompt: args.prompt,
            });
        }
    },
});

export const getMany = query({
    args: {
        threadId: v.string(),
        paginationOpts: paginationOptsValidator,
        contactSessionId: v.id("contactSessions"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.contactSessionId);
        if (!session || session.expiresAt < Date.now()) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Contact session is invalid or expired",
            });
        }
        const paginated = await supportAgent.listMessages(
            ctx,
            { 
                threadId: args.threadId,
                paginationOpts: args.paginationOpts
            }
        );
        return paginated;
    }
});