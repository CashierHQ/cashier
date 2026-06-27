const X_AUTH_BASE = "https://x.com/i/oauth2/authorize";
const X_SCOPES = "users.read tweet.read like.read offline.access follows.read";

export interface XOAuthParams {
  clientId: string;
  redirectUri: string;
  state: string;
}

/**
 * Builds the X OAuth 2.0 authorization URL.
 * Uses plain PKCE (code_challenge = "challenge") matching the gate_service expectation.
 */
export function buildXAuthUrl(params: XOAuthParams): string {
  const search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: X_SCOPES,
    code_challenge: "challenge",
    code_challenge_method: "plain",
    state: params.state,
  });
  return `${X_AUTH_BASE}?${search.toString()}`;
}
