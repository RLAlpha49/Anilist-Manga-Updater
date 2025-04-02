/**
 * AniList API client for making GraphQL requests
 */

import { AniListResponse } from "./types";

const API_URL = "https://graphql.anilist.co";

/**
 * Make a GraphQL request to the AniList API
 * @param query GraphQL query or mutation
 * @param variables Variables for the query
 * @param token Optional access token for authenticated requests
 * @returns Promise resolving to the response data
 */
export async function request<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<AniListResponse<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `API Error: ${response.status} - ${
        errorData.errors?.[0]?.message || response.statusText
      }`,
    );
  }

  return await response.json();
}

/**
 * Get the OAuth URL for AniList authentication
 * @param clientId The OAuth client ID
 * @param redirectUri The redirect URI after authentication
 * @returns The complete OAuth URL
 */
export function getOAuthUrl(clientId: string, redirectUri: string): string {
  return `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&response_type=code`;
}

/**
 * Exchange an authorization code for an access token
 * @param clientId The OAuth client ID
 * @param clientSecret The OAuth client secret
 * @param redirectUri The redirect URI used for authentication
 * @param code The authorization code to exchange
 * @returns Promise resolving to the token response
 */
export async function getAccessToken(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string,
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  console.log("🔑 getAccessToken starting with:", {
    clientId: clientId.substring(0, 2) + "...",
    redirectUri,
    codeLength: code.length,
  });

  // Format the request body
  const tokenRequestBody = {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: code,
  };

  // Maximum number of retry attempts
  const MAX_RETRIES = 3;
  let retries = 0;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`🔑 Token exchange attempt ${retries + 1}/${MAX_RETRIES}`);

      // Delay between retries (exponential backoff)
      if (retries > 0) {
        const delay = retries * 1000; // 1s, 2s, 3s
        console.log(`🔑 Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch("https://anilist.co/api/v2/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(tokenRequestBody),
      });

      console.log("🔑 Token API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("🔑 Token API error:", errorData);
        throw new Error(`API error: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      console.log("🔑 Token received successfully!", {
        token_type: data.token_type,
        expires_in: data.expires_in,
        token_length: data.access_token?.length || 0,
      });

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `🔑 Token exchange attempt ${retries + 1} failed:`,
        lastError,
      );

      // Determine if we should retry
      const isNetworkError =
        lastError.message.includes("Failed to fetch") ||
        lastError.message.includes("Network Error") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("ETIMEDOUT");

      if (!isNetworkError) {
        // Don't retry for non-network errors
        console.error("🔑 Non-network error, won't retry");
        break;
      }

      retries++;
    }
  }

  // If we've exhausted all retries or received a non-retriable error
  const errorMsg = lastError
    ? lastError.message
    : "Unknown error during token exchange";
  console.error("🔑 All token exchange attempts failed:", errorMsg);
  throw new Error(`Failed to exchange code for token: ${errorMsg}`);
}
