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

program
  .command('publish')
  .description('Publish content using authenticated API calls')
  .argument('<type>', 'Type of content to publish (e.g., image, document)')
  .argument('<path>', 'Path to the content file')
  .option('--api-url <url>', 'API endpoint URL', 'https://api.example.com/v1/publish')
  .option('--dry-run', 'Show what would be published without actually doing it')
  .action(async (type, filePath, options) => {
    console.log(chalk.blue(`📤 Publishing ${type}: ${filePath}`));
    
    try {
      // Get the bearer token for API authentication
      const bearerToken = await authLib.getBearerToken();
      console.log(chalk.gray('✓ Authentication token obtained'));
      
      if (options.dryRun) {
        console.log(chalk.yellow('🔍 Dry run mode - showing what would be published:'));
        console.log(chalk.gray(`  Type: ${type}`));
        console.log(chalk.gray(`  File: ${filePath}`));
        console.log(chalk.gray(`  API URL: ${options.apiUrl}`));
        console.log(chalk.gray(`  Authorization: Bearer ${bearerToken.substring(0, 20)}...`));
        return;
      }
      
      // Simulate API call with bearer token
      console.log(chalk.gray(`Making API call to ${options.apiUrl}...`));
      
      // Example API call using fetch or axios
      const response = await makeAPICall(options.apiUrl + `/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': bearerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: type,
          filePath: filePath,
          timestamp: new Date().toISOString()
        })
      });
      
      console.log(chalk.green(`✅ Successfully published ${type}!`));
      console.log(chalk.gray(`Response: ${response.status || 'OK'}`));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not authenticated')) {
        console.log(chalk.red('❌ Authentication required. Please run: ali login'));
      } else if (errorMessage.includes('expired')) {
        console.log(chalk.red('❌ Token expired. Please run: ali auth refresh'));
      } else {
        console.log(chalk.red('❌ Publish failed:'), errorMessage);
      }
      process.exit(1);
    }
  });

// Mock API call function (replace with actual HTTP client in real usage)
async function makeAPICall(url: string, options: { method: string; headers: Record<string, string>; body: string }): Promise<{ status: string }> {
  console.log(chalk.gray(`🌐 POST ${url}`));
  console.log(chalk.gray(`📋 Headers: ${JSON.stringify(options.headers, null, 2)}`));
  console.log(chalk.gray(`📦 Body: ${options.body}`));
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock successful response
  return { status: '201 Created' };
}

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
