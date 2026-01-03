import { definePlaygroundAPI } from "@convex-dev/agent-playground";
import { components } from "./_generated/api";
import { supportAgent } from "./system/ai/agents/supportAgent";

/**
 * The Agent Playground gives you a web UI to test your AI agent without building your own frontend:
 * Here we expose the API so the frontend can access it.
 * Authorization is handled by passing up an apiKey that can be generated
 * on the dashboard or via CLI via:
 *  1. Generate an API key
 *    npx convex run --component agent apiKeys:issue
 *  2. Open the playground:
 *    Visit https://playground.convex.dev and enter your Convex deployment URL + API key
 *  3. Test your agent — send messages, see tool calls, debug responses
 */
export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, {
  agents: [supportAgent],
});