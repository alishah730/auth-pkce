#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ASCII_LOGO } from './utils/ascii-art';
import {
  configureCommand,
  loginCommand,
  logoutCommand,
  whoamiCommand,
  refreshCommand,
  statusCommand,
  tokenCommand
} from './commands';
import logger from './utils/logger';

const program = new Command();

// Package info
const packageJson = require('../package.json');

program
  .name('auth-pkce')
  .description('OAuth 2.0 PKCE Authentication CLI Tool')
  .version(packageJson.version, '-v, --version', 'display version number');

// Custom version command with ASCII art
program
  .command('version')
  .description('display version and logo')
  .action(() => {
    console.log(chalk.cyan(ASCII_LOGO));
    console.log(chalk.white(`Version: ${packageJson.version}`));
    console.log(chalk.gray(`Node.js: ${process.version}`));
    console.log(chalk.gray(`Platform: ${process.platform} ${process.arch}`));
  });

// Configure command
program
  .command('configure')
  .alias('config')
  .description('configure OAuth settings interactively')
  .option('-b, --base-url <url>', 'OAuth provider base URL')
  .action(async (options) => {
    await configureCommand(options);
  });

// Login command
program
  .command('login')
  .description('authenticate using OAuth 2.0 PKCE flow')
  .action(async () => {
    await loginCommand();
  });

// Logout command
program
  .command('logout')
  .description('logout and clear stored tokens')
  .action(async () => {
    await logoutCommand();
  });

// Whoami command
program
  .command('whoami')
  .description('display current user information')
  .action(async () => {
    await whoamiCommand();
  });

// Refresh command
program
  .command('refresh')
  .description('refresh access token using refresh token')
  .action(async () => {
    await refreshCommand();
  });

// Status command
program
  .command('status')
  .description('show current authentication status')
  .action(async () => {
    await statusCommand();
  });

// Token command
program
  .command('token')
  .description('display access token and copy to clipboard')
  .action(async () => {
    await tokenCommand();
  });

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  console.error(chalk.red('❌ An unexpected error occurred:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  console.error(chalk.red('❌ An unexpected error occurred:'), reason);
  process.exit(1);
});

// Custom help
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
});

// Override help to show logo
const originalHelp = program.help;
program.help = function(options?: any) {
  console.log(chalk.cyan(ASCII_LOGO));
  return originalHelp.call(this, options);
};

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
