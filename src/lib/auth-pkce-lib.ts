import { Command } from 'commander';
import { AuthPkceApi } from '../api';
import {
  AuthCommandContext,
  configureCommand,
  loginCommand,
  logoutCommand,
  refreshCommand,
  statusCommand,
  tokenCommand,
  whoamiCommand,
} from '../commands';
import { ConfigManager } from '../config/manager';
import { UserInfo } from '../types';

export interface AuthPKCELibraryOptions {
  cliName?: string;
  version?: string;
  /** Command group added to a host CLI. Set false to add commands at the root. */
  commandGroup?: string | false;
  /** Isolate credentials for this CLI. Defaults to AUTH_PKCE_CONFIG_DIR or ~/.auth-pkce. */
  configDir?: string;
  autoRefresh?: boolean;
}

export class AuthPKCELibrary {
  private readonly options: Required<Omit<AuthPKCELibraryOptions, 'configDir'>> & {
    configDir?: string;
  };
  private readonly configManager: ConfigManager;
  private readonly api: AuthPkceApi;

  public constructor(options: AuthPKCELibraryOptions = {}) {
    this.options = {
      cliName: options.cliName ?? 'auth-pkce',
      version: options.version ?? '0.0.0',
      commandGroup: options.commandGroup ?? 'auth',
      configDir: options.configDir,
      autoRefresh: options.autoRefresh ?? true,
    };
    this.configManager = options.configDir
      ? new ConfigManager({ configDir: options.configDir })
      : ConfigManager.getInstance();
    this.api = new AuthPkceApi({
      autoRefresh: this.options.autoRefresh,
      configDir: this.configManager.getConfigDir(),
    });
  }

  private commandContext(): AuthCommandContext {
    const group = this.options.commandGroup === false ? '' : ` ${this.options.commandGroup}`;
    return {
      commandName: `${this.options.cliName}${group}`,
      configManager: this.configManager,
    };
  }

  public addAuthCommands(program: Command): void {
    const parent = this.options.commandGroup === false
      ? program
      : program.command(this.options.commandGroup).description('Authentication commands');
    const context = this.commandContext();

    parent
      .command('configure')
      .alias('config')
      .description('configure OAuth settings interactively')
      .option('-b, --base-url <url>', 'OpenID Connect issuer URL')
      .action(async (options: { baseUrl?: string }) => configureCommand(options, context));

    parent.command('login').description('authenticate using Authorization Code + PKCE')
      .action(async () => loginCommand(context));
    parent.command('logout').description('revoke tokens when supported and clear local tokens')
      .action(async () => logoutCommand(context));
    parent.command('whoami').description('show user information from the UserInfo endpoint')
      .action(async () => whoamiCommand(context));
    parent.command('refresh').description('refresh the access token')
      .action(async () => refreshCommand(context));
    parent.command('status').description('show authentication status')
      .action(async () => statusCommand(context));
    parent.command('token').description('copy the current access token to the clipboard')
      .option('--show', 'also print the token to stdout')
      .action(async (options: { show?: boolean }) => tokenCommand(options, context));
  }

  public createCLI(): Command {
    const program = new Command()
      .name(this.options.cliName)
      .description('OAuth 2.0 Authorization Code + PKCE authentication')
      .version(this.options.version);
    this.addAuthCommands(program);
    return program;
  }

  public async configure(options: { baseUrl?: string } = {}): Promise<void> {
    return configureCommand(options, this.commandContext());
  }

  public async login(): Promise<void> {
    return loginCommand(this.commandContext());
  }

  public async logout(): Promise<void> {
    return logoutCommand(this.commandContext());
  }

  public async whoami(): Promise<void> {
    return whoamiCommand(this.commandContext());
  }

  public async refresh(): Promise<void> {
    return refreshCommand(this.commandContext());
  }

  public async status(): Promise<void> {
    return statusCommand(this.commandContext());
  }

  public async token(options: { show?: boolean } = {}): Promise<void> {
    return tokenCommand(options, this.commandContext());
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.api.isAuthenticated();
  }

  public async getUserInfo(): Promise<UserInfo | null> {
    return this.api.getUserInfo();
  }

  public async getAccessToken(): Promise<string> {
    const token = await this.api.getAccessToken();
    if (!token) {
      throw new Error(`Not authenticated. Run: ${this.commandContext().commandName} login`);
    }
    return token;
  }

  public async getBearerToken(): Promise<string> {
    return `Bearer ${await this.getAccessToken()}`;
  }
}

export function createAuthPKCE(options: AuthPKCELibraryOptions = {}): AuthPKCELibrary {
  return new AuthPKCELibrary(options);
}

export function addAuthToCLI(program: Command, options: AuthPKCELibraryOptions = {}): void {
  new AuthPKCELibrary(options).addAuthCommands(program);
}
