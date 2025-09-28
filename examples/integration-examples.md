# Integration Examples for auth-pkce Library

This document shows various ways to integrate the `auth-pkce` library into your Node.js CLI projects.

## Installation

```bash
npm install auth-pkce
```

## Integration Patterns

### 1. Quick Integration with `addAuthToCLI`

The simplest way to add auth commands to an existing CLI:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { addAuthToCLI } from 'auth-pkce';

const program = new Command();

program
  .name('my-app')
  .description('My awesome CLI')
  .version('1.0.0');

// Add your regular commands
program
  .command('deploy')
  .description('Deploy your app')
  .action(() => {
    console.log('Deploying...');
  });

// Add auth commands in one line
addAuthToCLI(program, {
  cliName: 'my-app',
  version: '1.0.0'
});

program.parse();
```

**Result**: Your CLI now has `my-app login`, `my-app logout`, `my-app auth configure`, etc.

### 2. Class-Based Integration

More control using the AuthPKCELibrary class:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command();
const auth = new AuthPKCELibrary({
  cliName: 'my-app',
  silent: false
});

program
  .name('my-app')
  .description('My CLI with auth')
  .version('1.0.0');

// Add auth commands
auth.addAuthCommands(program);

// Protected command example
program
  .command('secret')
  .description('Access secret data')
  .action(async () => {
    try {
      // Check if user is authenticated
      await auth.status();
      console.log('🎉 Here\'s your secret data!');
    } catch {
      console.log('❌ Please login first: my-app login');
    }
  });

program.parse();
```

### 3. Programmatic API Usage

Use auth functions directly in your code:

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

class MyService {
  private auth: AuthPKCELibrary;

  constructor() {
    this.auth = new AuthPKCELibrary({
      silent: true // Don't show auth output in service
    });
  }

  async ensureAuthenticated(): Promise<boolean> {
    try {
      await this.auth.status();
      return true;
    } catch {
      return false;
    }
  }

  async authenticate(): Promise<void> {
    if (!(await this.ensureAuthenticated())) {
      console.log('Authentication required...');
      await this.auth.login();
    }
  }

  async getToken(): Promise<string> {
    await this.ensureAuthenticated();
    // You would capture the token output here
    await this.auth.token();
    return 'token'; // In real implementation, capture from auth.token()
  }
}
```

### 4. Custom Command Grouping

Group auth commands under a namespace:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { 
  configureCommand,
  loginCommand,
  logoutCommand,
  whoamiCommand,
  statusCommand
} from 'auth-pkce';

const program = new Command();

program
  .name('my-app')
  .description('My CLI')
  .version('1.0.0');

// Create auth subcommand group
const authGroup = program
  .command('auth')
  .description('Authentication commands');

authGroup
  .command('setup')
  .description('Configure OAuth settings')
  .action(configureCommand);

authGroup
  .command('signin')
  .description('Sign in to your account')
  .action(loginCommand);

authGroup
  .command('signout')
  .description('Sign out of your account')
  .action(logoutCommand);

authGroup
  .command('user')
  .description('Show current user')
  .action(whoamiCommand);

authGroup
  .command('check')
  .description('Check authentication status')
  .action(statusCommand);

program.parse();
```

**Usage**: `my-app auth setup`, `my-app auth signin`, etc.

### 5. Environment-Specific Configuration

Different auth configurations for different environments:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command();

// Determine environment
const env = process.env.NODE_ENV || 'production';

const auth = new AuthPKCELibrary({
  cliName: `my-app-${env}`,
  version: '1.0.0',
  silent: env === 'test'
});

program
  .name(`my-app-${env}`)
  .description(`My CLI (${env} environment)`)
  .version('1.0.0');

auth.addAuthCommands(program);

// Environment-specific commands
if (env === 'development') {
  program
    .command('dev-reset')
    .description('Reset auth for development')
    .action(async () => {
      await auth.logout();
      console.log('Development auth reset complete');
    });
}

program.parse();
```

### 6. With Configuration Validation

Add validation before running protected commands:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { AuthPKCELibrary, ConfigManager } from 'auth-pkce';

const program = new Command();
const auth = new AuthPKCELibrary({ cliName: 'my-app' });
const config = ConfigManager.getInstance();

auth.addAuthCommands(program);

// Middleware to check auth before protected commands
async function requireAuth() {
  const cfg = await config.loadConfig();
  const tokens = await config.loadTokens();
  
  if (!cfg) {
    console.log('❌ Not configured. Run: my-app auth configure');
    process.exit(1);
  }
  
  if (!tokens || config.isTokenExpired(tokens)) {
    console.log('❌ Not authenticated. Run: my-app login');
    process.exit(1);
  }
}

program
  .command('deploy')
  .description('Deploy application (requires auth)')
  .action(async () => {
    await requireAuth();
    console.log('✅ Deploying application...');
    // Your deployment logic here
  });

program.parse();
```

## Available Commands After Integration

Once integrated, your CLI will have these auth commands:

| Command | Description |
|---------|-------------|
| `cli auth configure` | Interactive OAuth configuration |
| `cli login` | Start OAuth PKCE authentication flow |
| `cli logout` | Logout and clear stored tokens |
| `cli whoami` | Display current user information |
| `cli auth refresh` | Refresh access token |
| `cli auth status` | Show authentication status |
| `cli auth token` | Display access token |

## Configuration Files

The library manages configuration in `~/.auth-pkce/`:
- `config.json` - OAuth configuration
- `tokens.json` - Stored access/refresh tokens
- `logs/` - Application logs

## Best Practices

1. **Use consistent CLI naming** across all auth commands
2. **Check authentication status** before protected operations
3. **Handle token expiration** gracefully with refresh
4. **Use silent mode** in services/background processes
5. **Validate configuration** exists before authentication
6. **Group auth commands** logically in your CLI structure

## Error Handling

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

const auth = new AuthPKCELibrary();

try {
  await auth.login();
} catch (error) {
  if (error.message.includes('configuration')) {
    console.log('Run: cli auth configure');
  } else if (error.message.includes('expired')) {
    console.log('Run: cli auth refresh');
  } else {
    console.error('Auth error:', error.message);
  }
}
```

This makes it easy for any Node.js CLI to inherit robust OAuth 2.0 PKCE authentication!
