import { ConfigManager } from '../config/manager';
import { StoredTokens, CLIConfig } from '../types';
import logger from '../utils/logger';

export interface AuthPkceApiOptions {
  autoRefresh?: boolean;
}

export class AuthPkceApi {
  private configManager: ConfigManager;
  private options: AuthPkceApiOptions;

  constructor(options: AuthPkceApiOptions = {}) {
    this.configManager = ConfigManager.getInstance();
    this.options = {
      autoRefresh: true,
      ...options
    };
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const config = await this.configManager.loadConfig();
      const tokens = await this.configManager.loadTokens();
      
      if (!config || !tokens) {
        return false;
      }

      // Check if token is expired
      if (this.configManager.isTokenExpired(tokens)) {
        if (this.options.autoRefresh && tokens.refreshToken) {
          return await this.refreshToken();
        }
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check authentication status', { error });
      return false;
    }
  }

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const tokens = await this.configManager.loadTokens();
      
      if (!tokens) {
        return null;
      }

      // Check if token is expired
      if (this.configManager.isTokenExpired(tokens)) {
        if (this.options.autoRefresh && tokens.refreshToken) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            const newTokens = await this.configManager.loadTokens();
            return newTokens?.accessToken || null;
          }
        }
        return null;
      }

      return tokens.accessToken;
    } catch (error) {
      logger.error('Failed to get access token', { error });
      return null;
    }
  }

  /**
   * Get token information including expiration
   */
  async getTokenInfo(): Promise<StoredTokens | null> {
    try {
      const tokens = await this.configManager.loadTokens();
      
      if (!tokens) {
        return null;
      }

      // Auto-refresh if expired and enabled
      if (this.configManager.isTokenExpired(tokens)) {
        if (this.options.autoRefresh && tokens.refreshToken) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            return await this.configManager.loadTokens();
          }
        }
      }

      return tokens;
    } catch (error) {
      logger.error('Failed to get token info', { error });
      return null;
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<CLIConfig | null> {
    try {
      return await this.configManager.loadConfig();
    } catch (error) {
      logger.error('Failed to get configuration', { error });
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const config = await this.configManager.loadConfig();
      const tokens = await this.configManager.loadTokens();
      
      if (!config || !tokens || !tokens.refreshToken) {
        return false;
      }

      const { OAuthClient } = await import('../services/oauth-client');
      const oauthClient = new OAuthClient(config);
      
      const newTokens = await oauthClient.refreshToken(tokens.refreshToken);
      
      // Update stored tokens
      const updatedTokens: StoredTokens = {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || tokens.refreshToken,
        idToken: newTokens.id_token,
        expiresAt: Date.now() + (newTokens.expires_in * 1000),
        tokenType: newTokens.token_type,
        scope: newTokens.scope || tokens.scope
      };
      
      await this.configManager.saveTokens(updatedTokens);
      logger.info('Token refreshed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to refresh token', { error });
      return false;
    }
  }

  /**
   * Check if configuration exists
   */
  async hasConfiguration(): Promise<boolean> {
    try {
      const config = await this.configManager.loadConfig();
      return config !== null;
    } catch (error) {
      logger.error('Failed to check configuration', { error });
      return false;
    }
  }

  /**
   * Get user information from stored ID token
   */
  async getUserInfo(): Promise<any | null> {
    try {
      const tokens = await this.getTokenInfo();
      
      if (!tokens?.idToken) {
        return null;
      }

      // Decode JWT payload (simple base64 decode, no verification)
      const payload = tokens.idToken.split('.')[1];
      const decoded = Buffer.from(payload, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      logger.error('Failed to get user info from token', { error });
      return null;
    }
  }

  /**
   * Get authentication status summary
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    hasConfig: boolean;
    tokenExpiresIn?: number;
    userInfo?: any;
  }> {
    try {
      const hasConfig = await this.hasConfiguration();
      const isAuth = await this.isAuthenticated();
      const tokenInfo = await this.getTokenInfo();
      const userInfo = await this.getUserInfo();

      let tokenExpiresIn: number | undefined;
      if (tokenInfo) {
        tokenExpiresIn = Math.floor((tokenInfo.expiresAt - Date.now()) / 1000 / 60);
      }

      return {
        isAuthenticated: isAuth,
        hasConfig,
        tokenExpiresIn,
        userInfo
      };
    } catch (error) {
      logger.error('Failed to get auth status', { error });
      return {
        isAuthenticated: false,
        hasConfig: false
      };
    }
  }
}

// Export convenience functions
export async function getAccessToken(options?: AuthPkceApiOptions): Promise<string | null> {
  const api = new AuthPkceApi(options);
  return api.getAccessToken();
}

export async function isAuthenticated(options?: AuthPkceApiOptions): Promise<boolean> {
  const api = new AuthPkceApi(options);
  return api.isAuthenticated();
}

export async function getTokenInfo(options?: AuthPkceApiOptions): Promise<StoredTokens | null> {
  const api = new AuthPkceApi(options);
  return api.getTokenInfo();
}

export async function getAuthStatus(options?: AuthPkceApiOptions) {
  const api = new AuthPkceApi(options);
  return api.getAuthStatus();
}
