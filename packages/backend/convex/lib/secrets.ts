import { SecretClient } from "@azure/keyvault-secrets";
import { ClientSecretCredential } from "@azure/identity";
import { RestError } from "@azure/core-rest-pipeline";

/**
 * Azure Key Vault client for managing tenant secrets
 * Used for storing/retrieving VAPI API keys and other sensitive data
 */

// Lazy-initialized client singleton
let secretClient: SecretClient | null = null;

/**
 * Get or create the Key Vault SecretClient
 * Uses environment variables for authentication
 */
function getSecretClient(): SecretClient {
  if (secretClient) {
    return secretClient;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const vaultUrl = process.env.AZURE_KEYVAULT_URL;

  if (!tenantId || !clientId || !clientSecret || !vaultUrl) {
    throw new Error(
      "Missing Azure Key Vault configuration. Required env vars: " +
        "AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_KEYVAULT_URL"
    );
  }

  const credential = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
  );

  secretClient = new SecretClient(vaultUrl, credential);
  return secretClient;
}

/**
 * Check if error is a 404 Not Found
 */
function isNotFoundError(error: unknown): boolean {
  return error instanceof RestError && error.statusCode === 404;
}

/**
 * Sanitize a string to be valid for Azure Key Vault secret names.
 * Key Vault names can only contain alphanumeric characters and dashes.
 * Replaces underscores and other invalid characters with dashes.
 */
function sanitizeForKeyVault(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/**
 * Generate a consistent secret name for an organization's VAPI key
 */
function getVapiSecretName(orgId: string): string {
  // Azure Key Vault secret names must be alphanumeric with dashes
  // Max 127 characters
  // Clerk orgId already starts with "org_", so we just sanitize it
  const sanitizedOrgId = sanitizeForKeyVault(orgId);
  return `${sanitizedOrgId}-vapi-key`;
}

/**
 * Store a tenant's VAPI API key in Key Vault
 * @param orgId - The organization ID
 * @param vapiKey - The VAPI API key to store
 * @returns The secret name that was created
 */
export async function setVapiKey(
  orgId: string,
  vapiKey: string
): Promise<string> {
  const client = getSecretClient();
  const secretName = getVapiSecretName(orgId);

  await client.setSecret(secretName, vapiKey, {
    contentType: "text/plain",
    tags: {
      orgId,
      type: "vapi-api-key",
      createdAt: new Date().toISOString(),
    },
  });

  return secretName;
}

/**
 * Retrieve a tenant's VAPI API key from Key Vault
 * @param orgId - The organization ID
 * @returns The VAPI API key, or null if not found
 */
export async function getVapiKey(orgId: string): Promise<string | null> {
  const client = getSecretClient();
  const secretName = getVapiSecretName(orgId);

  try {
    const secret = await client.getSecret(secretName);
    return secret.value ?? null;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Delete a tenant's VAPI API key from Key Vault
 * @param orgId - The organization ID
 * @param purge - If true, permanently delete (otherwise soft-delete)
 */
export async function deleteVapiKey(
  orgId: string,
  purge: boolean = false
): Promise<void> {
  const client = getSecretClient();
  const secretName = getVapiSecretName(orgId);

  try {
    // Start the delete operation
    const deletePoller = await client.beginDeleteSecret(secretName);

    // Wait for deletion to complete
    await deletePoller.pollUntilDone();

    // Optionally purge (permanently delete)
    if (purge) {
      await client.purgeDeletedSecret(secretName);
    }
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return; // Already deleted, success
    }
    throw error;
  }
}

/**
 * Check if a tenant has a VAPI key stored
 * @param orgId - The organization ID
 * @returns true if the key exists
 */
export async function hasVapiKey(orgId: string): Promise<boolean> {
  const key = await getVapiKey(orgId);
  return key !== null;
}

/**
 * Store a generic secret for an organization
 * @param orgId - The organization ID
 * @param secretType - Type identifier (e.g., "openai", "anthropic")
 * @param secretValue - The secret value to store
 */
export async function setOrgSecret(
  orgId: string,
  secretType: string,
  secretValue: string
): Promise<string> {
  const client = getSecretClient();
  // Sanitize orgId and secretType to be alphanumeric with dashes only (Key Vault requirement)
  // Clerk orgId already starts with "org_", so we just sanitize it
  const sanitizedOrgId = sanitizeForKeyVault(orgId);
  const sanitizedType = sanitizeForKeyVault(secretType);
  const secretName = `${sanitizedOrgId}-${sanitizedType}`;

  await client.setSecret(secretName, secretValue, {
    contentType: "text/plain",
    tags: {
      orgId,
      type: secretType,
      createdAt: new Date().toISOString(),
    },
  });

  return secretName;
}

/**
 * Retrieve a generic secret for an organization
 * @param orgId - The organization ID
 * @param secretType - Type identifier (e.g., "openai", "anthropic")
 */
export async function getOrgSecret(
  orgId: string,
  secretType: string
): Promise<string | null> {
  const client = getSecretClient();
  const sanitizedOrgId = sanitizeForKeyVault(orgId);
  const sanitizedType = sanitizeForKeyVault(secretType);
  const secretName = `${sanitizedOrgId}-${sanitizedType}`;

  try {
    const secret = await client.getSecret(secretName);
    return secret.value ?? null;
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Retrieve a secret by its full name and parse as JSON
 * @param secretName - The full secret name in Key Vault
 * @returns Parsed JSON object with publicApiKey and privateApiKey, or null if not found
 */
export async function getSecretJsonByName(
  secretName: string
): Promise<{ publicApiKey: string; privateApiKey: string } | null> {
  const client = getSecretClient();

  try {
    const secret = await client.getSecret(secretName);
    if (!secret.value) {
      return null;
    }
    const parsed = JSON.parse(secret.value);
    if (!parsed.publicApiKey || !parsed.privateApiKey) {
      return null;
    }
    return {
      publicApiKey: parsed.publicApiKey,
      privateApiKey: parsed.privateApiKey,
    };
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Retrieve a generic secret as parsed JSON object
 * @param orgId - The organization ID
 * @param secretType - Type identifier (e.g., "vapi", "openai")
 * @returns Parsed JSON object, or null if not found
 */
export async function getOrgSecretJson<T = Record<string, unknown>>(
  orgId: string,
  secretType: string
): Promise<T | null> {
  const secretString = await getOrgSecret(orgId, secretType);
  if (!secretString) {
    return null;
  }

  try {
    return JSON.parse(secretString) as T;
  } catch {
    return null;
  }
}

/**
 * Store a generic secret as JSON object for an organization
 * @param orgId - The organization ID
 * @param secretType - Type identifier (e.g., "vapi", "openai")
 * @param secretValue - The object to store (will be JSON stringified)
 */
export async function setOrgSecretJson(
  orgId: string,
  secretType: string,
  secretValue: Record<string, unknown>
): Promise<string> {
  const client = getSecretClient();
  const sanitizedOrgId = sanitizeForKeyVault(orgId);
  const sanitizedType = sanitizeForKeyVault(secretType);
  const secretName = `${sanitizedOrgId}-${sanitizedType}`;

  await client.setSecret(secretName, JSON.stringify(secretValue), {
    contentType: "application/json",
    tags: {
      orgId,
      type: secretType,
      createdAt: new Date().toISOString(),
    },
  });

  return secretName;
}

/**
 * Delete a generic secret for an organization
 * @param orgId - The organization ID
 * @param secretType - Type identifier
 * @param purge - If true, permanently delete
 */
export async function deleteOrgSecret(
  orgId: string,
  secretType: string,
  purge: boolean = false
): Promise<void> {
  const client = getSecretClient();
  const sanitizedOrgId = sanitizeForKeyVault(orgId);
  const sanitizedType = sanitizeForKeyVault(secretType);
  const secretName = `${sanitizedOrgId}-${sanitizedType}`;

  try {
    const deletePoller = await client.beginDeleteSecret(secretName);
    await deletePoller.pollUntilDone();

    if (purge) {
      await client.purgeDeletedSecret(secretName);
    }
  } catch (error: unknown) {
    if (isNotFoundError(error)) {
      return; // Already deleted, success
    }
    throw error;
  }
}
