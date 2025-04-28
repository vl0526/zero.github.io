import {SecretManagerServiceClient} from '@google-cloud/secret-manager';

// Initialize Secret Manager client
const client=new SecretManagerServiceClient();

/**
 * Accesses the latest version of a secret from Google Secret Manager.
 * @param name - The full resource name of the secret (e.g., 'projects/PROJECT_ID/secrets/SECRET_NAME/versions/latest').
 * @returns The secret data as a string, or an empty string if not found.
 */
export async function getSecret(name:string):Promise<string>{
  try {
    const [access] = await client.accessSecretVersion({ name });
    // Return the secret payload data as a string
    return access.payload?.data?.toString() || '';
  } catch (error) {
    console.error(`Failed to access secret ${name}:`, error);
    throw new Error(`Could not retrieve secret: ${name}`);
  }
}
