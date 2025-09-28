# Ali CLI - Example using auth-pkce Library

This is an example CLI project demonstrating how to integrate the `auth-pkce` library into your own Node.js CLI application.

## Features

The Ali CLI inherits all authentication commands from auth-pkce:
- `ali auth configure` - Configure OAuth settings
- `ali login` - Authenticate using OAuth 2.0 PKCE flow  
- `ali logout` - Logout and clear stored tokens
- `ali whoami` - Display current user information
- `ali auth refresh` - Refresh access token
- `ali auth status` - Show authentication status
- `ali auth token` - Display access token

Plus custom commands:
- `ali hello` - Say hello (public command)
- `ali profile` - Show user profile (requires authentication)
- `ali protected` - Example protected command

## Installation

```bash
# Install dependencies
npm install

# Build the project  
npm run build

# Install globally to use the 'ali' command
npm install -g .
```

## Usage

### 1. Configure OAuth Settings

```bash
ali auth configure
```

### 2. Authenticate

```bash  
ali login
```

### 3. Use Commands

```bash
# Public command
ali hello --name "Developer"

# Protected commands (require authentication)
ali profile
ali protected

# Check authentication status
ali auth status
```

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build
```

## How It Works

The Ali CLI uses the `auth-pkce` library in two ways:

### Method 1: Adding Commands to Existing CLI (Recommended)

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command();
const authLib = new AuthPKCELibrary({
  cliName: 'ali',
  version: '1.0.0'
});

// Add all auth commands to your existing CLI
authLib.addAuthCommands(program);
```

### Method 2: Using Individual Functions

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

const authLib = new AuthPKCELibrary();

// Call individual auth functions
await authLib.login();
await authLib.whoami();
await authLib.status();
```

### Method 3: Creating a New CLI

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

const authLib = new AuthPKCELibrary({
  cliName: 'my-cli',
  version: '1.0.0'
});

// Create a complete CLI with auth commands
const program = authLib.createCLI();
```

## Library Options

```typescript
interface AuthPKCELibraryOptions {
  cliName?: string;      // Custom CLI name for branding
  version?: string;      // Custom version
  suppressColors?: boolean; // Disable colored output
  silent?: boolean;      // Suppress all console output
}
```

## Configuration

The library uses the same configuration as the standalone auth-pkce CLI:
- Configuration: `~/.auth-pkce/config.json`
- Tokens: `~/.auth-pkce/tokens.json` 
- Logs: `~/.auth-pkce/logs/`

This means you can switch between different CLIs that use auth-pkce seamlessly!
