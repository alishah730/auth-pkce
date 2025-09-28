import crypto from 'crypto';
import { PKCEChallenge } from '../types';

/**
 * Generates a cryptographically secure random string for PKCE code verifier
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generates PKCE code challenge from code verifier using SHA256
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
}

/**
 * Generates a complete PKCE challenge object
 */
export function generatePKCEChallenge(): PKCEChallenge {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}

/**
 * Generates a cryptographically secure random state parameter
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}
