#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import packageJson from '../package.json';
import { AuthPKCELibrary } from 'auth-pkce';

const program = new Command();
const auth = new AuthPKCELibrary({
  cliName: 'ali',
  version: packageJson.version,
  configDir: process.env.ALI_AUTH_DIR,
});

program
  .name('ali')
  .description('Example CLI with embedded OAuth 2.0 PKCE authentication')
  .version(packageJson.version);

auth.addAuthCommands(program);

program
  .command('hello')
  .description('run a public command')
  .option('-n, --name <name>', 'name to greet', 'World')
  .action((options: { name: string }) => {
    console.log(chalk.blue(`Hello, ${options.name}!`));
    console.log(chalk.gray('Use "ali auth login" before running protected commands.'));
  });

program
  .command('profile')
  .description('show the authenticated user profile')
  .action(async () => {
    const user = await auth.getUserInfo();
    if (!user) {
      throw new Error('Authentication is required. Run: ali auth login');
    }
    console.log(JSON.stringify(user, null, 2));
  });

program
  .command('protected')
  .description('run an example protected command')
  .action(async () => {
    await auth.getAccessToken();
    console.log(chalk.green('Authentication verified. Protected operation can continue.'));
  });

program
  .command('publish')
  .description('make a mock authenticated publish request')
  .argument('<type>', 'content type')
  .argument('<path>', 'content path')
  .option('--api-url <url>', 'API endpoint URL', 'https://api.example.com/v1/publish')
  .option('--dry-run', 'show the request without sending it')
  .action(async (
    type: string,
    filePath: string,
    options: { apiUrl: string; dryRun?: boolean }
  ) => {
    const bearerToken = await auth.getBearerToken();
    const payload = {
      type,
      filePath,
      timestamp: new Date().toISOString(),
    };

    if (options.dryRun) {
      console.log(JSON.stringify({
        url: `${options.apiUrl}/${type}`,
        authorization: 'Bearer <redacted>',
        payload,
      }, null, 2));
      return;
    }

    const result = await makeMockApiCall(`${options.apiUrl}/${type}`, payload, bearerToken);
    console.log(chalk.green(`Published ${type}: ${result.status}`));
  });

async function makeMockApiCall(
  url: string,
  payload: Record<string, string>,
  bearerToken: string
): Promise<{ status: string }> {
  if (!bearerToken.startsWith('Bearer ')) {
    throw new Error('Bearer token is missing');
  }
  console.log(chalk.gray(`Mock POST ${url}`));
  console.log(chalk.gray(`Payload keys: ${Object.keys(payload).join(', ')}`));
  return { status: '201 Created' };
}

const ALI_LOGO = `
   ___   __    ____
  /   | / /   /  _/
 / /| |/ /    / /
/ ___ / /   _/ /
/_/  |_/   /___/
`;
program.addHelpText('beforeAll', chalk.cyan(ALI_LOGO));

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
