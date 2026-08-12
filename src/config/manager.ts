import { randomUUID } from 'node:crypto';
import { access, chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import inquirer from 'inquirer';
import { CLIConfig, StoredTokens } from '../types';
import { ErrorHandler, validateIssuerUrl, validateLoopbackRedirectUri } from '../utils/errors';
import logger from '../utils/logger';

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.auth-pkce');

export interface ConfigManagerOptions {
  configDir?: string;
}

interface ConfigurationAnswers {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  audience: string;
  logLevel: CLIConfig['logLevel'];
}

export class ConfigManager {
  private static instance: ConfigManager;
  private readonly configDir: string;
  private readonly configFile: string;
  private readonly tokensFile: string;
  private config: CLIConfig | null = null;

  public constructor(options: ConfigManagerOptions = {}) {
    this.configDir = path.resolve(
      options.configDir || process.env.AUTH_PKCE_CONFIG_DIR || DEFAULT_CONFIG_DIR
    );
    this.configFile = path.join(this.configDir, 'config.json');
    this.tokensFile = path.join(this.configDir, 'tokens.json');
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfigDir(): string {
    return this.configDir;
  }

  public getConfigPath(): string {
    return this.configFile;
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await mkdir(this.configDir, { recursive: true, mode: 0o700 });
      if (process.platform !== 'win32') {
        await chmod(this.configDir, 0o700);
      }
    } catch (error) {
      logger.error('Failed to create config directory', { error });
      throw new Error('Failed to initialize configuration directory', { cause: error });
    }
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readJson(filePath: string): Promise<unknown> {
    const contents = await readFile(filePath, 'utf8');
    return JSON.parse(contents) as unknown;
  }

  private async writeJsonSecure(filePath: string, value: unknown): Promise<void> {
    await this.ensureConfigDir();
    const temporaryFile = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

    try {
      await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
      if (process.platform !== 'win32') {
        await chmod(temporaryFile, 0o600);
      }
      await rename(temporaryFile, filePath);
      if (process.platform !== 'win32') {
        await chmod(filePath, 0o600);
      }
    } finally {
      await rm(temporaryFile, { force: true });
    }
  }

  public async loadConfig(): Promise<CLIConfig | null> {
    try {
      await this.ensureConfigDir();
      if (!await this.pathExists(this.configFile)) {
        return null;
      }

      const configData = await this.readJson(this.configFile);
      if (!configData || typeof configData !== 'object' || Array.isArray(configData)) {
        throw new Error('Configuration must be a JSON object');
      }

      ErrorHandler.validateConfig(configData as Record<string, unknown>);
      this.config = configData as CLIConfig;
      logger.debug('Configuration loaded successfully');
      return this.config;
    } catch (error) {
      logger.error('Failed to load configuration', { error });
      throw new Error('Failed to load configuration file', { cause: error });
    }
  }

  public async saveConfig(config: CLIConfig): Promise<void> {
    try {
      ErrorHandler.validateConfig(config as unknown as Record<string, unknown>);
      await this.writeJsonSecure(this.configFile, config);
      this.config = config;
      logger.info('Configuration saved successfully');
    } catch (error) {
      logger.error('Failed to save configuration', { error });
      throw new Error('Failed to save configuration file', { cause: error });
    }
  }

  public async configureInteractively(baseUrl?: string): Promise<CLIConfig> {
    const answers = await inquirer.prompt<ConfigurationAnswers>([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Enter the OpenID Connect issuer URL:',
        default: baseUrl || this.config?.baseUrl,
        validate: (input: string): string | boolean => {
          try {
            validateIssuerUrl(input);
            return true;
          } catch (error) {
            return error instanceof Error ? error.message : 'Please enter a valid issuer URL';
          }
        },
      },
      {
        type: 'input',
        name: 'clientId',
        message: 'Enter your OAuth client ID:',
        default: this.config?.clientId,
        validate: (input: string): string | boolean => input.trim() !== '' || 'Client ID is required',
      },
      {
        type: 'input',
        name: 'redirectUri',
        message: 'Enter the loopback redirect URI:',
        default: this.config?.redirectUri || 'http://127.0.0.1:8080/callback',
        validate: (input: string): string | boolean => {
          try {
            validateLoopbackRedirectUri(input);
            return true;
          } catch (error) {
            return error instanceof Error ? error.message : 'Please enter a valid redirect URI';
          }
        },
      },
      {
        type: 'input',
        name: 'scope',
        message: 'Enter the OAuth scopes (space-separated):',
        default: this.config?.scope || 'openid profile email',
        validate: (input: string): string | boolean => input.trim() !== '' || 'At least one scope is required',
      },
      {
        type: 'input',
        name: 'audience',
        message: 'Enter the token audience (optional):',
        default: this.config?.audience || '',
      },
      {
        type: 'list',
        name: 'logLevel',
        message: 'Select log level:',
        choices: ['error', 'warn', 'info', 'debug'],
        default: this.config?.logLevel || 'info',
      },
    ]);

    const config: CLIConfig = {
      clientId: answers.clientId.trim(),
      baseUrl: answers.baseUrl.replace(/\/$/, ''),
      redirectUri: answers.redirectUri,
      scope: answers.scope.trim(),
      audience: answers.audience.trim() || undefined,
      logLevel: answers.logLevel,
      configVersion: '1.0.0',
    };

    await this.saveConfig(config);
    return config;
  }

  public getConfig(): CLIConfig | null {
    return this.config;
  }

  public async saveTokens(tokens: StoredTokens): Promise<void> {
    try {
      if (!tokens.accessToken || !tokens.tokenType || !Number.isFinite(tokens.expiresAt)) {
        throw new Error('Invalid token response');
      }
      await this.writeJsonSecure(this.tokensFile, tokens);
      logger.debug('Tokens saved successfully');
    } catch (error) {
      logger.error('Failed to save tokens', { error });
      throw new Error('Failed to save authentication tokens', { cause: error });
    }
  }

  public async loadTokens(): Promise<StoredTokens | null> {
    try {
      await this.ensureConfigDir();
      if (!await this.pathExists(this.tokensFile)) {
        return null;
      }

      const tokens = await this.readJson(this.tokensFile);
      if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) {
        throw new Error('Token data must be a JSON object');
      }

      const candidate = tokens as Partial<StoredTokens>;
      if (!candidate.accessToken || !candidate.tokenType || !Number.isFinite(candidate.expiresAt)) {
        throw new Error('Stored token data is invalid');
      }
      return candidate as StoredTokens;
    } catch (error) {
      logger.error('Failed to load tokens', { error });
      throw new Error('Failed to load authentication tokens', { cause: error });
    }
  }

  public async clearTokens(): Promise<void> {
    try {
      await rm(this.tokensFile, { force: true });
      logger.info('Tokens cleared successfully');
    } catch (error) {
      logger.error('Failed to clear tokens', { error });
      throw new Error('Failed to clear authentication tokens', { cause: error });
    }
  }

  public isTokenExpired(tokens: StoredTokens, clockSkewSeconds: number = 30): boolean {
    return Date.now() + Math.max(0, clockSkewSeconds) * 1000 >= tokens.expiresAt;
  }
}
