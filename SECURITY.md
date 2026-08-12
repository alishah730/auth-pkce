# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through [GitHub Security Advisories](https://github.com/alishah730/auth-pkce/security/advisories/new). Do not open a public issue with tokens, client configuration, exploit details, or provider logs.

Include the affected version, Node.js version, operating system, reproduction steps, and expected impact. Never include live credentials.

## Security properties

The library:

- generates a 32-byte random PKCE verifier and uses `S256`;
- generates and validates a random OAuth state value;
- accepts callback traffic only on a configured loopback host, port, and path;
- validates exact OpenID Connect issuer equality;
- requires HTTPS for provider URLs, except HTTP loopback development issuers;
- applies request and callback timeouts;
- refreshes shortly before expiry and coalesces concurrent refreshes;
- uses the advertised `revocation_endpoint` when available;
- passes clipboard content through stdin rather than shell interpolation;
- writes config/tokens atomically with `0700`/`0600` POSIX permissions.

The implementation follows [RFC 7636](https://www.rfc-editor.org/rfc/rfc7636), [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252), and [OpenID Connect Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) for the supported flow.

## Important limits

- `tokens.json` is plaintext. File permissions are access control, not encryption.
- POSIX modes do not provide equivalent guarantees on every Windows/filesystem configuration.
- An attacker running as the same OS user, malware, an administrator, or a backup reader may recover tokens.
- The package does not use macOS Keychain, Windows Credential Manager, or Linux Secret Service.
- ID tokens may be retained from the token response, but the library does not expose decoded ID-token claims as trusted identity. `getUserInfo()` calls the provider’s UserInfo endpoint.
- Remote revocation is best effort. Local tokens are removed even when the provider has no revocation endpoint or the request fails.
- This package is not a confidential-client secret store and should not be given a client secret in a distributed CLI.

Choose an OS credential-vault-backed solution if filesystem token storage is not appropriate for your threat model.

## Storage

The default directory is `~/.auth-pkce`. Override it with a constructor `configDir` or `AUTH_PKCE_CONFIG_DIR`.

```text
config.json  OAuth issuer/client/redirect configuration
tokens.json  access, refresh, and optional ID tokens
```

Do not commit, copy into bug reports, or print these files. The `token --show` option intentionally discloses an access token to stdout and should be used only when required.

## Operational guidance

- Request the smallest scopes your CLI needs.
- Prefer short-lived access tokens and refresh-token rotation at the provider.
- Use a separate public client registration per application/environment.
- Isolate stores with `configDir` when CLIs should not share credentials.
- Keep Node.js and this package updated.
- Protect home-directory backups and use full-disk encryption.
- Set `AUTH_PKCE_LOG_LEVEL` only while diagnosing a problem; review stderr before sharing it.

## Suspected compromise

1. Revoke the session/tokens at the identity provider.
2. Run `auth-pkce logout` (or the embedded CLI’s `auth logout`).
3. Remove the affected token store.
4. Check the host for malware or unauthorized access.
5. Authenticate again only after the host is trusted.
