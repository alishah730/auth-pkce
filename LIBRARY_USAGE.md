# Library usage

## Commander integration

`AuthPKCELibrary` is the simplest integration for a CLI that already uses Commander:

```typescript
import { Command } from 'commander';
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command().name('acme');
const auth = new AuthPKCELibrary({ cliName: 'acme' });

auth.addAuthCommands(program);

program.command('projects').action(async () => {
  const token = await auth.getAccessToken();
  // Use token in the API request. Do not print it.
});

await program.parseAsync();
```

Use `getAccessToken()` or `isAuthenticated()` to gate protected work. `status()` prints status for a human; it is not an authorization guard.

### Options

```typescript
interface AuthPKCELibraryOptions {
  cliName?: string;
  version?: string;
  commandGroup?: string | false; // default: "auth"
  configDir?: string;            // default: AUTH_PKCE_CONFIG_DIR or ~/.auth-pkce
  autoRefresh?: boolean;         // default: true
}
```

Use a per-CLI `configDir` when different tools have different OAuth clients or issuers. Omit it when several trusted tools intentionally share one login.

### Direct methods

```typescript
await auth.configure();
await auth.login();
await auth.logout();
await auth.whoami();
await auth.refresh();
await auth.status();

const authenticated = await auth.isAuthenticated();
const user = await auth.getUserInfo();
const token = await auth.getAccessToken();
const authorization = await auth.getBearerToken();
```

Command methods write user-facing output and reject on failure. Token methods do not print secrets.

## Programmatic API

Use `AuthPkceApi` in API clients or service layers:

```typescript
import { AuthPkceApi } from 'auth-pkce';

const auth = new AuthPkceApi({
  autoRefresh: true,
  clockSkewSeconds: 30,
  configDir: process.env.ACME_AUTH_DIR,
});

const token = await auth.getAccessToken();
if (!token) {
  throw new Error('Authentication required');
}

const response = await fetch('https://api.example.com/projects', {
  headers: { Authorization: `Bearer ${token}` },
});
```

`getAccessToken()` returns `null` when no usable token is available. If auto-refresh is enabled and a refresh token exists, concurrent refresh requests share one in-flight operation.

## Non-interactive configuration

Interactive configuration is convenient for end users. Tests, installers, and managed CLIs can save configuration directly:

```typescript
import { ConfigManager } from 'auth-pkce';

const store = new ConfigManager({ configDir: '/path/owned/by/the/current/user' });

await store.saveConfig({
  baseUrl: 'https://issuer.example.com',
  clientId: 'public-cli-client',
  redirectUri: 'http://127.0.0.1:8080/callback',
  scope: 'openid profile email offline_access',
  configVersion: '1.0.0',
});
```

Do not ship a client secret in a public CLI. Register the full redirect path with the provider. The provider may allow the loopback port to vary, but this implementation currently uses the explicit configured port.

## OAuth client options

Most consumers should use the higher-level classes. `OAuthClient` is exported for custom orchestration and tests:

```typescript
const client = new OAuthClient(config, {
  callbackTimeoutMs: 300_000,
  requestTimeoutMs: 30_000,
  openBrowser: async (url) => customBrowserLauncher(url),
});
```

## Errors and process ownership

The library does not install process-wide error handlers and embedded commands do not terminate the process. Catch errors at your CLI entry point:

```typescript
try {
  await program.parseAsync();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
```

Set `AUTH_PKCE_LOG_LEVEL=debug` (or `info`, `warn`, `error`) for optional diagnostic output on stderr. Tokens are not intentionally logged.

## Common mistakes

- Use the issuer URL, not the token URL, as `baseUrl`.
- Register the exact callback path, for example `/callback`.
- Use `my-cli auth login` for embedded commands; `auth-pkce login` is the standalone binary.
- Do not parse an ID token without signature/issuer/audience validation. This library uses UserInfo for user claims.
- Do not log tokens or include them in shell commands.
