const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  generateCodeChallenge,
  generateCodeVerifier,
  generatePKCEChallenge,
  generateState,
} = require('../dist');

describe('PKCE utilities', () => {
  it('generates RFC 7636-compatible verifiers and S256 challenges', () => {
    const verifier = generateCodeVerifier();
    assert.equal(verifier.length, 43);
    assert.match(verifier, /^[A-Za-z0-9_-]+$/);

    const challenge = generatePKCEChallenge();
    assert.equal(challenge.codeChallengeMethod, 'S256');
    assert.equal(challenge.codeChallenge, generateCodeChallenge(challenge.codeVerifier));
  });

  it('matches the RFC 7636 appendix B test vector', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    assert.equal(
      generateCodeChallenge(verifier),
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });

  it('generates unique state values', () => {
    const first = generateState();
    const second = generateState();
    assert.notEqual(first, second);
    assert.match(first, /^[A-Za-z0-9_-]+$/);
  });
});
