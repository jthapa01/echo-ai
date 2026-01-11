import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { getSecretJsonByName } from "../lib/secrets";

export const getVapiSecrets = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const plugin = await ctx.runQuery(
      internal.system.plugins.getByOrganizationIdAndService,
      {
        organizationId: args.organizationId,
        service: "vapi",
      }
    );

    if (!plugin) {
        return null;
    }
    const secretName = plugin.secretName;
    const secretJson = await getSecretJsonByName(secretName);
    if (!secretJson) {
        return null;
    }

    if(!secretJson.publicApiKey || !secretJson.privateApiKey) {
        return null;
    }

    return {
        publicApiKey: secretJson.publicApiKey,
    };
  },
});
