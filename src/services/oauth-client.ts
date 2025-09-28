import axios from 'axios';
import express from 'express';
import open from 'open';
import { Server } from 'http';
import { URLSearchParams } from 'url';
import { TokenResponse, UserInfo, PKCEChallenge, AuthState, CLIConfig } from '../types';
import { generatePKCEChallenge, generateState } from '../utils/crypto';
import { OIDCDiscoveryService } from './oidc-discovery';
import logger from '../utils/logger';

export class OAuthClient {
  private config: CLIConfig;
  private authState: Map<string, AuthState> = new Map();

  constructor(config: CLIConfig) {
    this.config = config;
  }

  /**
   * Start the OAuth 2.0 PKCE authorization flow
   */
  public async authorize(): Promise<TokenResponse> {
    try {
      // Discover endpoints if not already configured
      await this.ensureEndpoints();

      const pkceChallenge = generatePKCEChallenge();
      const state = generateState();
      const redirectUri = this.config.redirectUri;

      // Store auth state for callback validation
      this.authState.set(state, {
        state,
        codeVerifier: pkceChallenge.codeVerifier,
        redirectUri
      });

      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl(pkceChallenge, state, redirectUri);
      
      logger.info('Starting OAuth authorization flow', { authUrl });

      // Start local server to handle callback
      const authorizationCode = await this.handleAuthorizationCallback(redirectUri, pkceChallenge, state);

      // Exchange authorization code for tokens
      const tokens = await this.exchangeCodeForTokens(
        authorizationCode,
        pkceChallenge.codeVerifier,
        redirectUri
      );

      // Clean up auth state
      this.authState.delete(state);

      return tokens;
    } catch (error) {
      logger.error('OAuth authorization failed', { error });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      await this.ensureEndpoints();

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId
      });

      const response = await axios.post<TokenResponse>(
        this.config.tokenEndpoint!,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'auth-pkce-cli/1.0.0'
          },
          timeout: 30000
        }
      );

      logger.info('Token refreshed successfully');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(`Token refresh failed: ${errorData?.error_description || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get user information using access token
   */
  public async getUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      await this.ensureEndpoints();

      if (!this.config.userinfoEndpoint) {
        throw new Error('Userinfo endpoint not configured');
      }

      const response = await axios.get<UserInfo>(
        this.config.userinfoEndpoint,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'auth-pkce-cli/1.0.0'
          },
          timeout: 10000
        }
      );

      logger.info('User info retrieved successfully');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Access token expired or invalid');
        }
        throw new Error(`Failed to get user info: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Revoke tokens (logout)
   */
  public async revokeToken(token: string, tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'): Promise<void> {
    try {
      await this.ensureEndpoints();

      // Try to use revocation endpoint if available
      const revocationEndpoint = this.config.endSessionEndpoint;
      if (!revocationEndpoint) {
        logger.warn('No revocation endpoint available, tokens will remain valid until expiry');
        return;
      }

      const params = new URLSearchParams({
        token,
        token_type_hint: tokenTypeHint,
        client_id: this.config.clientId
      });

      await axios.post(
        revocationEndpoint,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'auth-pkce-cli/1.0.0'
          },
          timeout: 10000
        }
      );

      logger.info('Token revoked successfully');
    } catch (error) {
      logger.warn('Token revocation failed, but continuing with logout', { error });
      // Don't throw error as local logout should still work
    }
  }

  /**
   * Ensure OAuth endpoints are discovered and configured
   */
  private async ensureEndpoints(): Promise<void> {
    if (!this.config.authorizationEndpoint || !this.config.tokenEndpoint) {
      const oidcConfig = await OIDCDiscoveryService.discover(this.config.baseUrl);
      
      this.config.authorizationEndpoint = oidcConfig.authorization_endpoint;
      this.config.tokenEndpoint = oidcConfig.token_endpoint;
      this.config.userinfoEndpoint = oidcConfig.userinfo_endpoint;
      this.config.endSessionEndpoint = oidcConfig.end_session_endpoint;

      // Validate PKCE support
      if (!OIDCDiscoveryService.validatePKCESupport(oidcConfig)) {
        logger.warn('PKCE S256 method not explicitly supported by the provider');
      }
    }
  }

  /**
   * Build OAuth authorization URL
   */
  private buildAuthorizationUrl(pkceChallenge: PKCEChallenge, state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scope,
      state,
      code_challenge: pkceChallenge.codeChallenge,
      code_challenge_method: pkceChallenge.codeChallengeMethod,
      external: 'false'
    });

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and extract authorization code
   */
  private async handleAuthorizationCallback(redirectUri: string, pkceChallenge: PKCEChallenge, state: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(redirectUri);
      const port = parseInt(url.port) || 8080;
      
      const app = express();
      let server: Server;

      // Handle callback at the root path since redirect URI is http://localhost:4200
      app.get('/', (req, res) => {
        const { code, state, error, error_description } = req.query;

        if (error) {
          const errorMsg = `OAuth error: ${error}${error_description ? ` - ${error_description}` : ''}`;
          logger.error('OAuth callback error', { error, error_description });
          res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
          server.close();
          reject(new Error(errorMsg));
          return;
        }

        if (!code || !state) {
          const errorMsg = 'Missing authorization code or state parameter';
          logger.error('OAuth callback missing parameters', { code: !!code, state: !!state });
          res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
          server.close();
          reject(new Error(errorMsg));
          return;
        }

        // Validate state parameter
        const authState = this.authState.get(state as string);
        if (!authState) {
          const errorMsg = 'Invalid state parameter';
          logger.error('OAuth callback invalid state', { state });
          res.status(400).send(`<h1>Authentication Failed</h1><p>${errorMsg}</p>`);
          server.close();
          reject(new Error(errorMsg));
          return;
        }

        res.send(`
          <h1>Authentication Successful!</h1>
          <p>You can now close this window and return to the CLI.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        `);

        server.close(() => {
          logger.debug('Callback server closed successfully');
        });
        resolve(code as string);
      });

      server = app.listen(port, () => {
        logger.info(`Callback server listening on port ${port}`);
        
        // Store auth state for validation
        this.authState.set(state, {
          state,
          codeVerifier: pkceChallenge.codeVerifier,
          redirectUri
        });

        const authUrl = this.buildAuthorizationUrl(pkceChallenge, state, redirectUri);
        
        open(authUrl).catch(err => {
          logger.warn('Failed to open browser automatically', { error: err });
          console.log(`\nPlease open the following URL in your browser:\n${authUrl}\n`);
        });
      });

      // Timeout after 5 minutes
      const timeoutId = setTimeout(() => {
        server.close(() => {
          logger.debug('Callback server closed due to timeout');
        });
        reject(new Error('Authentication timeout - no callback received within 5 minutes'));
      }, 300000);

      // Clear timeout on successful completion
      const originalResolve = resolve;
      resolve = (value: string | PromiseLike<string>): void => {
        clearTimeout(timeoutId);
        originalResolve(value);
      };
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.config.clientId,
        code_verifier: codeVerifier,
      });

      const response = await axios.post<TokenResponse>(
        this.config.tokenEndpoint!,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'auth-pkce-cli/1.0.0'
          },
          timeout: 30000
        }
      );

      logger.info('Authorization code exchanged for tokens successfully');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(`Token exchange failed: ${errorData?.error_description || error.message}`);
      }
      throw error;
    }
  }
}
