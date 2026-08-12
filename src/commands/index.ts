import { spawn } from 'node:child_process';
import chalk from 'chalk';
import { AuthPkceApi } from '../api';
import { ConfigManager } from '../config/manager';
import { OAuthClient } from '../services/oauth-client';
import { StoredTokens } from '../types';

export interface AuthCommandContext {
  commandName?: string;
  configManager?: ConfigManager;
}

export interface TokenCommandOptions {
  show?: boolean;
}

function resolveContext(context: AuthCommandContext = {}): {
  commandName: string;
  configManager: ConfigManager;
} {
  return {
    commandName: context.commandName || 'auth-pkce',
    configManager: context.configManager || ConfigManager.getInstance(),
  };
}

function storeTokenResponse(
  response: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  },
  previous?: StoredTokens
): StoredTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token || previous?.refreshToken,
    idToken: response.id_token || previous?.idToken,
    expiresAt: Date.now() + response.expires_in * 1000,
    tokenType: response.token_type,
    scope: response.scope || previous?.scope,
  };
}

export async function configureCommand(
  options: { baseUrl?: string } = {},
  context: AuthCommandContext = {}
): Promise<void> {
  const { configManager } = resolveContext(context);
  console.log(chalk.blue('Configuring OAuth authentication...'));
  await configManager.loadConfig();
  await configManager.configureInteractively(options.baseUrl);
  console.log(chalk.green('Configuration saved.'));
  console.log(chalk.gray(configManager.getConfigPath()));
}

export async function loginCommand(context: AuthCommandContext = {}): Promise<void> {
  const { commandName, configManager } = resolveContext(context);
  const config = await configManager.loadConfig();
  if (!config) {
    throw new Error(`No configuration found. Run: ${commandName} configure`);
  }

  console.log(chalk.blue('Opening your browser for authentication...'));
  const response = await new OAuthClient(config).authorize();
  await configManager.saveTokens(storeTokenResponse(response));
  console.log(chalk.green('Authentication successful.'));
}

export async function logoutCommand(context: AuthCommandContext = {}): Promise<void> {
  const { configManager } = resolveContext(context);
  const [config, tokens] = await Promise.all([
    configManager.loadConfig(),
    configManager.loadTokens(),
  ]);

  if (config && tokens) {
    const client = new OAuthClient(config);
    await Promise.all([
      client.revokeToken(tokens.accessToken, 'access_token'),
      tokens.refreshToken
        ? client.revokeToken(tokens.refreshToken, 'refresh_token')
        : Promise.resolve(),
    ]);
  }

  await configManager.clearTokens();
  console.log(chalk.green('Logged out locally.'));
}

export async function whoamiCommand(context: AuthCommandContext = {}): Promise<void> {
  const { commandName, configManager } = resolveContext(context);
  const api = new AuthPkceApi({ configDir: configManager.getConfigDir() });
  const userInfo = await api.getUserInfo();
  if (!userInfo) {
    throw new Error(`User information is unavailable. Run: ${commandName} login`);
  }

  console.log(chalk.blue('Current user'));
  console.log(chalk.cyan('User ID:'), userInfo.sub);
  if (userInfo.name) console.log(chalk.cyan('Name:'), userInfo.name);
  if (userInfo.email) console.log(chalk.cyan('Email:'), userInfo.email);
  if (userInfo.preferred_username) {
    console.log(chalk.cyan('Username:'), userInfo.preferred_username);
  }
}

export async function refreshCommand(context: AuthCommandContext = {}): Promise<void> {
  const { commandName, configManager } = resolveContext(context);
  const [config, tokens] = await Promise.all([
    configManager.loadConfig(),
    configManager.loadTokens(),
  ]);
  if (!config || !tokens?.refreshToken) {
    throw new Error(`No refresh token is available. Run: ${commandName} login`);
  }

  const response = await new OAuthClient(config).refreshToken(tokens.refreshToken);
  await configManager.saveTokens(storeTokenResponse(response, tokens));
  console.log(chalk.green('Access token refreshed.'));
}

export async function statusCommand(context: AuthCommandContext = {}): Promise<void> {
  const { commandName, configManager } = resolveContext(context);
  const [config, tokens] = await Promise.all([
    configManager.loadConfig(),
    configManager.loadTokens(),
  ]);

  if (!config) {
    console.log(chalk.yellow(`Not configured. Run: ${commandName} configure`));
    return;
  }

  console.log(chalk.blue('Authentication status'));
  console.log(chalk.cyan('Issuer:'), config.baseUrl);
  console.log(chalk.cyan('Client ID:'), config.clientId);
  console.log(chalk.cyan('Redirect URI:'), config.redirectUri);

  if (!tokens) {
    console.log(chalk.yellow(`Not logged in. Run: ${commandName} login`));
    return;
  }

  if (configManager.isTokenExpired(tokens)) {
    console.log(chalk.yellow(`Token expired. Run: ${commandName} refresh`));
    return;
  }

  const expiresIn = Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 60_000));
  console.log(chalk.green('Authenticated'));
  console.log(chalk.cyan('Expires in:'), `${expiresIn} minute(s)`);
}

function pipeToProcess(command: string, args: string[], value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'ignore'] });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${String(code)}`));
      }
    });
    child.stdin.on('error', () => {
      // The child process error/exit handlers above report command failures.
    });
    child.stdin.end(value);
  });
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      await pipeToProcess('pbcopy', [], value);
    } else if (process.platform === 'win32') {
      await pipeToProcess('clip', [], value);
    } else {
      try {
        await pipeToProcess('xclip', ['-selection', 'clipboard'], value);
      } catch {
        await pipeToProcess('xsel', ['--clipboard', '--input'], value);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function tokenCommand(
  options: TokenCommandOptions = {},
  context: AuthCommandContext = {}
): Promise<void> {
  const { commandName, configManager } = resolveContext(context);
  const api = new AuthPkceApi({ configDir: configManager.getConfigDir() });
  const token = await api.getAccessToken();
  if (!token) {
    throw new Error(`No valid access token is available. Run: ${commandName} login`);
  }

  if (options.show) {
    console.log(token);
  }

  if (await copyToClipboard(token)) {
    console.log(chalk.green('Access token copied to the clipboard.'));
  } else if (!options.show) {
    console.log(chalk.yellow(`Clipboard unavailable. Re-run with: ${commandName} token --show`));
  }
}
