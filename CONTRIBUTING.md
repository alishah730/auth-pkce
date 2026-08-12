# Contributing

Thanks for helping improve `auth-pkce`.

## Prerequisites

- Node.js 22.13 or newer
- npm 10 or newer

## Setup

```bash
git clone https://github.com/alishah730/auth-pkce.git
cd auth-pkce
npm ci
npm ci --prefix examples/ali-cli
npm ci --prefix examples/cli-integration
npm run verify
```

Useful focused commands:

```bash
npm run lint
npm run type-check
npm test
npm run build:examples
npm run smoke
npm run package:check
```

Tests use Node’s built-in test runner and exercise the compiled `dist` package. OAuth flow tests bind temporary loopback ports. Add or update a test when behavior changes.

## Pull requests

1. Create a focused branch.
2. Keep public APIs small and typed.
3. Do not add a runtime dependency when a supported Node API is sufficient.
4. Update README/library/security docs when user-visible behavior changes.
5. Run `npm run verify` and include the result in the PR description.
6. Do not commit tokens, `.env` files, packed tarballs, `dist`, or `node_modules`.

For OAuth/security changes, describe the threat model and relevant RFC behavior. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

By contributing, you agree that your contribution is licensed under the repository’s MIT license.
