#!/usr/bin/env node

import chalk from 'chalk';
import packageJson from '../package.json';
import { AuthPKCELibrary } from './lib/auth-pkce-lib';
import { ASCII_LOGO } from './utils/ascii-art';
import logger from './utils/logger';

const auth = new AuthPKCELibrary({
  cliName: 'auth-pkce',
  version: packageJson.version,
  commandGroup: false,
});
const program = auth.createCLI();

program.addHelpText('beforeAll', chalk.cyan(ASCII_LOGO));
program
  .command('version')
  .description('show version and runtime information')
  .action(() => {
    console.log(chalk.cyan(ASCII_LOGO));
    console.log(`Version: ${packageJson.version}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
  });

async function main(): Promise<void> {
  try {
    if (process.argv.length === 2) {
      program.outputHelp();
      return;
    }
    await program.parseAsync();
  } catch (error) {
    logger.error('Command failed', { error });
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}

void main();
