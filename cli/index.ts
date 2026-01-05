#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import open from 'open';
import { resolve } from 'path';
import { access } from 'fs/promises';
import { parseThemeVariables } from '../lib/theme-parser.js';
import { generateHTML } from '../lib/html-generator.js';
import { buildWithTailwind } from '../lib/builder.js';
import { parseCSS } from '../lib/parser.js';
import { organizeVariables } from '../lib/extractor.js';
import { startServer } from '../lib/server.js';

const program = new Command();

program
  .name('tailwind-variables-viewer')
  .description('View Tailwind CSS v4 theme variables in your browser')
  .version('0.0.0')
  .requiredOption('-c, --config <path...>', 'CSS file(s) with @theme directives')
  .option('-p, --port <number>', 'Port number', parsePortNumber, 3000)
  .option('-o, --open', 'Open browser automatically', false)
  .action(async (options) => {
    try {
      await runViewer(options);
    } catch (error) {
      console.error(pc.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Custom parser for port number with validation
function parsePortNumber(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(pc.red('Error: Port must be between 1 and 65535'));
    process.exit(1);
  }
  return port;
}

// Main viewer logic
async function runViewer(options: { config: string[]; port: number; open: boolean }) {
  // 1. Validate CSS files exist
  console.log(pc.cyan('Checking CSS files...'));
  await validateFiles(options.config);

  // 2. Parse @theme variables from CSS
  console.log(pc.cyan('Parsing @theme directives...'));
  const parsedTheme = await parseThemeVariables(options.config[0]);

  if (parsedTheme.variables.length === 0) {
    console.warn(pc.yellow('Warning: No @theme variables found'));
    console.log(pc.gray('\nMake sure your CSS contains @theme directives:'));
    console.log(pc.gray('@theme {'));
    console.log(pc.gray('  --color-primary: oklch(0.5 0.2 240);'));
    console.log(pc.gray('}'));
    process.exit(0);
  }

  console.log(pc.green(`✓ Found ${parsedTheme.variables.length} @theme variables`));

  // 3. Generate HTML with Tailwind classes
  console.log(pc.cyan('Generating preview HTML...'));
  const generatedHTML = await generateHTML(parsedTheme.variables, options.config[0]);

  // 4. Build with Tailwind CLI
  console.log(pc.cyan('Building with Tailwind CSS...'));
  await buildWithTailwind(generatedHTML.html, options.config[0]);
  console.log(pc.green('✓ Tailwind build completed'));

  // 5. Parse generated CSS to extract final variable values
  console.log(pc.cyan('Extracting variable values...'));
  const parsedFiles = await parseCSS('.tmp/preview.css');
  const organized = organizeVariables([parsedFiles]);

  const totalVariables = Object.values(organized)
    .reduce((sum, vars) => sum + vars.length, 0);

  if (totalVariables === 0) {
    console.warn(pc.yellow('Warning: No variables found in generated CSS'));
    process.exit(0);
  }

  console.log(pc.green(`✓ Extracted ${totalVariables} theme variables`));

  // Display variables by namespace
  for (const [namespace, vars] of Object.entries(organized)) {
    console.log(pc.gray(`  - ${namespace} (${vars.length})`));
  }

  // 6. Start server
  console.log(pc.cyan('\nStarting server...'));
  const { server, port, url } = await startServer(organized, { port: options.port });

  console.log(pc.green('\n✓ Server started'));
  console.log(pc.cyan(`→ ${url}`));
  console.log(pc.gray(`\nVariables: ${totalVariables}`));
  console.log(pc.gray('Press Ctrl+C to stop\n'));

  // 7. Open browser if requested
  if (options.open) {
    await open(url);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(pc.yellow('\nShutting down...'));
    server.httpServer?.close(() => {
      console.log(pc.green('Server closed'));
      process.exit(0);
    });
  });
}

// Validate that CSS files exist
async function validateFiles(filePaths: string[]) {
  for (const filePath of filePaths) {
    const absolutePath = resolve(filePath);
    try {
      await access(absolutePath);
    } catch {
      console.error(pc.red(`Error: CSS file not found: ${filePath}`));
      console.log(pc.yellow('\nTip: Specify your theme CSS with -c'));
      console.log(pc.gray('Example: tailwind-variables-viewer -c ./src/app.css'));
      process.exit(1);
    }
  }
}

// Add helpful examples to help text
program.addHelpText('after', `

${pc.bold('Examples:')}
  $ tailwind-variables-viewer -c ./src/app.css
  $ tailwind-variables-viewer -c ./theme.css -p 3001 -o
  $ tailwind-variables-viewer -c ./base.css -c ./colors.css

${pc.bold('More information:')}
  https://github.com/your-repo/tailwind-variables-viewer
`);

program.parse();
