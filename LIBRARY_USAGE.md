# auth-pkce Library Usage Guide

This document provides a comprehensive guide for using auth-pkce as a library in your Node.js CLI applications.

## Overview

The auth-pkce library allows you to easily add OAuth 2.0 PKCE authentication to your CLI applications. Your users can authenticate once and use the same credentials across multiple CLIs that use this library.

## Installation

```bash
npm install auth-pkce
```

## Quick Start

### 1. Simple Integration

Add authentication to your CLI with one line:

```typescript
import { Command } from 'commander';
import { addAuthToCLI } from 'auth-pkce';

const program = new Command()
  .name('my-cli')
  .version('1.0.0');

addAuthToCLI(program, { cliName: 'my-cli' });
program.parse();
```

**Result**: Your CLI now has these commands:
- `my-cli login` - Authenticate
- `my-cli logout` - Sign out
- `my-cli whoami` - Show user info
- `my-cli auth configure` - Setup OAuth
- `my-cli auth status` - Check auth status
- `my-cli auth refresh` - Refresh tokens
- `my-cli auth token` - Show access token

### 2. Full Control Integration

```typescript
import { Command } from 'commander';
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command();
const auth = new AuthPKCELibrary({
  cliName: 'my-cli',
  version: '1.0.0'
});

// Add auth commands
auth.addAuthCommands(program);

// Add protected commands
program
  .command('deploy')
  .action(async () => {
    try {
      await auth.status(); // Verify authentication
      console.log('Deploying...');
    } catch {
      console.log('Please login first: my-cli login');
    }
  });
```

## API Reference

### AuthPKCELibrary Class

```typescript
class AuthPKCELibrary {
  constructor(options?: AuthPKCELibraryOptions)
  
  // Add auth commands to existing CLI program
  addAuthCommands(program: Command): void
  
  // Create new CLI program with auth commands
  createCLI(): Command
  
  // Direct API methods
  async configure(options?: { baseUrl?: string }): Promise<void>
  async login(): Promise<void>
  async logout(): Promise<void>
  async whoami(): Promise<void>
  async refresh(): Promise<void>
  async status(): Promise<void>
  async token(): Promise<void>
}
```

### Options Interface

```typescript
interface AuthPKCELibraryOptions {
  cliName?: string;         // CLI name for branding (default: 'auth-pkce')
  version?: string;         // CLI version (default: '1.0.0')
  suppressColors?: boolean; // Disable colored output (default: false)
  silent?: boolean;         // Suppress all output (default: false)
}
```

### Utility Functions

```typescript
// Factory function for quick setup
function createAuthPKCE(options?: AuthPKCELibraryOptions): AuthPKCELibrary

// Quick helper to add auth to existing CLI
function addAuthToCLI(program: Command, options?: AuthPKCELibraryOptions): void
```

## Integration Patterns

### 1. Basic CLI with Auth

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { addAuthToCLI } from 'auth-pkce';

const program = new Command()
  .name('my-app')
  .description('My CLI application')
  .version('1.0.0');

// Your regular commands
program
  .command('hello')
  .action(() => console.log('Hello World!'));

// Add authentication
addAuthToCLI(program, { cliName: 'my-app' });

program.parse();
```

### 2. Protected Commands

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

const auth = new AuthPKCELibrary({ cliName: 'my-app' });
auth.addAuthCommands(program);

async function requireAuth() {
  try {
    await auth.status();
    return true;
  } catch {
    console.log('❌ Authentication required. Run: my-app login');
    process.exit(1);
  }
}

program
  .command('secret')
  .action(async () => {
    await requireAuth();
    console.log('🎉 Secret data access granted!');
  });
```

### 3. Programmatic Usage

```typescript
const auth = new AuthPKCELibrary({ silent: true });

// Use in your service/API code
class MyService {
  async initialize() {
    try {
      await auth.status();
      console.log('✅ Authenticated');
    } catch {
      console.log('Please authenticate first');
      await auth.login();
    }
  }
}
```

### 4. Environment-Specific Configuration

```typescript
const env = process.env.NODE_ENV || 'production';
const auth = new AuthPKCELibrary({
  cliName: `my-app-${env}`,
  silent: env === 'test'
});
```

## Command Structure

After integration, your CLI will have these authentication commands:

| Command | Description | Alias |
|---------|-------------|-------|
| `cli auth configure` | Interactive OAuth setup | `cli auth config` |
| `cli login` | Start authentication flow | - |
| `cli logout` | Sign out and clear tokens | - |
| `cli whoami` | Show current user info | - |
| `cli auth refresh` | Refresh access token | - |
| `cli auth status` | Show auth status | - |
| `cli auth token` | Display access token | - |

## Configuration Files

The library manages authentication data in `~/.auth-pkce/`:

```
~/.auth-pkce/
├── config.json    # OAuth configuration
├── tokens.json    # Access/refresh tokens  
└── logs/          # Application logs
```

**Benefits:**
- ✅ Shared configuration across all CLIs using auth-pkce
- ✅ Single authentication for multiple tools
- ✅ Secure token storage with proper file permissions
- ✅ Automatic token refresh handling

## Error Handling

```typescript
try {
  await auth.login();
} catch (error) {
  if (error.message.includes('configuration')) {
    console.log('Setup required: my-cli auth configure');
  } else if (error.message.includes('expired')) {
    console.log('Token expired: my-cli auth refresh');
  } else {
    console.error('Auth error:', error.message);
  }
}
```

## Best Practices

### 1. Check Authentication Before Protected Operations

```typescript
program
  .command('deploy')
  .action(async () => {
    try {
      await auth.status();
      // Proceed with deployment
    } catch {
      console.log('Please authenticate first: my-cli login');
      process.exit(1);
    }
  });
```

### 2. Use Consistent CLI Naming

```typescript
const auth = new AuthPKCELibrary({
  cliName: 'my-company-cli', // Consistent across all auth messages
  version: packageJson.version
});
```

### 3. Handle Token Expiration Gracefully

```typescript
async function ensureValidToken() {
  try {
    await auth.status();
  } catch {
    console.log('Refreshing expired token...');
    try {
      await auth.refresh();
    } catch {
      console.log('Please login again: my-cli login');
      process.exit(1);
    }
  }
}
```

### 4. Use Silent Mode for Services

```typescript
// In background services or APIs
const auth = new AuthPKCELibrary({ 
  silent: true // Don't clutter service logs
});
```

## Examples

See the complete working examples:

- **[`examples/ali-cli/`](examples/ali-cli/)** - Full CLI integration example
- **[`examples/integration-examples.md`](examples/integration-examples.md)** - Various integration patterns
- **[`examples/test-library.js`](examples/test-library.js)** - Library export verification

## Migration from Standalone CLI

If you're already using auth-pkce as a standalone CLI, your existing configuration and tokens will work seamlessly with library-integrated CLIs. No migration needed!

## Troubleshooting

### Library Not Found
```bash
npm install auth-pkce
```

### TypeScript Import Issues
```typescript
// Use CommonJS import if ES modules cause issues
const { AuthPKCELibrary } = require('auth-pkce');
```

### Commands Not Appearing
Ensure you call `program.parse()` after adding auth commands:

```typescript
auth.addAuthCommands(program);
program.parse(); // This must be after addAuthCommands
```

## Support

- 📚 [Main Documentation](README.md)
- 🐛 [Issue Tracker](https://github.com/alishah730/auth-pkce/issues)
- 💬 [Discussions](https://github.com/alishah730/auth-pkce/discussions)

This makes it incredibly easy for Node.js CLI developers to add enterprise-grade OAuth 2.0 PKCE authentication to their applications!
