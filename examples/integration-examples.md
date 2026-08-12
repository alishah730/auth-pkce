# Integration patterns

## Minimal embedded commands

```typescript
import { Command } from 'commander';
import { addAuthToCLI } from 'auth-pkce';

const program = new Command().name('my-cli');
addAuthToCLI(program, { cliName: 'my-cli' });
await program.parseAsync();
```

This adds `my-cli auth configure`, `login`, `logout`, `whoami`, `refresh`, `status`, and `token`.

## Protected command

```typescript
import { AuthPKCELibrary } from 'auth-pkce';

const auth = new AuthPKCELibrary({ cliName: 'my-cli' });
auth.addAuthCommands(program);

program.command('deploy').action(async () => {
  const authorization = await auth.getBearerToken();
  const response = await fetch('https://api.example.com/deploy', {
    method: 'POST',
    headers: { Authorization: authorization },
  });
  if (!response.ok) throw new Error(`Deploy failed: ${response.status}`);
});
```

`getBearerToken()` auto-refreshes and throws when login is required. Never print the returned value.

## HTTP wrapper

```typescript
import { AuthPkceApi } from 'auth-pkce';

const auth = new AuthPkceApi({ autoRefresh: true });

async function authenticatedFetch(url: string, init: RequestInit = {}) {
  const token = await auth.getAccessToken();
  if (!token) throw new Error('Run: my-cli auth login');

  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
```

For a single-retry Axios interceptor, see [cli-integration/src/api-client.ts](cli-integration/src/api-client.ts).

## Shared versus isolated login

The default store is `~/.auth-pkce`, which intentionally allows trusted CLIs to share configuration and tokens. To isolate an application:

```typescript
const auth = new AuthPKCELibrary({
  cliName: 'my-cli',
  configDir: process.env.MY_CLI_AUTH_DIR,
});
```

Use separate stores for different OAuth clients, issuers, environments, or trust boundaries.
