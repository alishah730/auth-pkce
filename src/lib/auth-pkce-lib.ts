import { Command } from 'commander';
import { 
  configureCommand,
  loginCommand,
  logoutCommand,
  whoamiCommand,
  refreshCommand,
  statusCommand,
  tokenCommand
} from '../commands';

export interface AuthPKCELibraryOptions {
  /** Custom CLI name for branded output */
  cliName?: string;
  /** Custom version for version command */
  version?: string;
  /** Suppress colored output */
  suppressColors?: boolean;
  /** Silent mode - suppress console output */
  silent?: boolean;
}

export class AuthPKCELibrary {
  private options: AuthPKCELibraryOptions;
  private originalLog: typeof console.log;
  private originalError: typeof console.error;

  constructor(options: AuthPKCELibraryOptions = {}) {
    this.options = {
      cliName: 'auth-pkce',
      version: '1.0.0',
      suppressColors: false,
      silent: false,
      ...options
    };

    // Store original console methods
    this.originalLog = console.log;
    this.originalError = console.error;
  }

  /**
   * Setup silence mode if enabled
   */
  private setupSilentMode(): () => void {
    if (this.options.silent) {
      console.log = (): void => {};
      console.error = (): void => {};
    }

    // Return cleanup function
    return (): void => {
      console.log = this.originalLog;
      console.error = this.originalError;
    };
  }

  /**
   * Add auth commands to an existing Commander program
   */
  public addAuthCommands(program: Command): void {
    // Auth group commands
    const authCommand = program
      .command('auth')
      .description('Authentication commands');

    // Configure command
    authCommand
      .command('configure')
      .alias('config')
      .description('configure OAuth settings interactively')
      .option('-b, --base-url <url>', 'OAuth provider base URL')
      .action(async (options) => {
        const cleanup = this.setupSilentMode();
        try {
          await configureCommand(options);
        } finally {
          cleanup();
        }
      });

    // Login command
    program
      .command('login')
      .description('authenticate using OAuth 2.0 PKCE flow')
      .action(async () => {
        const cleanup = this.setupSilentMode();
        try {
          await loginCommand();
        } finally {
          cleanup();
        }
      });

    // Logout command
    program
      .command('logout')
      .description('logout and clear stored tokens')
      .action(async () => {
        const cleanup = this.setupSilentMode();
        try {
          await logoutCommand();
        } finally {
          cleanup();
        }
      });

    // Whoami command
    program
      .command('whoami')
      .description('display current user information')
      .action(async () => {
        const cleanup = this.setupSilentMode();
        try {
          await whoamiCommand();
        } finally {
          cleanup();
        }
      });

    // Refresh command
    authCommand
      .command('refresh')
      .description('refresh access token using refresh token')
      .action(async () => {
        const cleanup = this.setupSilentMode();
        try {
          await refreshCommand();
        } finally {
          cleanup();
        }
      });

    // Status command
    authCommand
      .command('status')
      .description('show current authentication status')
      .action(async () => {
        const cleanup = this.setupSilentMode();
        try {
          await statusCommand();
        } finally {
          cleanup();
        }
      });

    // Token command
    authCommand
      .command('token')
      .description('display access token and copy to clipboard')
      .action(async () => {
        const cleanup = this.setupSilentMode();
        try {
          await tokenCommand();
        } finally {
          cleanup();
        }
      });
  }

  /**
   * Create a new Commander program with auth commands
   */
  public createCLI(): Command {
    const program = new Command();

    program
      .name(this.options.cliName || 'cli')
      .description(`CLI with OAuth 2.0 PKCE Authentication`)
      .version(this.options.version || '1.0.0', '-v, --version', 'display version number');

    this.addAuthCommands(program);

    return program;
  }

  /**
   * Direct API access to auth commands
   */
  public async configure(options: { baseUrl?: string } = {}): Promise<void> {
    const cleanup = this.setupSilentMode();
    try {
      await configureCommand(options);
    } finally {
      cleanup();
    }
  }

  public async login(): Promise<void> {
    const cleanup = this.setupSilentMode();
    try {
      await loginCommand();
    } finally {
      cleanup();
    }
  }

  public async logout(): Promise<void> {
    const cleanup = this.setupSilentMode();
    try {
      await logoutCommand();
    } finally {
      cleanup();
    }
  }

  public async whoami(): Promise<void> {
    const cleanup = this.setupSilentMode();
    try {
      await whoamiCommand();
    } finally {
      cleanup();
    }
  }

  public async refresh(): Promise<void> {
    const cleanup = this.setupSilentMode();
    try {
      await refreshCommand();
    } finally {
      cleanup();
    }
  }

  public async status(): Promise<void> {
    const cleanup = this.setupSilentMode();
    try {
      await statusCommand();
    } finally {
      cleanup();
    }
  }

  public async token(): Promise<void> {
    const cleanup = this.setupSilentMode();
    try {
      await tokenCommand();
    } finally {
      cleanup();
    }
  }
}

/**
 * Factory function for quick setup
 */
export function createAuthPKCE(options: AuthPKCELibraryOptions = {}): AuthPKCELibrary {
  return new AuthPKCELibrary(options);
}

/**
 * Quick helper to add auth commands to existing CLI
 */
export function addAuthToCLI(program: Command, options: AuthPKCELibraryOptions = {}): void {
  const authLib = new AuthPKCELibrary(options);
  authLib.addAuthCommands(program);
}
