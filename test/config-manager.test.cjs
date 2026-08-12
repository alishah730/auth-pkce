const assert = require('node:assert/strict');
const { mkdtemp, rm, stat } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { afterEach, describe, it } = require('node:test');
const { ConfigManager } = require('../dist');

const temporaryDirectories = [];

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'auth-pkce-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => (
    rm(directory, { recursive: true, force: true })
  )));
});

describe('ConfigManager', () => {
  it('stores configuration and tokens in an isolated directory', async () => {
    const configDir = await temporaryDirectory();
    const manager = new ConfigManager({ configDir });
    const config = {
      clientId: 'test-client',
      baseUrl: 'https://issuer.example.com',
      redirectUri: 'http://127.0.0.1:49152/callback',
      scope: 'openid profile',
      configVersion: '1.0.0',
    };
    const tokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 60_000,
      tokenType: 'Bearer',
    };

    await manager.saveConfig(config);
    await manager.saveTokens(tokens);

    assert.deepEqual(await manager.loadConfig(), config);
    assert.deepEqual(await manager.loadTokens(), tokens);
    assert.equal(manager.getConfigDir(), configDir);
    assert.equal(manager.isTokenExpired(tokens, 0), false);

    if (process.platform !== 'win32') {
      assert.equal((await stat(configDir)).mode & 0o777, 0o700);
      assert.equal((await stat(path.join(configDir, 'config.json'))).mode & 0o777, 0o600);
      assert.equal((await stat(path.join(configDir, 'tokens.json'))).mode & 0o777, 0o600);
    }
  });

  it('keeps separate CLI stores independent', async () => {
    const first = new ConfigManager({ configDir: await temporaryDirectory() });
    const second = new ConfigManager({ configDir: await temporaryDirectory() });
    await first.saveTokens({
      accessToken: 'first',
      expiresAt: Date.now() + 60_000,
      tokenType: 'Bearer',
    });

    assert.equal((await first.loadTokens()).accessToken, 'first');
    assert.equal(await second.loadTokens(), null);
  });

  it('applies clock skew when checking expiry', () => {
    const manager = new ConfigManager({ configDir: path.join(os.tmpdir(), 'unused-auth-pkce-test') });
    const tokens = {
      accessToken: 'access-token',
      expiresAt: Date.now() + 10_000,
      tokenType: 'Bearer',
    };
    assert.equal(manager.isTokenExpired(tokens, 0), false);
    assert.equal(manager.isTokenExpired(tokens, 30), true);
  });
});
