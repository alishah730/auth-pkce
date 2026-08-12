# auth-pkce

[![npm version](https://img.shields.io/npm/v/auth-pkce.svg)](https://www.npmjs.com/package/auth-pkce)
[![CI](https://github.com/alishah730/auth-pkce/actions/workflows/ci.yml/badge.svg)](https://github.com/alishah730/auth-pkce/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

OAuth 2.0 Authorization Code + PKCE for Node.js command-line applications. Use it as a standalone auth utility, add a namespaced `auth` command to an existing [Commander](https://github.com/tj/commander.js/) CLI, or consume tokens through a small programmatic API.

## Requirements

- Node.js 22.13 or newer
- A public OAuth client (do not put a client secret in a distributed CLI)
- An OpenID Connect issuer with `/.well-known/openid-configuration`
- PKCE with `S256`
- A registered loopback redirect such as `http://127.0.0.1:8080/callback`

The callback listener supports HTTP loopback addresses only: `127.0.0.1`, `::1`, and `localhost`. `127.0.0.1` is the recommended default.

## Standalone CLI

```bash
npm install --global auth-pkce
auth-pkce configure
auth-pkce login
auth-pkce status
auth-pkce whoami
```

Other commands are `refresh`, `logout`, and `token`. `auth-pkce token` copies the token without printing it; add `--show` only when stdout disclosure is intentional.

## Add auth to your CLI

```bash
npm install auth-pkce commander
```

```typescript
import { Command } from 'commander';
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command().name('my-cli');
const auth = new AuthPKCELibrary({
  cliName: 'my-cli',
  // Optional: isolate this CLI from the shared ~/.auth-pkce store.
  configDir: process.env.MY_CLI_AUTH_DIR,
});

auth.addAuthCommands(program);

program.command('deploy').action(async () => {
  const bearerToken = await auth.getBearerToken(); // refreshes when needed
  await fetch('https://api.example.com/deploy', {
    method: 'POST',
    headers: { Authorization: bearerToken },
  });
});

await program.parseAsync();
```

Your CLI now has:

```text
my-cli auth configure
my-cli auth login
my-cli auth logout
my-cli auth whoami
my-cli auth refresh
my-cli auth status
my-cli auth token
```

Auth commands throw errors back to the host CLI; they never call `process.exit()`. Use `commandGroup: false` only when you intentionally want the commands at the root.

## Programmatic API

```typescript
import { AuthPkceApi } from 'auth-pkce';

const auth = new AuthPkceApi({
  autoRefresh: true,
  configDir: process.env.MY_CLI_AUTH_DIR,
});

const accessToken = await auth.getAccessToken();
if (!accessToken) {
  throw new Error('Run: my-cli auth login');
}
```

Useful methods include `isAuthenticated()`, `getAccessToken()`, `getTokenInfo()`, `getUserInfo()`, `getAuthStatus()`, and `refreshToken()`.

See [LIBRARY_USAGE.md](LIBRARY_USAGE.md) for API options and non-interactive configuration.

## Test the local `ali-cli` example

From the repository root:

```bash
npm ci
npm run build
npm ci --prefix examples/ali-cli
npm run build --prefix examples/ali-cli

node examples/ali-cli/dist/cli.js --help
node examples/ali-cli/dist/cli.js hello --name Local
node examples/ali-cli/dist/cli.js auth --help
```

To exercise a real provider without touching the default store:

```bash
export ALI_AUTH_DIR="$(mktemp -d)"
node examples/ali-cli/dist/cli.js auth configure
node examples/ali-cli/dist/cli.js auth login
node examples/ali-cli/dist/cli.js protected
```

The example depends on `"auth-pkce": "file:../.."`, so it tests the local build instead of the published npm package. More detail is in [examples/ali-cli/README.md](examples/ali-cli/README.md).

## Storage and security boundary

By default, config and tokens are stored in `~/.auth-pkce/`. Set `configDir` or `AUTH_PKCE_CONFIG_DIR` to use another location.

```text
~/.auth-pkce/
├── config.json   # 0600 on POSIX
└── tokens.json   # 0600 on POSIX
```

Writes use a temporary file and rename, and the directory is `0700` on POSIX. Tokens are plaintext JSON, not encrypted or stored in an OS credential vault. Anyone who can act as the user or read the user’s files may be able to read them. See [SECURITY.md](SECURITY.md) before using the package in a high-risk environment.

The library validates discovery issuer equality, callback state, redirect host/path, PKCE S256, and token expiry. It obtains user claims from the provider’s UserInfo endpoint; it does not treat a decoded, unverified ID token as trusted user information.

## Provider compatibility

`baseUrl` is the exact OpenID Connect issuer. For `https://login.example.com/tenant`, discovery is requested from:

```text
https://login.example.com/tenant/.well-known/openid-configuration
```

The returned `issuer` must match exactly. Providers that use a non-standard discovery URL can still be configured programmatically with explicit authorization/token/UserInfo endpoints; the interactive setup currently follows standard OpenID Connect discovery.

## Development

```bash
npm ci
npm run verify
```

`verify` runs linting, type checking, built-artifact tests, both example builds, smoke tests, and `npm pack --dry-run`. The OAuth integration test binds temporary loopback ports.

- [Library guide](LIBRARY_USAGE.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Issues](https://github.com/alishah730/auth-pkce/issues)

MIT © Ali Shah
