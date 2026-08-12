const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { Command } = require('commander');
const authPkce = require('../dist');

describe('package API', () => {
  it('exports the CLI integration and programmatic APIs', () => {
    assert.equal(typeof authPkce.AuthPKCELibrary, 'function');
    assert.equal(typeof authPkce.AuthPkceApi, 'function');
    assert.equal(typeof authPkce.ConfigManager, 'function');
    assert.equal(typeof authPkce.addAuthToCLI, 'function');
  });

  it('adds collision-safe auth commands to an existing Commander program', () => {
    const program = new Command().name('demo');
    authPkce.addAuthToCLI(program, { cliName: 'demo' });

    assert.deepEqual(program.commands.map((command) => command.name()), ['auth']);
    assert.deepEqual(
      program.commands[0].commands.map((command) => command.name()),
      ['configure', 'login', 'logout', 'whoami', 'refresh', 'status', 'token']
    );
  });

  it('can add commands at the root for a standalone CLI', () => {
    const program = new Command().name('standalone');
    authPkce.addAuthToCLI(program, { cliName: 'standalone', commandGroup: false });
    assert.deepEqual(
      program.commands.map((command) => command.name()),
      ['configure', 'login', 'logout', 'whoami', 'refresh', 'status', 'token']
    );
  });
});
