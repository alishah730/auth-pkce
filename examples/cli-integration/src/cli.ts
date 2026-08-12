#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { AuthPKCELibrary } from 'auth-pkce';
import { Commands } from './commands';

const program = new Command()
  .name('my-api-cli')
  .description('Example API CLI with embedded OAuth 2.0 PKCE authentication')
  .version('1.0.0');
const commands = new Commands();
const auth = new AuthPKCELibrary({ cliName: 'my-api-cli', version: '1.0.0' });

auth.addAuthCommands(program);

program.command('status').description('check API authentication status')
  .action(async () => commands.status());
program.command('show').description('show current system information')
  .action(async () => commands.showSystem());
program.command('list').description('list systems')
  .action(async () => commands.listSystems());
program.command('create').description('create a system')
  .argument('<name>', 'system name')
  .option('-d, --description <description>', 'system description')
  .action(async (name: string, options: { description?: string }) => (
    commands.createSystem(name, options.description)
  ));
program.command('system-status').description('get system status by ID')
  .argument('<id>', 'system ID')
  .action(async (id: string) => commands.getSystemStatus(id));
program.command('update').description('update a system')
  .argument('<id>', 'system ID')
  .option('-n, --name <name>', 'new system name')
  .option('-d, --description <description>', 'new description')
  .option('-s, --status <status>', 'new status')
  .action(async (
    id: string,
    options: { name?: string; description?: string; status?: string }
  ) => {
    const updates: Record<string, string> = {};
    if (options.name) updates.name = options.name;
    if (options.description) updates.description = options.description;
    if (options.status) updates.status = options.status;
    if (Object.keys(updates).length === 0) {
      throw new Error('Use --name, --description, or --status to provide an update');
    }
    await commands.updateSystem(id, updates);
  });
program.command('delete').description('delete a system')
  .argument('<id>', 'system ID')
  .action(async (id: string) => commands.deleteSystem(id));

program.addHelpText('after', `

Authentication:
  my-api-cli auth configure
  my-api-cli auth login
  my-api-cli auth status

API examples:
  my-api-cli list
  my-api-cli create "Production" --description "Primary system"
  my-api-cli system-status sys-123
`);

async function main(): Promise<void> {
  try {
    if (process.argv.length === 2) {
      program.outputHelp();
      return;
    }
    await program.parseAsync();
  } catch (error) {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}

void main();
