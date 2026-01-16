import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { supportAgent } from "../system/ai/agents/supportAgent";
import { paginationOptsValidator } from "convex/server";
import { saveMessage } from "@convex-dev/agent";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { OPERATOR_MESSAGE_ENHANCEMENT_PROMPT } from "../system/ai/constants";
import { getAuth, requireAuth } from "../lib/auth";

export const enhanceResponse = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx);

    const subsription = await ctx.runQuery(internal.system.subscriptions.getByOrganizationId, { organizationId: orgId,});

    // "active" status means a Pro (paid) subscription, not free tier
    if (subsription?.status !== "active") {
      throw new ConvexError({
        code: "PAYMENT_REQUIRED",
        message: "Active subscription required to enhance messages.",
      });
    }
    // Call the AI service to enhance the response
    const response = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: OPERATOR_MESSAGE_ENHANCEMENT_PROMPT,
        },
        {
          role: "user",
          content: args.prompt,
        },
      ],
    });
    return response.text;
  },
});

export const create = mutation({
  args: {
    prompt: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { orgId, identity } = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found.",
      });
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User does not have access to this conversation.",
      });
    }

    if (conversation.status === "resolved") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Cannot add messages to a resolved conversation.",
      });
    }

    if (conversation.status === "unresolved") {
      await ctx.db.patch(args.conversationId, { status: "escalated" });
    }

    await saveMessage(ctx, components.agent, {
      threadId: conversation.threadId,
      // TODO: Check if AgentName is needed or not
      agentName: identity.familyName,
      message: {
        role: "assistant",
        content: args.prompt,
      },
    });
  },
});

export const getMany = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const auth = await getAuth(ctx);
    if (!auth) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const { orgId } = auth;

    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .unique();

    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found.",
      });
    }

    if (conversation.organizationId !== orgId) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User does not have access to this conversation.",
      });
    }

    const paginaged = await supportAgent.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });

    return paginaged;
  },
});
