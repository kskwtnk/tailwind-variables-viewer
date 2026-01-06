#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import open from 'open';
import { resolve } from 'path';
import { access } from 'fs/promises';
import { parseThemeVariables } from '../core/theme-parser.js';
import { organizeVariables } from '../core/extractor.js';
import { startServer } from '../core/server.js';
import type { ThemeVariable } from '../core/types.js';

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

  // @import "tailwindcss"がある場合、デフォルト変数も読み込む
  let allVariables = [...parsedTheme.variables];
  if (parsedTheme.hasImport) {
    console.log(pc.cyan('Detected @import "tailwindcss", loading default theme variables...'));
    try {
      const tailwindThemePath = resolve('node_modules/tailwindcss/theme.css');
      const tailwindTheme = await parseThemeVariables(tailwindThemePath, false);
      console.log(pc.green(`✓ Loaded ${tailwindTheme.variables.length} default theme variables`));

      // リセット処理を適用
      let defaultVars = tailwindTheme.variables;
      if (parsedTheme.hasReset) {
        // --*: initial が存在する場合、全デフォルト変数を除外
        console.log(pc.cyan('Applying global reset (--*: initial)'));
        defaultVars = [];
      } else {
        // ネームスペース別リセットや個別リセットを処理
        defaultVars = applyResets(defaultVars, parsedTheme.variables);
      }

      // デフォルト + ユーザー変数をマージ（ユーザー変数が優先、initialは除外）
      allVariables = mergeAndDeduplicate([...defaultVars, ...parsedTheme.variables]);
    } catch (error) {
      console.warn(pc.yellow('Warning: Could not load Tailwind default theme'));
    }
  }

  if (allVariables.length === 0) {
    console.warn(pc.yellow('⚠ No @theme variables found'));
  }

  console.log(pc.green(`✓ Found ${allVariables.length} @theme variables (user: ${parsedTheme.variables.length})`));

  // 3. Organize variables for display (skip build process)
  console.log(pc.cyan('Organizing variables...'));
  // theme-parser.tsから取得した変数を直接extractor.tsで整理
  // ParsedCSS形式に変換してorganizeVariables()に渡す
  const parsedCSS = {
    filePath: options.config[0],
    variables: allVariables.map(v => ({
      name: v.name,
      value: v.value
    }))
  };
  const organized = organizeVariables([parsedCSS]);

  const totalVariables = Object.values(organized)
    .reduce((sum, vars) => sum + vars.length, 0);

  if (totalVariables === 0) {
    console.log(pc.yellow('⚠ No theme variables found'));
  } else {
    console.log(pc.green(`✓ Extracted ${totalVariables} theme variables`));

    // Display variables by namespace
    for (const [namespace, vars] of Object.entries(organized)) {
      console.log(pc.gray(`  - ${namespace} (${vars.length})`));
    }
  }

  // 4. Start server
  console.log(pc.cyan('\nStarting server...'));
  const { server, port, url } = await startServer(organized, { port: options.port });

  console.log(pc.green('\n✓ Server started'));
  console.log(pc.cyan(`→ ${url}`));
  console.log(pc.gray(`\nVariables: ${totalVariables}`));
  console.log(pc.gray('Press Ctrl+C to stop\n'));

  // 5. Open browser if requested
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

/**
 * リセットパターンを適用してデフォルト変数をフィルタリング
 */
function applyResets(
  defaultVars: ThemeVariable[],
  userVars: ThemeVariable[]
): ThemeVariable[] {
  // ユーザー定義の `initial` 値を持つ変数を抽出（リセットパターン）
  const resetPatterns = userVars
    .filter(v => v.value.trim() === 'initial')
    .map(v => v.name);

  if (resetPatterns.length === 0) {
    return defaultVars;
  }

  // デフォルト変数から、リセットパターンに一致するものを除外
  return defaultVars.filter(v => {
    return !resetPatterns.some(pattern => {
      if (pattern.endsWith('-*')) {
        // --color-* のようなワイルドカードパターン
        const prefix = pattern.slice(0, -2); // '-*' を除去
        return v.name.startsWith(prefix);
      }
      // 完全一致
      return v.name === pattern;
    });
  });
}

/**
 * 変数をマージして重複を除去
 * - 後の変数が優先（上書き）
 * - `initial` 値の変数は除外
 */
function mergeAndDeduplicate(
  vars: ThemeVariable[]
): ThemeVariable[] {
  const map = new Map<string, ThemeVariable>();

  for (const v of vars) {
    // `initial` 値の変数は除外（リセット用なので表示しない）
    if (v.value.trim() !== 'initial') {
      map.set(v.name, v); // 後の変数が優先（上書き）
    }
  }

  return Array.from(map.values());
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
