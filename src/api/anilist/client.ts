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
  const response = await fetch("https://anilist.co/api/v2/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Token Error: ${response.status} - ${
        errorData.error || response.statusText
      }`,
    );
  }

  return await response.json();
}
