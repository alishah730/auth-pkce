export interface OAuthConfig {
  clientId: string;
  baseUrl: string;
  redirectUri: string;
  scope: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  endSessionEndpoint?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface AuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface OpenIDConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
  jwks_uri: string;
  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  code_challenge_methods_supported?: string[];
}

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface CLIConfig extends OAuthConfig {
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  configVersion: string;
}
