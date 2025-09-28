// Core library exports
export * from './types';
export * from './config/manager';
export * from './services/oauth-client';
export * from './services/oidc-discovery';
export * from './utils/crypto';
export * from './utils/logger';
export * from './commands';

// Library interface exports
export * from './lib/auth-pkce-lib';

// Main library export
export { AuthPKCELibrary as default } from './lib/auth-pkce-lib';
