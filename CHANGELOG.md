# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added
- Initial release of auth-pkce CLI tool
- OAuth 2.0 PKCE (Proof Key for Code Exchange) authentication flow
- OpenID Connect discovery support
- Interactive configuration management
- Secure token storage in user home directory
- Browser-based authorization flow
- Token refresh capabilities
- User information retrieval
- Comprehensive logging system
- ASCII art logo and beautiful CLI interface
- Global npm package installation support
- TypeScript implementation with full type safety
- Comprehensive error handling and validation
- Security features including file permissions and state validation

### Commands
- `auth-pkce configure` - Interactive OAuth configuration
- `auth-pkce login` - Start OAuth authentication flow
- `auth-pkce logout` - Logout and revoke tokens
- `auth-pkce whoami` - Display current user information
- `auth-pkce refresh` - Refresh access token
- `auth-pkce status` - Show authentication status
- `auth-pkce version` - Display version and ASCII art
- `auth-pkce --help` - Show help information

### Security
- PKCE implementation with SHA256 code challenge
- Cryptographically secure random string generation
- State parameter for CSRF protection
- Restrictive file permissions (600) for sensitive data
- Token expiration validation
- Secure token revocation on logout

### Developer Experience
- TypeScript with strict type checking
- ESLint configuration for code quality
- Jest testing framework setup
- Comprehensive documentation
- Industry-standard project structure
- npm publishing configuration
