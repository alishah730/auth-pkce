# auth-pkce

A secure Node.js CLI tool for OAuth 2.0 PKCE (Proof Key for Code Exchange) authentication flow.

## Features

- 🔐 **Secure PKCE Implementation**: Full OAuth 2.0 Authorization Code Flow with PKCE
- 🌐 **OpenID Connect Discovery**: Automatic endpoint discovery from `.well-known/openid-configuration`
- 🔧 **Interactive Configuration**: AWS CLI-style configuration management
- 🗂️ **Secure Token Storage**: Encrypted token storage in user home directory
- 🌍 **Browser Integration**: Automatic browser opening for authorization
- 📝 **Comprehensive Logging**: Winston-based logging with multiple levels
- 🎨 **Beautiful CLI**: Colorful output with ASCII art and intuitive commands
- 🔄 **Token Refresh**: Automatic token refresh capabilities
- 👤 **User Info**: Retrieve and display current user information
- 🚪 **Secure Logout**: Token revocation and cleanup

## Installation

### Global Installation (Recommended)

```bash
npm install -g auth-pkce
```

### Local Installation

```bash
npm install auth-pkce
```

## Quick Start

### 1. Configure OAuth Settings

```bash
auth-pkce configure
```

This will prompt you for:
- OAuth provider base URL
- Client ID
- Redirect URI (default: `http://localhost:8080/callback`)
- OAuth scopes (default: `openid profile email`)
- Log level

### 2. Authenticate

```bash
auth-pkce login
```

This will:
- Open your default browser
- Navigate to the OAuth authorization page
- Handle the callback automatically
- Store tokens securely

### 3. Check Authentication Status

```bash
auth-pkce whoami
```

## Commands

### Configuration

```bash
# Interactive configuration
auth-pkce configure

# Configure with base URL
auth-pkce configure --base-url https://your-oauth-provider.com
```

### Authentication

```bash
# Login (start OAuth flow)
auth-pkce login

# Logout (revoke tokens and clear local storage)
auth-pkce logout

# Refresh access token
auth-pkce refresh

# Show current user information
auth-pkce whoami

# Show authentication status
auth-pkce status

# Display access token and copy to clipboard
auth-pkce token
```

### Utility

```bash
# Show version and ASCII art
auth-pkce version

# Show help
auth-pkce --help
```

## Configuration

Configuration is stored in `~/.auth-pkce/config.json` with the following structure:

```json
{
  "baseUrl": "https://your-oauth-provider.com",
  "clientId": "your-client-id",
  "redirectUri": "http://localhost:8080/callback",
  "scope": "openid profile email",
  "logLevel": "info",
  "configVersion": "1.0.0"
}
```

### Security & Token Storage

auth-pkce implements enterprise-grade security for token storage and management:

**🗂️ Storage Location:**
```
~/.auth-pkce/
├── config.json      # OAuth configuration (600 permissions)
├── tokens.json      # Access/refresh tokens (600 permissions)
└── logs/            # Application logs (700 permissions)
```

**🔐 File Permissions:**
- **Directory**: `700` (owner read/write/execute only)
- **Token Files**: `600` (owner read/write only)
- **Cross-platform**: Windows NTFS permissions mapped appropriately

**🛡️ Security Features:**
- **PKCE Implementation**: SHA256 code challenge method with 256-bit entropy
- **Secure Storage**: Restrictive file system permissions and atomic operations
- **State Validation**: CSRF protection with cryptographically secure state parameter
- **Token Lifecycle**: Automatic expiration validation and secure refresh
- **Memory Security**: Minimal exposure with automatic cleanup
- **Network Security**: HTTPS enforcement and certificate validation

**📊 Token Storage Format:**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "def50200a1b2c3d4e5f6...",
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresAt": 1703123456789,
  "tokenType": "Bearer",
  "scope": "openid profile email"
}
```

**🔍 Threat Mitigation:**
| Threat | Mitigation | Implementation |
|--------|------------|----------------|
| Token Theft | File permissions (600) | User-only access |
| CSRF Attacks | State validation | Cryptographic state parameter |
| Code Interception | PKCE S256 | SHA256 challenge/verifier |
| Network Attacks | HTTPS enforcement | TLS validation required |
| Memory Dumps | Minimal exposure | Short-lived variables |

## OAuth 2.0 PKCE Flow

This tool implements the OAuth 2.0 Authorization Code Flow with PKCE as specified in [RFC 7636](https://tools.ietf.org/html/rfc7636):

1. **Code Verifier Generation**: Cryptographically random 43-128 character string
2. **Code Challenge**: SHA256 hash of the code verifier, base64url encoded
3. **Authorization Request**: Redirect to authorization server with code challenge
4. **Authorization Code**: Receive authorization code via callback
5. **Token Exchange**: Exchange authorization code + code verifier for tokens

## Requirements

- Node.js >= 16.0.0
- OAuth 2.0 provider with PKCE support
- OpenID Connect discovery endpoint (`.well-known/openid-configuration`)

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/alishah730/auth-pkce.git
cd auth-pkce

# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── index.ts            # Library exports
├── types/              # TypeScript type definitions
├── config/             # Configuration management
├── services/           # OAuth and OIDC services
├── commands/           # CLI command implementations
└── utils/              # Utility functions
```

## Troubleshooting

### Common Issues

**Configuration not found**
```bash
auth-pkce configure
```

**Token expired**
```bash
auth-pkce refresh
# or
auth-pkce login
```

**Browser doesn't open automatically**
- The authorization URL will be displayed in the terminal
- Copy and paste it into your browser manually

**Network errors**
- Check your internet connection
- Verify the OAuth provider base URL
- Ensure the provider supports PKCE

### Logging

Logs are stored in `~/.auth-pkce/logs/`:
- `combined.log`: All log levels
- `error.log`: Error logs only

Set log level during configuration or via environment variable:
```bash
LOG_LEVEL=debug auth-pkce login
```

## Security Best Practices

### For Users
- **Never share** `~/.auth-pkce/` directory contents
- **Use HTTPS-only** OAuth endpoints
- **Enable disk encryption** (FileVault, BitLocker, LUKS)
- **Keep auth-pkce updated** to the latest version
- **Monitor logs** for suspicious activity in `~/.auth-pkce/logs/`

### For Administrators
- **Implement file system monitoring** for token access
- **Use secure backup practices** for home directories
- **Enable system audit logging** for security events
- **Regular security updates** and patches

### Security Incident Response

**Suspected Token Compromise:**
```bash
# Immediate revocation and cleanup
auth-pkce logout
rm -rf ~/.auth-pkce/

# Re-authenticate with fresh tokens
auth-pkce configure
auth-pkce login
```

**Report Security Issues:**
- 📧 security@auth-pkce.dev
- 🔒 GitHub Security Advisories
- 📋 See [SECURITY.md](SECURITY.md) for comprehensive security guide

### Compliance & Standards
- ✅ **OAuth 2.0 Security Best Current Practice** (RFC 8252)
- ✅ **PKCE Specification** (RFC 7636)
- ✅ **OpenID Connect Security Guidelines**
- ✅ **OWASP OAuth 2.0 Security Guidelines**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/alishah730/auth-pkce/wiki)
- 🐛 [Issue Tracker](https://github.com/alishah730/auth-pkce/issues)
- 💬 [Discussions](https://github.com/alishah730/auth-pkce/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

[⭐ Star us on GitHub](https://github.com/alishah730/auth-pkce) • [🐛 Report Issues](https://github.com/alishah730/auth-pkce/issues) • [💬 Join Discussions](https://github.com/alishah730/auth-pkce/discussions)

[![npm version](https://badge.fury.io/js/auth-pkce.svg)](https://badge.fury.io/js/auth-pkce)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/alishah730/auth-pkce/workflows/Node.js%20CI/badge.svg)](https://github.com/alishah730/auth-pkce/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OAuth 2.0](https://img.shields.io/badge/OAuth%202.0-PKCE-blue)](https://tools.ietf.org/html/rfc7636)
![GitHub stars](https://img.shields.io/github/stars/alishah730/auth-pkce?style=social)
![GitHub forks](https://img.shields.io/github/forks/alishah730/auth-pkce?style=social)
![GitHub issues](https://img.shields.io/github/issues/alishah730/auth-pkce)
![GitHub pull requests](https://img.shields.io/github/issues-pr/alishah730/auth-pkce)
