#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AuthPKCELibrary } from 'auth-pkce';

// Create the main CLI program
const program = new Command();

// Package info
const packageJson = require('../package.json');

// Initialize auth-pkce library with custom branding
const authLib = new AuthPKCELibrary({
  cliName: 'ali',
  version: packageJson.version
});

// Set up main program
program
  .name('ali')
  .description('Ali CLI - A powerful CLI with OAuth 2.0 authentication')
  .version(packageJson.version, '-v, --version', 'display version number');

// Add authentication commands using the library
authLib.addAuthCommands(program);

// Add some custom commands specific to Ali CLI
program
  .command('hello')
  .description('Say hello!')
  .option('-n, --name <name>', 'Name to greet', 'World')
  .action((options) => {
    console.log(chalk.blue(`👋 Hello, ${options.name}!`));
    console.log(chalk.gray('This is the Ali CLI with integrated OAuth authentication.'));
    console.log(chalk.yellow('\n💡 Use "ali login" to authenticate before using protected commands.'));
  });

program
  .command('profile')
  .description('Show user profile (requires authentication)')
  .action(async () => {
    console.log(chalk.blue('👤 User Profile'));
    console.log(chalk.gray('Checking authentication status...'));
    
    try {
      // Use the library's whoami function
      await authLib.whoami();
    } catch (error) {
      console.log(chalk.red('❌ Please authenticate first with: ali login'));
    }
  });

program
  .command('protected')
  .description('Example protected command that requires authentication')
  .action(async () => {
    console.log(chalk.blue('🔒 Protected Command'));
    console.log(chalk.gray('This command requires authentication...'));
    
    try {
      // Check authentication status first
      await authLib.status();
      
      console.log(chalk.green('\n✅ Authentication verified!'));
      console.log(chalk.cyan('🎉 You have access to this protected feature!'));
      console.log(chalk.gray('This is where your protected functionality would go.'));
      
    } catch (error) {
      console.log(chalk.red('\n❌ Authentication required. Please run: ali login'));
    }
  });

// Custom help with branding
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
});

// ASCII art for Ali CLI
const ALI_LOGO = `
   ___   __    ____
  /   | / /   /  _/
 / /| |/ /    / /  
/ ___ / /   _/ /   
/_/  |_/   /___/   

OAuth 2.0 PKCE Authentication
`;

// Override help to show logo
const originalHelp = program.help;
program.help = function(options?: any) {
  console.log(chalk.cyan(ALI_LOGO));
  return originalHelp.call(this, options);
};

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
