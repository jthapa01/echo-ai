import { HTML_SCRIPT, JAVASCRIPT_SCRIPT, REACT_SCRIPT, NEXTJS_SCRIPT, type IntegrationId } from "./constants";

export const createScript = (integrationId: IntegrationId, organizationId: string) => {
    switch (integrationId) {
        case "html":
            return HTML_SCRIPT.replace("{{ORGANIZATION_ID}}", organizationId);
        case "react":
            return REACT_SCRIPT.replace("{{ORGANIZATION_ID}}", organizationId);
        case "nextjs":
            return NEXTJS_SCRIPT.replace("{{ORGANIZATION_ID}}", organizationId);
        case "javascript":
            return JAVASCRIPT_SCRIPT.replace("{{ORGANIZATION_ID}}", organizationId);
        default:
            throw new Error(`Unsupported integration ID: ${integrationId}`);
    };
};