# 🔒 Security Guide

This document provides comprehensive information about security considerations, token storage mechanisms, and best practices for auth-pkce.

## 📋 Table of Contents

- [Token Storage Architecture](#token-storage-architecture)
- [File System Security](#file-system-security)
- [Token Lifecycle Management](#token-lifecycle-management)
- [Security Best Practices](#security-best-practices)
- [Threat Model](#threat-model)
- [Security Auditing](#security-auditing)
- [Compliance](#compliance)

## 🏗️ Token Storage Architecture

### Storage Location

auth-pkce stores all sensitive data in a dedicated directory within the user's home directory:

```
~/.auth-pkce/
├── config.json      # OAuth configuration (non-sensitive)
├── tokens.json      # Access/refresh tokens (highly sensitive)
└── logs/            # Application logs
    ├── combined.log # All log levels
    └── error.log    # Error logs only
```

### Token Storage Format

Tokens are stored in JSON format with the following structure:

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "def50200a1b2c3d4e5f6...",
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1703123456789,
  "tokenType": "Bearer",
  "scope": "openid profile email"
}
```

**Field Descriptions:**
- `accessToken`: JWT access token for API authentication
- `refreshToken`: Long-lived token for obtaining new access tokens
- `idToken`: OpenID Connect identity token (optional)
- `expiresAt`: Unix timestamp when the access token expires
- `tokenType`: Token type (typically "Bearer")
- `scope`: Granted OAuth scopes

## 🛡️ File System Security

### File Permissions

auth-pkce implements strict file permissions to protect sensitive data:

| File/Directory | Permissions | Octal | Description |
|---------------|-------------|-------|-------------|
| `~/.auth-pkce/` | `drwx------` | 700 | Owner read/write/execute only |
| `config.json` | `-rw-------` | 600 | Owner read/write only |
| `tokens.json` | `-rw-------` | 600 | Owner read/write only |
| `logs/` | `drwx------` | 700 | Owner read/write/execute only |

### Permission Enforcement

The application automatically sets restrictive permissions during file operations:

```typescript
// Directory creation with secure permissions
await fs.ensureDir(CONFIG_DIR);
await fs.chmod(CONFIG_DIR, 0o700);

// File creation with secure permissions
await fs.writeJson(TOKENS_FILE, tokens, { spaces: 2 });
await fs.chmod(TOKENS_FILE, 0o600);
```

### Cross-Platform Considerations

**Unix-like Systems (Linux, macOS):**
- Full POSIX permission support
- Effective user/group/other permission isolation
- File system ACLs respected where available

**Windows:**
- NTFS permissions mapped to closest equivalent
- User-only access enforced through Windows security descriptors
- Inheritance disabled for sensitive files

## 🔄 Token Lifecycle Management

### Token Acquisition

1. **PKCE Challenge Generation**
   ```typescript
   // Cryptographically secure random code verifier (43-128 chars)
   const codeVerifier = crypto.randomBytes(32).toString('base64url');
   
   // SHA256 hash of code verifier
   const codeChallenge = crypto
     .createHash('sha256')
     .update(codeVerifier)
     .digest('base64url');
   ```

2. **Authorization Flow**
   - User redirected to OAuth provider
   - Authorization code received via callback
   - Code exchanged for tokens using PKCE verifier

3. **Secure Storage**
   - Tokens immediately stored with restrictive permissions
   - Temporary variables cleared from memory
   - Callback server closed after successful exchange

### Token Validation

Before each use, tokens undergo validation:

```typescript
// Expiration check
const isExpired = Date.now() >= storedTokens.expiresAt;

// Automatic refresh if expired and refresh token available
if (isExpired && storedTokens.refreshToken) {
  const newTokens = await oauthClient.refreshToken(storedTokens.refreshToken);
  await configManager.saveTokens(newTokens);
}
```

### Token Refresh

1. **Automatic Refresh**
   - Triggered when access token is expired
   - Uses stored refresh token
   - Updates stored tokens atomically

2. **Manual Refresh**
   - Available via `auth-pkce refresh` command
   - Validates refresh token before use
   - Provides clear error messages for expired refresh tokens

### Token Revocation

1. **Logout Process**
   ```typescript
   // Attempt to revoke tokens at provider
   await oauthClient.revokeToken(accessToken, 'access_token');
   await oauthClient.revokeToken(refreshToken, 'refresh_token');
   
   // Clear local storage regardless of revocation success
   await configManager.clearTokens();
   ```

2. **Cleanup Strategy**
   - Remote revocation attempted first
   - Local cleanup always performed
   - Graceful handling of network failures

## 🔐 Security Best Practices

### PKCE Implementation

auth-pkce implements OAuth 2.0 PKCE (RFC 7636) with the following security measures:

**Code Verifier Generation:**
- Uses Node.js `crypto.randomBytes()` for cryptographic randomness
- 256-bit entropy (32 bytes)
- Base64url encoding for URL safety

**Code Challenge:**
- SHA256 hash of code verifier
- S256 method (most secure option)
- Base64url encoded for transmission

**State Parameter:**
- Cryptographically random 128-bit value
- CSRF protection during authorization flow
- Validated on callback to prevent attacks

### Memory Security

**Sensitive Data Handling:**
- Tokens stored in variables for minimal time
- No logging of sensitive values
- Automatic garbage collection of temporary objects

**Process Isolation:**
- Each CLI invocation runs in isolated process
- No shared memory between invocations
- Clean process exit after operations

### Network Security

**HTTPS Enforcement:**
- All OAuth endpoints must use HTTPS
- Certificate validation enabled
- No fallback to HTTP for sensitive operations

**Request Security:**
- User-Agent header identifies the client
- Timeout protection against hanging requests
- Proper error handling for network failures

## 🎯 Threat Model

### Threats Mitigated

| Threat | Mitigation | Implementation |
|--------|------------|----------------|
| **Token Theft via File Access** | Restrictive file permissions | 600 permissions, user-only access |
| **CSRF Attacks** | State parameter validation | Cryptographic state generation/validation |
| **Code Interception** | PKCE implementation | SHA256 code challenge/verifier |
| **Token Replay** | Expiration validation | Automatic expiry checking |
| **Privilege Escalation** | Minimal permissions | Least-privilege file access |
| **Network Interception** | HTTPS enforcement | TLS validation required |
| **Process Memory Dumps** | Minimal memory exposure | Short-lived sensitive variables |

### Residual Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|-------------------|
| **Root/Admin Access** | Low | High | User education, system hardening |
| **Malware on System** | Medium | High | Antivirus, system monitoring |
| **Physical Access** | Low | Medium | Disk encryption, screen locks |
| **Backup Exposure** | Medium | Medium | Secure backup practices |

## 🔍 Security Auditing

### Log Analysis

auth-pkce provides comprehensive logging for security monitoring:

**Security Events Logged:**
- Authentication attempts (success/failure)
- Token refresh operations
- Configuration changes
- Network errors and timeouts
- File permission changes

**Log Locations:**
```
~/.auth-pkce/logs/
├── combined.log    # All events with timestamps
└── error.log       # Error events only
```

**Log Format:**
```json
{
  "level": "info",
  "message": "Authentication successful",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "auth-pkce"
}
```

### Monitoring Recommendations

**File System Monitoring:**
```bash
# Monitor token file access (Linux/macOS)
sudo auditctl -w ~/.auth-pkce/tokens.json -p rwa -k auth-pkce-tokens

# Check file permissions regularly
ls -la ~/.auth-pkce/
```

**Process Monitoring:**
```bash
# Monitor auth-pkce process execution
ps aux | grep auth-pkce

# Check for unusual network connections
netstat -an | grep :8080
```

## 📊 Compliance

### Standards Compliance

**OAuth 2.0 Security Best Current Practice:**
- Implements RFC 8252 recommendations
- Uses PKCE for all authorization flows
- Enforces HTTPS for all endpoints
- Validates state parameters

**PKCE Specification (RFC 7636):**
- SHA256 code challenge method
- Cryptographically random code verifiers
- Proper code challenge derivation
- Secure code verifier transmission

### Security Certifications

While auth-pkce is not formally certified, it follows security practices aligned with:

- **OWASP OAuth 2.0 Security Guidelines**
- **NIST Cybersecurity Framework**
- **ISO 27001 Information Security Controls**

## 🚨 Security Incident Response

### Suspected Token Compromise

1. **Immediate Actions:**
   ```bash
   # Revoke all tokens immediately
   auth-pkce logout
   
   # Remove all stored data
   rm -rf ~/.auth-pkce/
   
   # Re-authenticate with new tokens
   auth-pkce configure
   auth-pkce login
   ```

2. **Investigation Steps:**
   - Check system logs for unauthorized access
   - Review auth-pkce logs for suspicious activity
   - Verify file permissions and ownership
   - Scan system for malware

3. **Recovery Process:**
   - Change OAuth client credentials if possible
   - Re-configure auth-pkce with new settings
   - Monitor for continued suspicious activity

### Reporting Security Issues

**Report Security Issues:**
- Email: security@auth-pkce.dev
- Use GitHub Security Advisories for responsible disclosure
- Include detailed reproduction steps
- Allow 90 days for fix before public disclosure

**For security questions:**
- Use GitHub Discussions with "security" tag at https://github.com/alishah730/auth-pkce/discussions
- Check existing documentation first
- Provide context about your use case

## 🔧 Security Configuration

### Hardening Options

**Environment Variables:**
```bash
# Increase log verbosity for security monitoring
export LOG_LEVEL=debug

# Custom config directory (more secure location)
export AUTH_PKCE_CONFIG_DIR=/secure/path/.auth-pkce

# Network timeout settings
export AUTH_PKCE_TIMEOUT=30000
```

**System-Level Hardening:**
- Enable disk encryption (FileVault, BitLocker, LUKS)
- Use secure DNS (DoH/DoT)
- Keep system and dependencies updated
- Enable firewall and intrusion detection

### Security Checklist

- [ ] Verify file permissions are 600/700
- [ ] Confirm HTTPS-only OAuth endpoints
- [ ] Check token expiration handling
- [ ] Review log files for anomalies
- [ ] Validate PKCE implementation
- [ ] Test token revocation process
- [ ] Verify state parameter validation
- [ ] Confirm secure random generation
- [ ] Check network timeout handling
- [ ] Validate error message security

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Reviewed By:** Security Team

For questions about this security guide, please contact security@auth-pkce.dev or open a GitHub Discussion.
