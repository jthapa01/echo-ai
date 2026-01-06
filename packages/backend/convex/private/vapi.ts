import { VapiClient, Vapi } from "@vapi-ai/server-sdk";
import { internal } from "../_generated/api";
import { ActionCtx, action } from "../_generated/server";
import { getOrgSecretJson } from "../lib/secrets";
import { ConvexError } from "convex/values";
import { requireAuth } from "../lib/auth";

interface VapiSecret {
  publicApiKey: string;
  privateApiKey: string;
  updatedAt: string;
}

/**
 * Helper to get an authenticated VapiClient for the current organization
 * Handles all validation: plugin exists, secret exists, credentials complete
 */
async function getVapiClient(ctx: ActionCtx): Promise<VapiClient> {
  const { orgId } = await requireAuth(ctx);

  const plugin = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    {
      organizationId: orgId,
      service: "vapi",
    }
  );

  if (!plugin) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Vapi plugin not configured for organization.",
    });
  }

  // Use "vapi" as secretType, not plugin.secretName (which is the full name)
  const secretValue = await getOrgSecretJson<VapiSecret>(orgId, "vapi");

  if (!secretValue) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Vapi secret not found for organization.",
    });
  }

  if (!secretValue.privateApiKey || !secretValue.publicApiKey) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Credentials incomplete. Please reconnect your Vapi account.",
    });
  }

  return new VapiClient({ token: secretValue.privateApiKey });
}

export const getAssistants = action({
  args: {},
  handler: async (ctx): Promise<Vapi.Assistant[]> => {
    const client = await getVapiClient(ctx);
    return await client.assistants.list();
  },
});

export const getPhoneNumbers = action({
  args: {},
  handler: async (ctx): Promise<Vapi.PhoneNumbersListResponseItem[]> => {
    const client = await getVapiClient(ctx);
    return await client.phoneNumbers.list();
  },
});
