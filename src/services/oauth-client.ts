import { timingSafeEqual } from 'node:crypto';
import { createServer, Server } from 'node:http';
import open from 'open';
import { CLIConfig, PKCEChallenge, TokenResponse, UserInfo } from '../types';
import { validateLoopbackRedirectUri } from '../utils/errors';
import { generatePKCEChallenge, generateState } from '../utils/crypto';
import logger from '../utils/logger';
import { OIDCDiscoveryService } from './oidc-discovery';

export interface OAuthClientOptions {
  callbackTimeoutMs?: number;
  requestTimeoutMs?: number;
  openBrowser?: (url: string) => Promise<void>;
}

interface OAuthErrorPayload {
  error?: string;
  error_description?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const oauthError = payload as OAuthErrorPayload;
  return oauthError.error_description || oauthError.error || fallback;
}

function statesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export class OAuthClient {
  private readonly config: CLIConfig;
  private readonly callbackTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly openBrowser: (url: string) => Promise<void>;

  public constructor(config: CLIConfig, options: OAuthClientOptions = {}) {
    this.config = { ...config };
    this.callbackTimeoutMs = options.callbackTimeoutMs ?? 300_000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
    this.openBrowser = options.openBrowser ?? (async (url: string): Promise<void> => {
      await open(url);
    });
  }

  public async authorize(): Promise<TokenResponse> {
    await this.ensureEndpoints();

    const pkce = generatePKCEChallenge();
    const state = generateState();
    const authorizationUrl = this.buildAuthorizationUrl(pkce, state, this.config.redirectUri);
    logger.info('Starting OAuth authorization flow');

    const authorizationCode = await this.handleAuthorizationCallback(
      this.config.redirectUri,
      state,
      authorizationUrl
    );

    return this.exchangeCodeForTokens(authorizationCode, pkce.codeVerifier, this.config.redirectUri);
  }

  public async refreshToken(refreshToken: string): Promise<TokenResponse> {
    await this.ensureEndpoints();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    });

    return this.postForm<TokenResponse>(this.config.tokenEndpoint!, params, 'Token refresh failed');
  }

  public async getUserInfo(accessToken: string): Promise<UserInfo> {
    await this.ensureEndpoints();
    if (!this.config.userinfoEndpoint) {
      throw new Error('Userinfo endpoint is not advertised by the provider');
    }

    const payload = await this.requestJson(this.config.userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'auth-pkce',
      },
    }, 'Failed to get user info');

    if (!isRecord(payload) || typeof payload.sub !== 'string') {
      throw new Error('Userinfo response is missing the required sub claim');
    }
    return payload as UserInfo;
  }

  public async revokeToken(
    token: string,
    tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'
  ): Promise<void> {
    try {
      await this.ensureEndpoints();
      if (!this.config.revocationEndpoint) {
        logger.warn('Provider does not advertise a token revocation endpoint');
        return;
      }

      const params = new URLSearchParams({
        token,
        token_type_hint: tokenTypeHint,
        client_id: this.config.clientId,
      });
      await this.postForm(this.config.revocationEndpoint, params, 'Token revocation failed');
    } catch (error) {
      logger.warn('Token revocation failed; local logout will continue', { error });
    }
  }

  private async ensureEndpoints(): Promise<void> {
    if (this.config.authorizationEndpoint && this.config.tokenEndpoint) {
      return;
    }

    const discovered = await OIDCDiscoveryService.discover(this.config.baseUrl);
    this.config.authorizationEndpoint = discovered.authorization_endpoint;
    this.config.tokenEndpoint = discovered.token_endpoint;
    this.config.userinfoEndpoint = discovered.userinfo_endpoint;
    this.config.revocationEndpoint = discovered.revocation_endpoint;

    if (!OIDCDiscoveryService.validatePKCESupport(discovered)) {
      logger.warn('Provider metadata does not explicitly advertise PKCE S256 support');
    }
  }

  private buildAuthorizationUrl(
    pkce: PKCEChallenge,
    state: string,
    redirectUri: string
  ): string {
    if (!this.config.authorizationEndpoint) {
      throw new Error('Authorization endpoint is not configured');
    }

    const url = new URL(this.config.authorizationEndpoint);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scope,
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
    });
    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  }

  private async handleAuthorizationCallback(
    redirectUri: string,
    expectedState: string,
    authorizationUrl: string
  ): Promise<string> {
    const redirect = validateLoopbackRedirectUri(redirectUri);
    const port = Number.parseInt(redirect.port, 10);
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('Redirect URI must include an explicit loopback port');
    }

    const host = redirect.hostname.replace(/^\[(.*)\]$/, '$1');
    const callbackPath = redirect.pathname || '/';

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let timeout: NodeJS.Timeout | undefined;

      const finish = (server: Server, error?: Error, code?: string): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        server.close();
        if (error) {
          reject(error);
        } else if (code) {
          resolve(code);
        } else {
          reject(new Error('Authentication callback completed without an authorization code'));
        }
      };

      const server = createServer((request, response) => {
        const requestUrl = new URL(request.url || '/', redirectUri);
        response.setHeader('Connection', 'close');

        if (requestUrl.pathname !== callbackPath) {
          response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Not found');
          return;
        }

        const oauthError = requestUrl.searchParams.get('error');
        if (oauthError) {
          const description = requestUrl.searchParams.get('error_description');
          const message = `OAuth error: ${oauthError}${description ? ` - ${description}` : ''}`;
          response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Authentication failed. Return to the CLI for details.');
          finish(server, new Error(message));
          return;
        }

        const code = requestUrl.searchParams.get('code');
        const receivedState = requestUrl.searchParams.get('state');
        if (!code || !receivedState) {
          response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Authentication failed: missing code or state.');
          finish(server, new Error('OAuth callback is missing the authorization code or state'));
          return;
        }

        if (!statesMatch(expectedState, receivedState)) {
          response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Authentication failed: invalid state.');
          finish(server, new Error('OAuth callback state validation failed'));
          return;
        }

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(
          '<!doctype html><title>Authentication complete</title>' +
          '<h1>Authentication complete</h1><p>You can close this window and return to the CLI.</p>'
        );
        finish(server, undefined, code);
      });

      server.once('error', (error) => finish(server, error));
      server.listen(port, host, () => {
        timeout = setTimeout(() => {
          finish(server, new Error('Authentication timed out while waiting for the browser callback'));
        }, this.callbackTimeoutMs);

        this.openBrowser(authorizationUrl).catch((error: unknown) => {
          logger.warn('Failed to open the browser automatically', { error });
          console.log(`Open this URL in your browser:\n${authorizationUrl}`);
        });
      });
    });
  }

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.config.clientId,
      code_verifier: codeVerifier,
    });
    if (this.config.audience) {
      params.set('audience', this.config.audience);
    }

    return this.postForm<TokenResponse>(this.config.tokenEndpoint!, params, 'Token exchange failed');
  }

  private async postForm<T = unknown>(
    url: string,
    params: URLSearchParams,
    failureMessage: string
  ): Promise<T> {
    return this.requestJson(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'auth-pkce',
      },
      body: params.toString(),
    }, failureMessage) as Promise<T>;
  }

  private async requestJson(
    url: string,
    init: RequestInit,
    failureMessage: string
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      throw new Error(`${failureMessage}: network request failed`, { cause: error });
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch (error) {
        throw new Error(`${failureMessage}: server returned invalid JSON`, { cause: error });
      }
    }

    if (!response.ok) {
      throw new Error(`${failureMessage}: ${errorMessage(payload, `HTTP ${response.status}`)}`);
    }
    return payload;
  }
}
