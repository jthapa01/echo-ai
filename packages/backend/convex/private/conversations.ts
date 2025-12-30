import { query } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { MessageDoc } from "@convex-dev/agent";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import { Doc } from "../_generated/dataModel";

export const getMany = query({
    args: {
        paginationOpts: paginationOptsValidator,
        status: v.optional(
            v.union(
                v.literal("unresolved"),
                v.literal("resolved"),
                v.literal("escalated")
            )
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "User must be authenticated to fetch conversations",
            });
        }

        const organizationId = identity.orgId as string;
        if (!organizationId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Missing organization ID",
            });
        }

        let conversations: PaginationResult<Doc<"conversations">>;
        if (args.status) {
            conversations = await ctx.db.query("conversations")
                .withIndex("by_status_and_organization_id", (q) =>
                    q.eq("status", args.status as Doc<"conversations">["status"]).eq("organizationId", organizationId)
                )
                .order("desc")
                .paginate(args.paginationOpts);
        } else {
            conversations = await ctx.db.query("conversations")
                .withIndex("by_organization_id", (q) =>
                    q.eq("organizationId", organizationId)
                )
                .order("desc")
                .paginate(args.paginationOpts);
        }

        const conversationsWithAdditionalData = await Promise.all(
            conversations.page.map(async (conversation) => {
                let lastMessage: MessageDoc | null = null;
                // fetch one doc by ID
                const contactSession = await ctx.db.get(conversation.contactSessionId);

                if (!contactSession)
                    return null;

                // fetches conversation message from agent:messages table in convex db
                const messages = await supportAgent.listMessages(ctx, {
                    threadId: conversation.threadId,
                    paginationOpts: { numItems: 1, cursor: null }, // only get the latest message
                });

                if (messages.page.length > 0) {
                    lastMessage = messages.page[0] ?? null;
                }

                return {
                    ...conversation,
                    lastMessage,
                    contactSession,
                };
            })
        );
        const validConversations = conversationsWithAdditionalData.filter(
            (conv): conv is NonNullable<typeof conv> => conv !== null
        );

        return {
            ...conversations,
            page: validConversations,
        };
    },
});