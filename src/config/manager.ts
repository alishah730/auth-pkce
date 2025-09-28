import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import { CLIConfig, StoredTokens } from '../types';
import logger from '../utils/logger';

const CONFIG_DIR = path.join(os.homedir(), '.auth-pkce');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TOKENS_FILE = path.join(CONFIG_DIR, 'tokens.json');

export class ConfigManager {
  private static instance: ConfigManager;
  private config: CLIConfig | null = null;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration directory
   */
  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.ensureDir(CONFIG_DIR);
      // Set restrictive permissions for security
      await fs.chmod(CONFIG_DIR, 0o700);
    } catch (error) {
      logger.error('Failed to create config directory', { error });
      throw new Error('Failed to initialize configuration directory');
    }
  }

  /**
   * Load configuration from file
   */
  public async loadConfig(): Promise<CLIConfig | null> {
    try {
      await this.ensureConfigDir();
      
      if (await fs.pathExists(CONFIG_FILE)) {
        const configData = await fs.readJson(CONFIG_FILE);
        this.config = configData;
        logger.debug('Configuration loaded successfully');
        return this.config;
      }
      
      logger.info('No configuration file found');
      return null;
    } catch (error) {
      logger.error('Failed to load configuration', { error });
      throw new Error('Failed to load configuration file');
    }
  }

  /**
   * Save configuration to file
   */
  public async saveConfig(config: CLIConfig): Promise<void> {
    try {
      await this.ensureConfigDir();
      await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
      await fs.chmod(CONFIG_FILE, 0o600); // Restrictive permissions
      this.config = config;
      logger.info('Configuration saved successfully');
    } catch (error) {
      logger.error('Failed to save configuration', { error });
      throw new Error('Failed to save configuration file');
    }
  }

  /**
   * Interactive configuration setup
   */
  public async configureInteractively(baseUrl?: string): Promise<CLIConfig> {
    const questions = [
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Enter the OAuth provider base URL:',
        default: baseUrl || this.config?.baseUrl,
        validate: (input: string): string | boolean => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      },
      {
        type: 'input',
        name: 'clientId',
        message: 'Enter your OAuth client ID:',
        default: this.config?.clientId,
        validate: (input: string): string | boolean => input.trim() !== '' || 'Client ID is required'
      },
      {
        type: 'input',
        name: 'redirectUri',
        message: 'Enter the redirect URI:',
        default: this.config?.redirectUri || 'http://localhost:8080/callback',
        validate: (input: string): string | boolean => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid redirect URI';
          }
        }
      },
      {
        type: 'input',
        name: 'scope',
        message: 'Enter the OAuth scopes (space-separated):',
        default: this.config?.scope || 'openid profile email'
      },
      {
        type: 'list',
        name: 'logLevel',
        message: 'Select log level:',
        choices: ['error', 'warn', 'info', 'debug'],
        default: this.config?.logLevel || 'info'
      }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answers = await inquirer.prompt(questions as any);
    
    const config: CLIConfig = {
      clientId: answers.clientId,
      baseUrl: answers.baseUrl,
      redirectUri: answers.redirectUri,
      scope: answers.scope,
      configVersion: '1.0.0'
    };

    await this.saveConfig(config);
    return config;
  }

  /**
   * Get current configuration
   */
  public getConfig(): CLIConfig | null {
    return this.config;
  }

  /**
   * Save tokens securely
   */
  public async saveTokens(tokens: StoredTokens): Promise<void> {
    try {
      await this.ensureConfigDir();
      await fs.writeJson(TOKENS_FILE, tokens, { spaces: 2 });
      await fs.chmod(TOKENS_FILE, 0o600); // Restrictive permissions
      logger.debug('Tokens saved successfully');
    } catch (error) {
      logger.error('Failed to save tokens', { error });
      throw new Error('Failed to save authentication tokens');
    }
  }

  /**
   * Load stored tokens
   */
  public async loadTokens(): Promise<StoredTokens | null> {
    try {
      if (await fs.pathExists(TOKENS_FILE)) {
        const tokens = await fs.readJson(TOKENS_FILE);
        logger.debug('Tokens loaded successfully');
        return tokens;
      }
      return null;
    } catch (error) {
      logger.error('Failed to load tokens', { error });
      throw new Error('Failed to load authentication tokens');
    }
  }

  /**
   * Clear stored tokens
   */
  public async clearTokens(): Promise<void> {
    try {
      if (await fs.pathExists(TOKENS_FILE)) {
        await fs.remove(TOKENS_FILE);
        logger.info('Tokens cleared successfully');
      }
    } catch (error) {
      logger.error('Failed to clear tokens', { error });
      throw new Error('Failed to clear authentication tokens');
    }
  }

  /**
   * Check if tokens are expired
   */
  public isTokenExpired(tokens: StoredTokens): boolean {
    return Date.now() >= tokens.expiresAt;
  }
}
