#!/usr/bin/env node

const assert = require('node:assert/strict');
const { Command } = require('commander');
const {
  AuthPKCELibrary,
  AuthPkceApi,
  ConfigManager,
  addAuthToCLI,
  createAuthPKCE,
} = require('../dist');

assert.equal(typeof AuthPKCELibrary, 'function');
assert.equal(typeof AuthPkceApi, 'function');
assert.equal(typeof ConfigManager, 'function');
assert.equal(typeof createAuthPKCE, 'function');

const auth = createAuthPKCE({ cliName: 'smoke-cli' });
for (const method of [
  'addAuthCommands',
  'login',
  'logout',
  'isAuthenticated',
  'getAccessToken',
  'getBearerToken',
]) {
  assert.equal(typeof auth[method], 'function', `${method} should be exported`);
}

const program = new Command().name('smoke-cli');
addAuthToCLI(program, { cliName: 'smoke-cli' });
assert.deepEqual(program.commands.map((command) => command.name()), ['auth']);

console.log('auth-pkce package exports and Commander integration: OK');
