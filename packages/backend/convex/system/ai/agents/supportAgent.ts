import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";

export const supportAgent = new Agent(components.agent, {
  chat: openai("gpt-4o-mini"),
  instructions:
    "You are a helpful customer support agent. Assist the user with their inquiries in a friendly and professional manner.",
});
