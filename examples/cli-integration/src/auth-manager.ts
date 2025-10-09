import { AuthPkceApi, getAccessToken, isAuthenticated, getTokenInfo, getAuthStatus } from 'auth-pkce';

export class AuthManager {
  private authApi: AuthPkceApi;

  constructor() {
    // Enable automatic token refresh by default
    this.authApi = new AuthPkceApi({ autoRefresh: true });
  }

  /**
   * Check if user is authenticated with auth-pkce
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.authApi.isAuthenticated();
  }

  /**
   * Get current access token from auth-pkce (with auto-refresh)
   */
  async getAccessToken(): Promise<string | null> {
    return await this.authApi.getAccessToken();
  }

  /**
   * Get token info including expiration
   */
  async getTokenInfo(): Promise<any | null> {
    return await this.authApi.getTokenInfo();
  }

  /**
   * Get authentication status summary
   */
  async getAuthStatus(): Promise<any> {
    return await this.authApi.getAuthStatus();
  }

  /**
   * Refresh token using auth-pkce programmatically
   */
  async refreshToken(): Promise<boolean> {
    return await this.authApi.refreshToken();
  }

  /**
   * Check if auth-pkce is configured
   */
  async hasConfiguration(): Promise<boolean> {
    return await this.authApi.hasConfiguration();
  }

  /**
   * Prompt user to authenticate with auth-pkce
   */
  async promptAuthentication(): Promise<boolean> {
    try {
      const hasConfig = await this.hasConfiguration();
      
      if (!hasConfig) {
        console.log('auth-pkce is not configured.');
        console.log('Please run: auth-pkce configure');
        return false;
      }

      console.log('Authentication required. Please authenticate with auth-pkce...');
      console.log('Run: auth-pkce login');
      
      // Wait for user to authenticate
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('Press Enter after you have authenticated with auth-pkce...', async () => {
          rl.close();
          const isAuth = await this.isAuthenticated();
          resolve(isAuth);
        });
      });
    } catch (error) {
      console.error('Authentication prompt failed:', error);
      return false;
    }
  }

  /**
   * Ensure user is authenticated, prompt if not
   */
  async ensureAuthenticated(): Promise<string | null> {
    if (await this.isAuthenticated()) {
      return await this.getAccessToken();
    }

    console.log('Not authenticated with auth-pkce.');
    const success = await this.promptAuthentication();
    
    if (success) {
      return await this.getAccessToken();
    }
    
    return null;
  }
}
