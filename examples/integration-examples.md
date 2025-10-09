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

## Bearer Token Usage for API Calls

The library provides methods to extract bearer tokens for making authenticated API calls:

### 7. Using Bearer Tokens in Commands

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command();
const auth = new AuthPKCELibrary({ cliName: 'my-api-cli' });

auth.addAuthCommands(program);

// Command that uses bearer token for API calls
program
  .command('upload')
  .argument('<file>', 'File to upload')
  .option('--api-url <url>', 'API endpoint', 'https://api.example.com/upload')
  .action(async (file, options) => {
    try {
      // Get bearer token (formatted for Authorization header)
      const bearerToken = await auth.getBearerToken();
      
      console.log('📤 Uploading file with authentication...');
      
      // Example with fetch API
      const response = await fetch(options.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': bearerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: file,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('✅ Upload successful!');
      } else {
        console.log(`❌ Upload failed: ${response.status}`);
      }
      
    } catch (error) {
      if (error.message?.includes('not authenticated')) {
        console.log('❌ Please login first: my-api-cli login');
      } else if (error.message?.includes('expired')) {
        console.log('❌ Token expired: my-api-cli auth refresh');
      } else {
        console.log('❌ Upload failed:', error.message);
      }
    }
  });

program.parse();
```

### 8. Advanced API Integration with Axios

```typescript
import axios from 'axios';
import { AuthPKCELibrary } from 'auth-pkce';

const auth = new AuthPKCELibrary({ cliName: 'data-cli' });

// Create axios instance with interceptor for automatic token injection
async function createAuthenticatedAxios() {
  const bearerToken = await auth.getBearerToken();
  
  const axiosInstance = axios.create({
    baseURL: 'https://api.example.com/v1',
    headers: {
      'Authorization': bearerToken,
      'Content-Type': 'application/json'
    }
  });
  
  // Add response interceptor to handle token expiration
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        console.log('Token expired, attempting refresh...');
        try {
          await auth.refresh();
          // Retry the original request with new token
          const newBearerToken = await auth.getBearerToken();
          error.config.headers['Authorization'] = newBearerToken;
          return axiosInstance.request(error.config);
        } catch (refreshError) {
          console.log('Refresh failed. Please login again: data-cli login');
          process.exit(1);
        }
      }
      return Promise.reject(error);
    }
  );
  
  return axiosInstance;
}

// Usage in commands
program
  .command('fetch-data')
  .option('--endpoint <path>', 'API endpoint path', '/data')
  .action(async (options) => {
    try {
      const api = await createAuthenticatedAxios();
      const response = await api.get(options.endpoint);
      
      console.log('✅ Data fetched successfully!');
      console.log(JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log('❌ Failed to fetch data:', error.message);
    }
  });
```

### 9. Token Validation Helper

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

const auth = new AuthPKCELibrary();

// Helper function to ensure valid token
async function withValidToken<T>(operation: (token: string) => Promise<T>): Promise<T> {
  try {
    const bearerToken = await auth.getBearerToken();
    return await operation(bearerToken);
  } catch (error) {
    if (error.message?.includes('expired')) {
      console.log('🔄 Token expired, refreshing...');
      await auth.refresh();
      const newToken = await auth.getBearerToken();
      return await operation(newToken);
    }
    throw error;
  }
}

// Usage
program
  .command('api-action')
  .action(async () => {
    try {
      const result = await withValidToken(async (bearerToken) => {
        const response = await fetch('https://api.example.com/action', {
          method: 'POST',
          headers: { 'Authorization': bearerToken }
        });
        return response.json();
      });
      
      console.log('✅ Action completed:', result);
    } catch (error) {
      console.log('❌ Action failed:', error.message);
    }
  });
```

### Available Token Methods

```typescript
// Get raw access token
const accessToken = await auth.getAccessToken();
// Returns: "eyJhbGciOiJSUzI1NiIs..."

// Get formatted bearer token (recommended)
const bearerToken = await auth.getBearerToken();
// Returns: "Bearer eyJhbGciOiJSUzI1NiIs..."

// Use bearer token in API calls
const response = await fetch('https://api.example.com/data', {
  headers: {
    'Authorization': bearerToken  // Ready to use
  }
});
```

### Error Handling for Token Operations

```typescript
try {
  const bearerToken = await auth.getBearerToken();
  // Use token for API calls
} catch (error) {
  if (error.message.includes('Not authenticated')) {
    console.log('Please run: my-cli login');
  } else if (error.message.includes('expired')) {
    console.log('Please run: my-cli auth refresh');
  } else {
    console.log('Authentication error:', error.message);
  }
}
```

This makes it easy for any Node.js CLI to inherit robust OAuth 2.0 PKCE authentication and use the tokens for secure API interactions!
