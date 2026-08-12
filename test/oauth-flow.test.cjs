const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { afterEach, describe, it } = require('node:test');
const {
  generateCodeChallenge,
  OAuthClient,
  OIDCDiscoveryService,
} = require('../dist');

const servers = [];

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      servers.push(server);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function unusedPort() {
  const server = createServer();
  const port = await listen(server);
  servers.splice(servers.indexOf(server), 1);
  await close(server);
  return port;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(close));
});

describe('OIDC discovery and OAuth flow', () => {
  it('constructs the standard OpenID Connect discovery URL', () => {
    assert.equal(
      OIDCDiscoveryService.getDiscoveryUrl('https://issuer.example.com/tenant'),
      'https://issuer.example.com/tenant/.well-known/openid-configuration'
    );
  });

  it('completes discovery, a path-specific callback, and the PKCE token exchange', async () => {
    let issuer;
    let tokenRequest;
    const provider = createServer(async (request, response) => {
      if (request.url === '/.well-known/openid-configuration') {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          userinfo_endpoint: `${issuer}/userinfo`,
          revocation_endpoint: `${issuer}/revoke`,
          code_challenge_methods_supported: ['S256'],
        }));
        return;
      }

      if (request.url === '/token' && request.method === 'POST') {
        let body = '';
        for await (const chunk of request) body += chunk;
        tokenRequest = new URLSearchParams(body);
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
        }));
        return;
      }

      response.writeHead(404).end();
    });
    issuer = `http://127.0.0.1:${await listen(provider)}`;
    const callbackPort = await unusedPort();
    const redirectUri = `http://127.0.0.1:${callbackPort}/callback`;
    let authorizationRequest;

    const client = new OAuthClient({
      clientId: 'test-client',
      baseUrl: issuer,
      redirectUri,
      scope: 'openid profile',
      configVersion: '1.0.0',
    }, {
      callbackTimeoutMs: 5_000,
      openBrowser: async (authorizationUrl) => {
        authorizationRequest = new URL(authorizationUrl);
        const state = authorizationRequest.searchParams.get('state');
        const callback = await fetch(`${redirectUri}?code=test-code&state=${encodeURIComponent(state)}`);
        assert.equal(callback.status, 200);
      },
    });

    const tokens = await client.authorize();
    assert.equal(tokens.access_token, 'access-token');
    assert.equal(authorizationRequest.pathname, '/authorize');
    assert.equal(authorizationRequest.searchParams.get('external'), null);
    assert.equal(authorizationRequest.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(tokenRequest.get('grant_type'), 'authorization_code');
    assert.equal(tokenRequest.get('redirect_uri'), redirectUri);
    assert.equal(
      generateCodeChallenge(tokenRequest.get('code_verifier')),
      authorizationRequest.searchParams.get('code_challenge')
    );
  });

  it('rejects discovery metadata from a different issuer', async () => {
    let issuer;
    const provider = createServer((_request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        issuer: `${issuer}/different`,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
      }));
    });
    issuer = `http://127.0.0.1:${await listen(provider)}`;

    await assert.rejects(
      OIDCDiscoveryService.discover(issuer),
      /issuer mismatch/
    );
  });
});
