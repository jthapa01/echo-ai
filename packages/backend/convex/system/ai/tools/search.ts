import { openai } from "@ai-sdk/openai";
import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import z from "zod";
import { internal } from "../../../_generated/api";
import { supportAgent } from "../agents/supportAgent";
import rag from "../rag";
import { SEARCH_INTERPRETER_PROMPT } from "../constants";

export const searchTool = createTool({
  description:
    "Search the organization's knowledge base to find relevant information.",
  args: z.object({
    query: z.string().describe("The user's question or topic to search for."),
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      return "Missing thread ID";
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId }
    );

    if (!conversation) {
      return "Conversation not found.";
    }

    const orgId = conversation.organizationId;
    const searchResult = await rag.search(ctx, {
      namespace: orgId,
      query: args.query,
      limit: 5,
    });

    const contextText = `Found results in ${searchResult.entries
      .map((entry) => entry.title || null)
      .filter((title) => title !== null)
      .join(", ")}. Here is the context:\n\n${searchResult.text}`;

    const response = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: SEARCH_INTERPRETER_PROMPT,
        },
        {
          role: "user",
          content: `Use the following context to answer the question:\n\n${contextText}\n\nQuestion: ${args.query}`,
        },
      ],
    });

    // saves the message to agent's thread message table
    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: response.text,
      }
    });

    return response.text;
  },
});

// 1. UPLOAD: User uploads "faq.pdf" (5 pages)
//                     ↓
// 2. EXTRACT: extractTextContent() → gets all text from PDF
//                     ↓
// 3. CHUNK: RAG splits into smaller pieces
//    Chunk 1: "How to reset password: Go to settings..."
//    Chunk 2: "Billing FAQ: We accept Visa, Mastercard..."
//    Chunk 3: "Refund policy: Full refund within 30 days..."
//    ...
//                     ↓
// 4. EMBED: Each chunk → embedding vector
//    [0.12, -0.05, ...] for Chunk 1
//    [0.33, 0.18, ...] for Chunk 2
//    ...
//                     ↓
// 5. STORE: Saved in rag:entries + rag:embeddings tables
