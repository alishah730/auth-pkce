import { OpenIDConfiguration } from '../types';
import { isLoopbackHostname, validateIssuerUrl } from '../utils/errors';
import logger from '../utils/logger';

function normalizeIssuer(value: string): string {
  return validateIssuerUrl(value).href.replace(/\/$/, '');
}

function validateEndpoint(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value) {
    throw new Error(`OpenID Connect discovery is missing ${fieldName}`);
  }

  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopbackHostname(url.hostname))) {
    throw new Error(`${fieldName} must use HTTPS (HTTP is allowed only for loopback development servers)`);
  }
  return value;
}

export class OIDCDiscoveryService {
  public static getDiscoveryUrl(issuer: string): string {
    return `${normalizeIssuer(issuer)}/.well-known/openid-configuration`;
  }

  public static async discover(issuer: string): Promise<OpenIDConfiguration> {
    const normalizedIssuer = normalizeIssuer(issuer);
    const discoveryUrl = this.getDiscoveryUrl(normalizedIssuer);
    logger.info('Discovering OpenID Connect configuration', { discoveryUrl });

    let response: Response;
    try {
      response = await fetch(discoveryUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'auth-pkce',
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new Error(`Failed to discover OpenID Connect configuration at ${discoveryUrl}`, {
        cause: error,
      });
    }

    if (!response.ok) {
      throw new Error(
        `Failed to discover OpenID Connect configuration at ${discoveryUrl}: HTTP ${response.status}`
      );
    }

    let data: unknown;
    try {
      data = await response.json() as unknown;
    } catch (error) {
      throw new Error('OpenID Connect discovery returned invalid JSON', { cause: error });
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('OpenID Connect discovery returned an invalid document');
    }

    const candidate = data as Record<string, unknown>;
    if (candidate.issuer !== normalizedIssuer) {
      throw new Error(
        `OpenID Connect issuer mismatch: expected ${normalizedIssuer}, received ${String(candidate.issuer)}`
      );
    }

    validateEndpoint(candidate.authorization_endpoint, 'authorization_endpoint');
    validateEndpoint(candidate.token_endpoint, 'token_endpoint');
    if (candidate.userinfo_endpoint !== undefined) {
      validateEndpoint(candidate.userinfo_endpoint, 'userinfo_endpoint');
    }
    if (candidate.revocation_endpoint !== undefined) {
      validateEndpoint(candidate.revocation_endpoint, 'revocation_endpoint');
    }

    logger.info('OpenID Connect configuration discovered successfully', {
      issuer: candidate.issuer,
    });
    return candidate as unknown as OpenIDConfiguration;
  }

  public static validatePKCESupport(config: OpenIDConfiguration): boolean {
    return config.code_challenge_methods_supported?.includes('S256') ?? false;
  }
}
