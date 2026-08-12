import {
  AuthPkceApi,
  AuthPKCELibrary,
  AuthStatus,
  StoredTokens,
} from 'auth-pkce';

export class AuthManager {
  private readonly authApi = new AuthPkceApi({ autoRefresh: true });
  private readonly authCommands = new AuthPKCELibrary({ cliName: 'my-api-cli' });

  public async isAuthenticated(): Promise<boolean> {
    return this.authApi.isAuthenticated();
  }

  public async getAccessToken(): Promise<string | null> {
    return this.authApi.getAccessToken();
  }

  public async getTokenInfo(): Promise<StoredTokens | null> {
    return this.authApi.getTokenInfo();
  }

  public async getAuthStatus(): Promise<AuthStatus> {
    return this.authApi.getAuthStatus();
  }

  public async refreshToken(): Promise<boolean> {
    return this.authApi.refreshToken();
  }

  public async hasConfiguration(): Promise<boolean> {
    return this.authApi.hasConfiguration();
  }

  public async promptAuthentication(): Promise<boolean> {
    if (!await this.hasConfiguration()) {
      console.log('Authentication is not configured. Run: my-api-cli auth configure');
      return false;
    }

    try {
      await this.authCommands.login();
      return this.isAuthenticated();
    } catch (error) {
      console.error('Authentication failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  public async ensureAuthenticated(): Promise<string | null> {
    const existingToken = await this.getAccessToken();
    if (existingToken) {
      return existingToken;
    }

    return await this.promptAuthentication() ? this.getAccessToken() : null;
  }
}
