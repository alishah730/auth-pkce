# API CLI integration example

This advanced example combines embedded auth commands, `AuthPkceApi`, and an Axios interceptor that injects and refreshes bearer tokens.

## Local build

From the repository root:

```bash
npm ci
npm run build
npm ci --prefix examples/cli-integration
npm run build --prefix examples/cli-integration
node examples/cli-integration/dist/cli.js --help
```

The example uses `"auth-pkce": "file:../.."`; it does not use the published npm version.

## Authentication

```bash
node examples/cli-integration/dist/cli.js auth configure
node examples/cli-integration/dist/cli.js auth login
node examples/cli-integration/dist/cli.js auth status
```

API commands include `status`, `show`, `list`, `create`, `system-status`, `update`, and `delete`. Set `API_BASE_URL` to a real API before running them; the default `https://api.example.com` is only a placeholder.

## Design

- `src/cli.ts` embeds the namespaced auth commands.
- `src/auth-manager.ts` wraps the programmatic API and can launch login directly.
- `src/api-client.ts` injects the access token and retries a single 401 after refresh.
- `src/commands.ts` contains example API commands.

For a new CLI, start with the smaller [../ali-cli](../ali-cli) example and add an HTTP client only when needed.
