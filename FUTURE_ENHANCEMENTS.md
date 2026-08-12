# Possible future enhancements

The current goal is a small, dependable PKCE building block for Node.js CLIs. Potential additions should stay optional and avoid making the basic integration harder.

## Security

- OS credential-vault adapters for macOS Keychain, Windows Credential Manager, and Linux Secret Service.
- Full ID-token verification with issuer, audience, expiry, nonce, algorithm, and JWKS validation.
- Refresh-token rotation/reuse signals where providers expose them.

## Provider and flow support

- Multiple named profiles without requiring separate directories.
- OAuth 2.0 Device Authorization Grant for headless environments.
- Configurable discovery strategies for providers that do not expose standard OpenID Connect metadata.
- Dynamic loopback ports for providers that allow the RFC 8252 port exception.

## Developer experience

- Shell completion.
- Provider compatibility fixtures and a local mock authorization server.
- An injectable persistence interface for custom enterprise credential stores.

Feature requests are welcome in [GitHub Issues](https://github.com/alishah730/auth-pkce/issues). Security and interoperability work takes priority over cosmetic additions.
