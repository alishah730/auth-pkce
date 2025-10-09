# CLI Integration Example

This example demonstrates how to integrate `auth-pkce` into your own CLI application for OAuth 2.0 authentication.

## Overview

This example CLI (`my-api-cli`) shows how to:
- Use `auth-pkce` for authentication
- Read tokens from auth-pkce storage
- Make authenticated API calls
- Handle token refresh automatically
- Provide a seamless user experience

## Project Structure

```
examples/cli-integration/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── cli.ts            # Main CLI entry point
│   ├── commands.ts       # CLI command implementations
│   ├── api-client.ts     # HTTP client with auth integration
│   └── auth-manager.ts   # Auth-pkce integration layer
└── README.md            # This file
```

## Installation

1. **Install dependencies:**
   ```bash
   cd examples/cli-integration
   npm install
   ```

2. **Build the CLI:**
   ```bash
   npm run build
   ```

3. **Install auth-pkce globally (if not already installed):**
   ```bash
   npm install -g auth-pkce
   ```

## Setup Authentication

1. **Configure auth-pkce:**
   ```bash
   auth-pkce configure
   ```

2. **Login with auth-pkce:**
   ```bash
   auth-pkce login
   ```

## Usage

### Basic Commands

```bash
# Check authentication status
./dist/cli.js status

# Show current user
./dist/cli.js whoami

# List resources
./dist/cli.js list

# Create a resource
./dist/cli.js create "My Resource" --description "A test resource"

# Delete a resource
./dist/cli.js delete resource-id

# Show current access token
./dist/cli.js token

# Show auth setup instructions
./dist/cli.js auth
```

### Install as Global CLI

```bash
# Link for development
npm link

# Now use globally
my-api-cli status
my-api-cli whoami
```

## Integration Patterns

### 1. AuthManager Class

The `AuthManager` class provides methods to:
- Check authentication status
- Get access tokens
- Refresh tokens automatically
- Prompt users to authenticate

```typescript
import { AuthManager } from './auth-manager';

const authManager = new AuthManager();

// Check if authenticated
const isAuth = await authManager.isAuthenticated();

// Get access token (with auto-refresh)
const token = await authManager.getAccessToken();

// Ensure user is authenticated
const token = await authManager.ensureAuthenticated();
```

### 2. ApiClient Class

The `ApiClient` class provides:
- Automatic token injection
- Token refresh on 401 errors
- Standard HTTP methods with authentication

```typescript
import { ApiClient } from './api-client';

const client = new ApiClient({ 
  baseURL: 'https://api.example.com' 
});

// All requests automatically include auth headers
const user = await client.get('/user/me');
const resources = await client.get('/resources');
```

### 3. Token Access Methods

#### Method 1: Direct File Access
```typescript
// Read tokens directly from auth-pkce storage
const tokensPath = path.join(os.homedir(), '.auth-pkce', 'tokens.json');
const tokens = await fs.readJson(tokensPath);
```

#### Method 2: Command Execution
```typescript
// Use auth-pkce commands
await execAsync('auth-pkce refresh');
const { stdout } = await execAsync('auth-pkce status');
```

## Configuration

### Environment Variables

```bash
# API base URL
export API_BASE_URL=https://your-api.com

# Custom auth-pkce config path (optional)
export AUTH_PKCE_CONFIG_DIR=/custom/path
```

### API Client Configuration

```typescript
const apiClient = new ApiClient({
  baseURL: process.env.API_BASE_URL || 'https://api.example.com',
  timeout: 30000
});
```

## Error Handling

The integration handles common scenarios:

1. **Token Expiration**: Automatically refreshes tokens
2. **Authentication Required**: Prompts user to authenticate
3. **Network Errors**: Provides clear error messages
4. **Missing auth-pkce**: Guides user to install and configure

## Best Practices

### 1. Token Management
- Always check token expiration before API calls
- Implement automatic token refresh
- Handle refresh failures gracefully

### 2. User Experience
- Provide clear authentication status
- Guide users through setup process
- Show helpful error messages

### 3. Security
- Never log or expose access tokens
- Use auth-pkce's secure token storage
- Implement proper error handling

### 4. CLI Design
- Provide `auth` command for setup instructions
- Include `status` command for troubleshooting
- Make authentication seamless for users

## Example Workflows

### First Time Setup
```bash
# User installs your CLI
npm install -g my-api-cli

# User runs a command
my-api-cli list

# CLI detects no auth and guides user
# User follows instructions to setup auth-pkce
auth-pkce configure
auth-pkce login

# User can now use CLI
my-api-cli list
```

### Daily Usage
```bash
# Commands work seamlessly
my-api-cli whoami
my-api-cli create "New Resource"
my-api-cli list

# Token refresh happens automatically
# User doesn't need to think about auth
```

## Customization

### Adding New API Methods
```typescript
// In api-client.ts
async getCustomData(): Promise<any> {
  return this.get('/custom-endpoint');
}

// In commands.ts
async customCommand(): Promise<void> {
  const data = await this.apiClient.getCustomData();
  console.log(data);
}
```

### Custom Authentication Flow
```typescript
// Override auth behavior in auth-manager.ts
async customAuthFlow(): Promise<string | null> {
  // Your custom logic here
  return token;
}
```

## Troubleshooting

### Common Issues

1. **"Not authenticated" errors**
   ```bash
   auth-pkce status
   auth-pkce login
   ```

2. **Token refresh failures**
   ```bash
   auth-pkce logout
   auth-pkce login
   ```

3. **CLI not found**
   ```bash
   npm link  # For development
   npm install -g my-api-cli  # For production
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* my-api-cli list

# Check auth-pkce logs
ls ~/.auth-pkce/logs/
```

## Production Deployment

### NPM Package
```json
{
  "name": "your-cli-name",
  "bin": {
    "your-cli": "dist/cli.js"
  },
  "dependencies": {
    "auth-pkce": "^0.0.1"
  }
}
```

### Installation Instructions for Users
```bash
# Install your CLI
npm install -g your-cli-name

# Setup authentication
your-cli auth

# Start using
your-cli --help
```

This integration pattern provides a robust foundation for building CLIs that leverage auth-pkce for OAuth 2.0 authentication.
