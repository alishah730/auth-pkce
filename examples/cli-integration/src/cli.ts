#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Commands } from './commands';

const program = new Command();
const commands = new Commands();

program
  .name('system-cli')
  .description('Example CLI that integrates with auth-pkce for OAuth authentication')
  .version('1.0.0');

// Global error handler
program.configureHelp({
  sortSubcommands: true
});

// Status command - check authentication status
program
  .command('status')
  .description('Check system authentication status')
  .action(async () => {
    try {
      await commands.status();
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// Show system command - get system information
program
  .command('show')
  .description('Show current system information')
  .action(async () => {
    try {
      await commands.showSystem();
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// List systems command - list all systems
program
  .command('list')
  .description('List all systems')
  .action(async () => {
    try {
      await commands.listSystems();
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// Create system command - create a new system
program
  .command('create')
  .description('Create a new system')
  .argument('<name>', 'System name')
  .option('-d, --description <desc>', 'System description')
  .action(async (name: string, options: { description?: string }) => {
    try {
      await commands.createSystem(name, options.description);
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// System status command - get system status by ID
program
  .command('system-status')
  .description('Get system status by ID')
  .argument('<id>', 'System ID')
  .action(async (id: string) => {
    try {
      await commands.getSystemStatus(id);
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// Update system command - update system configuration
program
  .command('update')
  .description('Update system configuration')
  .argument('<id>', 'System ID')
  .option('-n, --name <name>', 'New system name')
  .option('-d, --description <desc>', 'New system description')
  .option('-s, --status <status>', 'New system status (active/inactive)')
  .action(async (id: string, options: { name?: string; description?: string; status?: string }) => {
    try {
      const updates: any = {};
      if (options.name) updates.name = options.name;
      if (options.description) updates.description = options.description;
      if (options.status) updates.status = options.status;
      
      if (Object.keys(updates).length === 0) {
        console.log(chalk.yellow('No updates specified. Use --name, --description, or --status options.'));
        return;
      }
      
      await commands.updateSystem(id, updates);
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// Delete system command - delete a system
program
  .command('delete')
  .description('Delete a system')
  .argument('<id>', 'System ID')
  .action(async (id: string) => {
    try {
      await commands.deleteSystem(id);
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// Token command - show current access token
program
  .command('token')
  .description('Show current access token')
  .action(async () => {
    try {
      await commands.showToken();
    } catch (error) {
      console.error(chalk.red('Command failed:'), error);
      process.exit(1);
    }
  });

// Custom help
program.addHelpText('after', `

Examples:
  $ system-cli status                         Check authentication status
  $ system-cli show                          Show current system information
  $ system-cli list                          List all systems
  $ system-cli create "Production System"    Create a new system
  $ system-cli create "Dev System" -d "Development environment"  Create with description
  $ system-cli system-status sys-123         Get status for system sys-123
  $ system-cli update sys-123 --name "New Name"  Update system name
  $ system-cli delete sys-123                Delete system by ID
  $ system-cli token                         Show access token

Authentication:
  This CLI uses auth-pkce for OAuth authentication.
  
  First time setup:
  1. Configure auth-pkce: auth-pkce configure
  2. Login: auth-pkce login
  
  Then you can use this CLI normally.
  
  The CLI will automatically refresh tokens when needed.
`);

// Error handling
program.exitOverride();

async function main() {
  try {
    await program.parseAsync();
  } catch (error: any) {
    if (error.code === 'commander.help' || error.code === 'commander.version') {
      // These are expected exits from help/version commands
      return;
    }
    
    console.error(chalk.red('CLI Error:'), error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

if (require.main === module) {
  main();
}
