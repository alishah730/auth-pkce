# Changelog

All notable changes are documented here. The project is pre-1.0; public APIs may still evolve between minor releases.

## Unreleased

### Added

- Explicit npm exports and a TypeScript declaration entry point.
- Configurable credential storage through `configDir` and `AUTH_PKCE_CONFIG_DIR`.
- Built-artifact tests for PKCE, storage, package exports, discovery, and the loopback OAuth flow.
- Verified local `ali-cli` and API CLI integration examples.

### Changed

- Embedded commands use a collision-safe `auth` group and return errors to the host process.
- Discovery, issuer matching, callback routing, and revocation use their standard endpoints.
- Programmatic token access refreshes automatically and coalesces concurrent refreshes.
- Runtime dependencies are reduced to Commander, Chalk, Inquirer, and `open`; Node 22.13+ provides HTTP, fetch, filesystem, crypto, and tests.
- Token output is copied without shell interpolation and printed only with `--show`.

### Fixed

- Root build, tests, lint, npm packing, and both example builds.
- Missing `AuthPKCELibrary` export that prevented local example compilation.
- Incorrect callback path handling and non-standard discovery URL.
- Incorrect use of an OIDC logout endpoint for token revocation.
- Documentation claims that tokens were encrypted or that unsupported behavior was implemented.

## 0.0.x

- Initial OAuth 2.0 Authorization Code + PKCE CLI prototype, interactive configuration, token refresh, UserInfo, and library APIs.
