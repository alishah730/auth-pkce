import { ConfigManager } from '../config/manager';
import { OAuthClient } from '../services/oauth-client';
import { AuthStatus, CLIConfig, StoredTokens, UserInfo } from '../types';
import logger from '../utils/logger';

export interface AuthPkceApiOptions {
  autoRefresh?: boolean;
  clockSkewSeconds?: number;
  configDir?: string;
}

export class AuthPkceApi {
  private readonly configManager: ConfigManager;
  private readonly autoRefresh: boolean;
  private readonly clockSkewSeconds: number;
  private refreshInFlight: Promise<boolean> | null = null;

  public constructor(options: AuthPkceApiOptions = {}) {
    this.configManager = options.configDir
      ? new ConfigManager({ configDir: options.configDir })
      : ConfigManager.getInstance();
    this.autoRefresh = options.autoRefresh ?? true;
    this.clockSkewSeconds = options.clockSkewSeconds ?? 30;
  }

  public async isAuthenticated(): Promise<boolean> {
    try {
      const [config, tokens] = await Promise.all([
        this.configManager.loadConfig(),
        this.configManager.loadTokens(),
      ]);
      if (!config || !tokens) {
        return false;
      }

      if (!this.configManager.isTokenExpired(tokens, this.clockSkewSeconds)) {
        return true;
      }
      return Boolean(this.autoRefresh && tokens.refreshToken && await this.refreshToken());
    } catch (error) {
      logger.error('Failed to check authentication status', { error });
      return false;
    }
  }

  public async getAccessToken(): Promise<string | null> {
    try {
      const tokens = await this.configManager.loadTokens();
      if (!tokens) {
        return null;
      }

      if (!this.configManager.isTokenExpired(tokens, this.clockSkewSeconds)) {
        return tokens.accessToken;
      }

      if (!this.autoRefresh || !tokens.refreshToken || !await this.refreshToken()) {
        return null;
      }
      return (await this.configManager.loadTokens())?.accessToken ?? null;
    } catch (error) {
      logger.error('Failed to get access token', { error });
      return null;
    }
  }

  public async getTokenInfo(): Promise<StoredTokens | null> {
    try {
      const tokens = await this.configManager.loadTokens();
      if (!tokens) {
        return null;
      }

      if (
        this.configManager.isTokenExpired(tokens, this.clockSkewSeconds) &&
        this.autoRefresh &&
        tokens.refreshToken &&
        await this.refreshToken()
      ) {
        return this.configManager.loadTokens();
      }
      return tokens;
    } catch (error) {
      logger.error('Failed to get token info', { error });
      return null;
    }
  }

  public async getConfig(): Promise<CLIConfig | null> {
    try {
      return await this.configManager.loadConfig();
    } catch (error) {
      logger.error('Failed to get configuration', { error });
      return null;
    }
  }

  public async refreshToken(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.performRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<boolean> {
    try {
      const [config, tokens] = await Promise.all([
        this.configManager.loadConfig(),
        this.configManager.loadTokens(),
      ]);
      if (!config || !tokens?.refreshToken) {
        return false;
      }

      const response = await new OAuthClient(config).refreshToken(tokens.refreshToken);
      const updatedTokens: StoredTokens = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token || tokens.refreshToken,
        idToken: response.id_token || tokens.idToken,
        expiresAt: Date.now() + response.expires_in * 1000,
        tokenType: response.token_type,
        scope: response.scope || tokens.scope,
      };
      await this.configManager.saveTokens(updatedTokens);
      return true;
    } catch (error) {
      logger.error('Failed to refresh token', { error });
      return false;
    }
  }

  public async hasConfiguration(): Promise<boolean> {
    return (await this.getConfig()) !== null;
  }

  public async getUserInfo(): Promise<UserInfo | null> {
    try {
      const [config, accessToken] = await Promise.all([
        this.configManager.loadConfig(),
        this.getAccessToken(),
      ]);
      if (!config || !accessToken) {
        return null;
      }
      return await new OAuthClient(config).getUserInfo(accessToken);
    } catch (error) {
      logger.error('Failed to get user info', { error });
      return null;
    }
  }

  public async getAuthStatus(): Promise<AuthStatus> {
    const hasConfig = await this.hasConfiguration();
    const isAuthenticated = hasConfig && await this.isAuthenticated();
    const tokenInfo = await this.configManager.loadTokens().catch(() => null);
    const userInfo = isAuthenticated ? await this.getUserInfo() : null;

    return {
      isAuthenticated,
      hasConfig,
      tokenExpiresIn: tokenInfo
        ? Math.max(0, Math.floor((tokenInfo.expiresAt - Date.now()) / 60_000))
        : undefined,
      userInfo: userInfo ?? undefined,
    };
  }
}

export async function getAccessToken(options?: AuthPkceApiOptions): Promise<string | null> {
  return new AuthPkceApi(options).getAccessToken();
}

export async function isAuthenticated(options?: AuthPkceApiOptions): Promise<boolean> {
  return new AuthPkceApi(options).isAuthenticated();
}

export async function getTokenInfo(options?: AuthPkceApiOptions): Promise<StoredTokens | null> {
  return new AuthPkceApi(options).getTokenInfo();
}

export async function getAuthStatus(options?: AuthPkceApiOptions): Promise<AuthStatus> {
  return new AuthPkceApi(options).getAuthStatus();
}
