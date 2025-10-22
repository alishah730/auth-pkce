import chalk from 'chalk';
import { ConfigManager } from '../config/manager';
import { OAuthClient } from '../services/oauth-client';
import { StoredTokens } from '../types';
import logger from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const configManager = ConfigManager.getInstance();
const execAsync = promisify(exec);

/**
 * Configure command - Interactive setup of OAuth configuration
 */
export async function configureCommand(options: { baseUrl?: string }): Promise<void> {
  try {
    console.log(chalk.blue('🔧 Configuring auth-pkce...'));
    
    await configManager.configureInteractively(options.baseUrl);
    
    console.log(chalk.green('✅ Configuration saved successfully!'));
    console.log(chalk.gray(`Config saved to: ${require('os').homedir()}/.auth-pkce/config.json`));
  } catch (error) {
    console.error(chalk.red('❌ Configuration failed:'), error instanceof Error ? error.message : error);
    logger.error('Configuration command failed', { message: (error instanceof Error ? error.message : String(error)), code: (error && (error as any).code) ? (error as any).code : undefined });
    process.exit(1);
  }
}

/**
 * Login command - Start OAuth PKCE authentication flow
 */
export async function loginCommand(): Promise<void> {
  try {
    console.log(chalk.blue('🔐 Starting authentication...'));
    
    const config = await configManager.loadConfig();
    if (!config) {
      console.error(chalk.red('❌ No configuration found. Please run "auth-pkce configure" first.'));
      process.exit(1);
    }

    const oauthClient = new OAuthClient(config);
    const tokens = await oauthClient.authorize();
    
    // Store tokens securely
    const storedTokens: StoredTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      tokenType: tokens.token_type,
      scope: tokens.scope
    };
    
    await configManager.saveTokens(storedTokens);
    
    console.log(chalk.green('✅ Authentication successful!'));
    console.log(chalk.gray(`Token expires in: ${Math.floor(tokens.expires_in / 60)} minutes`));
    
    // Ensure clean process exit
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('❌ Authentication failed:'), error instanceof Error ? error.message : error);
    logger.error('Login command failed', { message: (error instanceof Error ? error.message : String(error)), code: (error && (error as any).code) ? (error as any).code : undefined });
    process.exit(1);
  }
}

/**
 * Logout command - Clear stored tokens and revoke if possible
 */
export async function logoutCommand(): Promise<void> {
  try {
    console.log(chalk.blue('🚪 Logging out...'));
    
    const config = await configManager.loadConfig();
    const tokens = await configManager.loadTokens();
    
    if (config && tokens) {
      // Try to revoke tokens
      const oauthClient = new OAuthClient(config);
      if (tokens.accessToken) {
        await oauthClient.revokeToken(tokens.accessToken, 'access_token');
      }
      if (tokens.refreshToken) {
        await oauthClient.revokeToken(tokens.refreshToken, 'refresh_token');
      }
    }
    
    // Clear local tokens
    await configManager.clearTokens();
    
    console.log(chalk.green('✅ Logged out successfully!'));
  } catch (error) {
    console.error(chalk.red('❌ Logout failed:'), error instanceof Error ? error.message : error);
    logger.error('Logout command failed', { message: (error instanceof Error ? error.message : String(error)), code: (error && (error as any).code) ? (error as any).code : undefined });
    process.exit(1);
  }
}

/**
 * Whoami command - Display current user information
 */
export async function whoamiCommand(): Promise<void> {
  try {
    const config = await configManager.loadConfig();
    const tokens = await configManager.loadTokens();
    
    if (!config || !tokens) {
      console.error(chalk.red('❌ Not authenticated. Please run "auth-pkce login" first.'));
      process.exit(1);
    }
    
    // Check if token is expired
    if (configManager.isTokenExpired(tokens)) {
      console.error(chalk.red('❌ Access token expired. Please run "auth-pkce refresh" or "auth-pkce login".'));
      process.exit(1);
    }
    
    const oauthClient = new OAuthClient(config);
    const userInfo = await oauthClient.getUserInfo(tokens.accessToken);
    
    console.log(chalk.blue('👤 Current User Information:'));
    console.log(chalk.white('─'.repeat(40)));
    console.log(chalk.cyan('User ID:'), userInfo.sub);
    if (userInfo.name) console.log(chalk.cyan('Name:'), userInfo.name);
    if (userInfo.email) console.log(chalk.cyan('Email:'), userInfo.email);
    if (userInfo.preferred_username) console.log(chalk.cyan('Username:'), userInfo.preferred_username);
    
    const expiresIn = Math.floor((tokens.expiresAt - Date.now()) / 1000 / 60);
    console.log(chalk.cyan('Token expires in:'), `${expiresIn} minutes`);
    
    if (tokens.scope) {
      console.log(chalk.cyan('Scopes:'), tokens.scope);
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to get user info:'), error instanceof Error ? error.message : error);
    logger.error('Whoami command failed', { message: (error instanceof Error ? error.message : String(error)), code: (error && (error as any).code) ? (error as any).code : undefined });
    process.exit(1);
  }
}

/**
 * Refresh command - Refresh access token using refresh token
 */
export async function refreshCommand(): Promise<void> {
  try {
    console.log(chalk.blue('🔄 Refreshing access token...'));
    
    const config = await configManager.loadConfig();
    const tokens = await configManager.loadTokens();
    
    if (!config || !tokens) {
      console.error(chalk.red('❌ Not authenticated. Please run "auth-pkce login" first.'));
      process.exit(1);
    }
    
    if (!tokens.refreshToken) {
      console.error(chalk.red('❌ No refresh token available. Please run "auth-pkce login" again.'));
      process.exit(1);
    }
    
    const oauthClient = new OAuthClient(config);
    const newTokens = await oauthClient.refreshToken(tokens.refreshToken);
    
    // Update stored tokens
    const updatedTokens: StoredTokens = {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || tokens.refreshToken, // Keep old refresh token if new one not provided
      idToken: newTokens.id_token,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
      tokenType: newTokens.token_type,
      scope: newTokens.scope || tokens.scope
    };
    
    await configManager.saveTokens(updatedTokens);
    
    console.log(chalk.green('✅ Access token refreshed successfully!'));
    console.log(chalk.gray(`New token expires in: ${Math.floor(newTokens.expires_in / 60)} minutes`));
  } catch (error) {
    console.error(chalk.red('❌ Token refresh failed:'), error instanceof Error ? error.message : error);
    console.log(chalk.yellow('💡 Try running "auth-pkce login" to authenticate again.'));
    logger.error('Refresh command failed', { message: (error instanceof Error ? error.message : String(error)), code: (error && (error as any).code) ? (error as any).code : undefined });
    process.exit(1);
  }
}

/**
 * Status command - Show current authentication status
 */
export async function statusCommand(): Promise<void> {
  try {
    const config = await configManager.loadConfig();
    const tokens = await configManager.loadTokens();
    
    console.log(chalk.blue('📊 Authentication Status:'));
    console.log(chalk.white('─'.repeat(40)));
    
    if (!config) {
      console.log(chalk.red('❌ Not configured'));
      console.log(chalk.yellow('💡 Run "auth-pkce configure" to set up'));
      return;
    }
    
    console.log(chalk.cyan('Configuration:'), chalk.green('✅ Found'));
    console.log(chalk.cyan('Base URL:'), config.baseUrl);
    console.log(chalk.cyan('Client ID:'), config.clientId);
    console.log(chalk.cyan('Redirect URI:'), config.redirectUri);
    console.log(chalk.cyan('Scopes:'), config.scope);
    
    if (!tokens) {
      console.log(chalk.cyan('Authentication:'), chalk.red('❌ Not logged in'));
      console.log(chalk.yellow('💡 Run "auth-pkce login" to authenticate'));
      return;
    }
    
    const isExpired = configManager.isTokenExpired(tokens);
    const expiresIn = Math.floor((tokens.expiresAt - Date.now()) / 1000 / 60);
    
    if (isExpired) {
      console.log(chalk.cyan('Authentication:'), chalk.red('❌ Token expired'));
      console.log(chalk.yellow('💡 Run "auth-pkce refresh" or "auth-pkce login"'));
    } else {
      console.log(chalk.cyan('Authentication:'), chalk.green('✅ Active'));
      console.log(chalk.cyan('Expires in:'), `${expiresIn} minutes`);
    }
    
    console.log(chalk.cyan('Has refresh token:'), tokens.refreshToken ? chalk.green('✅ Yes') : chalk.red('❌ No'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to get status:'), error instanceof Error ? error.message : error);
    logger.error('Status command failed', { message: (error instanceof Error ? error.message : String(error)), code: (error && (error as any).code) ? (error as any).code : undefined });
    process.exit(1);
  }
}

/**
 * Token command - Display access token and copy to clipboard
 */
export async function tokenCommand(): Promise<void> {
  try {
    const config = await configManager.loadConfig();
    const tokens = await configManager.loadTokens();
    
    if (!config || !tokens) {
      console.error(chalk.red('❌ Not authenticated. Please run "auth-pkce login" first.'));
      process.exit(1);
    }
    
    // Check if token is expired
    if (configManager.isTokenExpired(tokens)) {
      console.error(chalk.red('❌ Access token expired. Please run "auth-pkce refresh" or "auth-pkce login".'));
      process.exit(1);
    }
    
    console.log(chalk.blue('🔑 Access Token:'));
    console.log(chalk.white('─'.repeat(40)));
    console.log(chalk.green(tokens.accessToken));
    
    const expiresIn = Math.floor((tokens.expiresAt - Date.now()) / 1000 / 60);
    console.log(chalk.gray(`\nExpires in: ${expiresIn} minutes`));
    
    // Copy to clipboard
    try {
      // Detect platform and use appropriate clipboard command
      const platform = process.platform;
      
      if (platform === 'darwin') {
        // macOS - use printf to avoid newline and quotes
        await execAsync(`printf '%s' "${tokens.accessToken}" | pbcopy`);
      } else if (platform === 'win32') {
        // Windows - write to file then use clip to avoid quote issues
        const { writeFile, unlink } = await import('fs/promises');
        const tmpFile = `${process.env.TEMP || process.env.TMP || '.'}/.auth-pkce-token-tmp`;
        try {
          await writeFile(tmpFile, tokens.accessToken, 'utf8');
          await execAsync(`type "${tmpFile}" | clip`);
          await unlink(tmpFile);
        } catch (err) {
          // Try to clean up temp file even if clip fails
          try { 
            await unlink(tmpFile); 
          } catch {
            // Ignore cleanup errors
          }
          throw err;
        }
      } else {
        // Linux/Unix - try xclip first, then xsel
        try {
          await execAsync('which xclip');
          await execAsync(`printf '%s' "${tokens.accessToken}" | xclip -selection clipboard`);
        } catch {
          try {
            await execAsync('which xsel');
            await execAsync(`printf '%s' "${tokens.accessToken}" | xsel --clipboard --input`);
          } catch {
            console.log(chalk.yellow('📋 Clipboard not available. Token displayed above.'));
            return;
          }
        }
      }
      
      console.log(chalk.green('📋 Access token copied to clipboard!'));
      
    } catch (error) {
      console.log(chalk.yellow('📋 Could not copy to clipboard. Token displayed above.'));
      logger.warn('Clipboard copy failed', { error });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to get access token:'), error instanceof Error ? error.message : error);
    logger.error('Token command failed', { message: (error instanceof Error ? error.message : String(error)), code: (error && (error as any).code) ? (error as any).code : undefined });
    process.exit(1);
  }
}
