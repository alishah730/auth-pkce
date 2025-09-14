export class AuthPKCEError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'AuthPKCEError';
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, AuthPKCEError);
  }
}

export class ConfigurationError extends AuthPKCEError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
  }
}

export class AuthenticationError extends AuthPKCEError {
  constructor(message: string, statusCode?: number) {
    super(message, 'AUTHENTICATION_ERROR', statusCode);
  }
}

export class TokenError extends AuthPKCEError {
  constructor(message: string, statusCode?: number) {
    super(message, 'TOKEN_ERROR', statusCode);
  }
}

export class NetworkError extends AuthPKCEError {
  constructor(message: string, statusCode?: number) {
    super(message, 'NETWORK_ERROR', statusCode);
  }
}

export class ValidationError extends AuthPKCEError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Handle and format errors for CLI output
   */
  static handleError(error: unknown): { message: string; code?: string; shouldExit: boolean } {
    if (error instanceof AuthPKCEError) {
      return {
        message: error.message,
        code: error.code,
        shouldExit: true
      };
    }

    if (error instanceof Error) {
      // Handle specific Node.js errors
      if (error.message.includes('ENOTFOUND')) {
        return {
          message: 'Network error: Unable to resolve hostname. Check your internet connection and base URL.',
          code: 'NETWORK_ERROR',
          shouldExit: true
        };
      }

      if (error.message.includes('ECONNREFUSED')) {
        return {
          message: 'Connection refused: The OAuth server is not reachable.',
          code: 'CONNECTION_ERROR',
          shouldExit: true
        };
      }

      if (error.message.includes('timeout')) {
        return {
          message: 'Request timeout: The OAuth server took too long to respond.',
          code: 'TIMEOUT_ERROR',
          shouldExit: true
        };
      }

      return {
        message: error.message,
        shouldExit: true
      };
    }

    return {
      message: 'An unexpected error occurred',
      shouldExit: true
    };
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string, fieldName: string = 'URL'): void {
    try {
      new URL(url);
    } catch {
      throw new ValidationError(`Invalid ${fieldName}: ${url}`);
    }
  }

  /**
   * Validate required configuration fields
   */
  static validateConfig(config: Record<string, unknown>): void {
    const requiredFields = ['baseUrl', 'clientId', 'redirectUri', 'scope'];
    
    for (const field of requiredFields) {
      if (!config[field] || typeof config[field] !== 'string' || (config[field] as string).trim() === '') {
        throw new ConfigurationError(`Missing or invalid configuration field: ${field}`);
      }
    }

    // Validate URLs
    this.validateUrl(config.baseUrl as string, 'base URL');
    this.validateUrl(config.redirectUri as string, 'redirect URI');
  }
}
