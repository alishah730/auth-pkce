import axios from 'axios';
import { OpenIDConfiguration } from '../types';
import logger from '../utils/logger';

export class OIDCDiscoveryService {
  /**
   * Discover OpenID Connect configuration from well-known endpoint
   */
  public static async discover(baseUrl: string): Promise<OpenIDConfiguration> {
    try {
      // Normalize base URL
      const normalizedUrl = baseUrl.replace(/\/$/, '');
      const discoveryUrl = `${normalizedUrl}/oauth2/token/.well-known/openid-configuration`;
      
      logger.info('Discovering OpenID Connect configuration', { discoveryUrl });
      
      const response = await axios.get<OpenIDConfiguration>(discoveryUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'auth-pkce-cli/1.0.0'
        }
      });

      const config = response.data;
      
      // Validate required endpoints
      if (!config.authorization_endpoint || !config.token_endpoint) {
        throw new Error('Invalid OpenID Connect configuration: missing required endpoints');
      }

      logger.info('OpenID Connect configuration discovered successfully', {
        issuer: config.issuer,
        endpoints: {
          authorization: config.authorization_endpoint,
          token: config.token_endpoint,
          userinfo: config.userinfo_endpoint
        }
      });

      return config;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`OpenID Connect discovery endpoint not found at ${baseUrl}/.well-known/openid-configuration`);
        }
        throw new Error(`Failed to discover OpenID Connect configuration: ${error.message}`);
      }
      
      logger.error('OpenID Connect discovery failed', { error, baseUrl });
      throw error;
    }
  }

  /**
   * Validate PKCE support in the discovered configuration
   */
  public static validatePKCESupport(config: OpenIDConfiguration): boolean {
    const supportedMethods = config.code_challenge_methods_supported || [];
    return supportedMethods.includes('S256');
  }
}
