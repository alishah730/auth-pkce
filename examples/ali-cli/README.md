# ali-cli local integration example

This is the canonical minimal example for embedding `auth-pkce` in an existing Commander CLI. Its dependency is `"auth-pkce": "file:../.."`, so it consumes the repository’s local package.

## Build and smoke test

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

These commands require no OAuth provider and are the fastest way to confirm local package exports, types, command registration, and runtime loading.

## Real login test

Register a public OAuth client with a redirect such as `http://127.0.0.1:8080/callback`, then isolate test credentials:

```bash
export ALI_AUTH_DIR="$(mktemp -d)"

node examples/ali-cli/dist/cli.js auth configure
node examples/ali-cli/dist/cli.js auth login
node examples/ali-cli/dist/cli.js auth status
node examples/ali-cli/dist/cli.js profile
node examples/ali-cli/dist/cli.js protected
```

The available auth commands are under `ali auth` so they do not collide with the host application:

```text
ali auth configure
ali auth login
ali auth logout
ali auth whoami
ali auth refresh
ali auth status
ali auth token
```

`hello` is public. `profile`, `protected`, and `publish` use the library API. `publish --dry-run` redacts the authorization header, and the non-dry-run operation is a mock—it does not send data to the example URL.

The integration itself is in [src/cli.ts](src/cli.ts).
