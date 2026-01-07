#!/usr/bin/env node

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import pc from "picocolors";
import { createServer } from "vite";
import { organizeVariables } from "../core/extractor.js";
import { parseThemeVariables } from "../core/theme-parser.js";
import type { ThemeVariable } from "../core/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
	.name("tailwind-variables-viewer")
	.description("View Tailwind CSS v4 theme variables in your browser")
	.version("0.0.0")
	.requiredOption(
		"-c, --config <path...>",
		"CSS file(s) with @theme directives",
	)
	.option("-p, --port <number>", "Port number", parsePortNumber, 3000)
	.option("-o, --open", "Open browser automatically", false)
	.action(async (options) => {
		try {
			await runViewer(options);
		} catch (error) {
			console.error(
				pc.red("Error:"),
				error instanceof Error ? error.message : "Unknown error",
			);
			process.exit(1);
		}
	});

// Custom parser for port number with validation
function parsePortNumber(value: string): number {
	const port = parseInt(value, 10);
	if (Number.isNaN(port) || port < 1 || port > 65535) {
		console.error(pc.red("Error: Port must be between 1 and 65535"));
		process.exit(1);
	}
	return port;
}

// Main viewer logic
async function runViewer(options: {
	config: string[];
	port: number;
	open: boolean;
}) {
	// 1. Validate CSS files exist
	console.log(pc.cyan("Checking CSS files..."));
	await validateFiles(options.config);

	// 2. Parse and organize variables
	const { organized, totalVariables } = await parseAndOrganize(options.config);

	// 3. Write variables as static JSON file
	// Use CLI script location, not current working directory
	// __dirname = dist/cli, so ../ui = dist/ui
	const distUiDir = resolve(__dirname, "..", "ui");
	const apiDir = resolve(distUiDir, "api");
	await mkdir(apiDir, { recursive: true });
	await writeFile(
		resolve(apiDir, "variables.json"),
		JSON.stringify(organized, null, 2),
		"utf8",
	);

	// 4. Start Vite dev server with HMR
	console.log(pc.cyan("\nStarting server..."));
	const server = await createServer({
		configFile: false,
		plugins: [
			{
				async configureServer(server) {
					// Watch CSS file for changes and trigger full reload
					const chokidar = await import("chokidar");
					const cssFilePath = resolve(options.config[0]);
					const watcher = chokidar.watch(cssFilePath, {
						awaitWriteFinish: { pollInterval: 50, stabilityThreshold: 100 },
						ignoreInitial: true,
					});

					watcher.on("change", async () => {
						console.log(pc.cyan("\n🔄 CSS file changed, reloading..."));
						try {
							// Re-parse and update variables
							const result = await parseAndOrganize(options.config);
							await writeFile(
								resolve(apiDir, "variables.json"),
								JSON.stringify(result.organized, null, 2),
								"utf8",
							);
							// Trigger full page reload via WebSocket
							server.ws.send({
								path: "*",
								type: "full-reload",
							});
							console.log(pc.green("✓ Reloaded successfully"));
							console.log(pc.gray(`Variables: ${result.totalVariables}\n`));
						} catch (error) {
							console.error(
								pc.red("Error reloading:"),
								error instanceof Error ? error.message : "Unknown error",
							);
						}
					});
				},
				name: "watch-css",
			},
		],
		root: distUiDir,
		server: {
			open: options.open,
			port: options.port,
			strictPort: false,
		},
	});

	await server.listen();

	const actualPort = server.config.server.port || options.port;
	const url = `http://localhost:${actualPort}`;

	console.log(pc.green("\n✓ Server started"));
	console.log(pc.cyan(`→ ${url}`));
	console.log(pc.gray(`\nVariables: ${totalVariables}`));
	console.log(pc.gray("Watching for changes..."));
	console.log(pc.gray("Press Ctrl+C to stop\n"));

	// Graceful shutdown
	process.on("SIGINT", async () => {
		console.log(pc.yellow("\n\nShutting down..."));
		await server.close();
		console.log(pc.green("✓ Server closed"));
		process.exit(0);
	});
}

/**
 * Parse and organize theme variables
 */
async function parseAndOrganize(configPaths: string[]) {
	// Parse @theme variables from CSS
	const parsedTheme = await parseThemeVariables(configPaths[0]);

	// @import "tailwindcss"がある場合、デフォルト変数も読み込む
	let allVariables = [...parsedTheme.variables];
	if (parsedTheme.hasImport) {
		try {
			const tailwindThemePath = resolve("node_modules/tailwindcss/theme.css");
			const tailwindTheme = await parseThemeVariables(tailwindThemePath, false);

			// リセット処理を適用
			let defaultVars = tailwindTheme.variables;
			if (parsedTheme.hasReset) {
				// --*: initial が存在する場合、全デフォルト変数を除外
				defaultVars = [];
			} else {
				// ネームスペース別リセットや個別リセットを処理
				defaultVars = applyResets(defaultVars, parsedTheme.variables);
			}

			// デフォルト + ユーザー変数をマージ（ユーザー変数が優先、initialは除外）
			allVariables = mergeAndDeduplicate([
				...defaultVars,
				...parsedTheme.variables,
			]);
		} catch {
			// Silently fail if Tailwind default theme not found
		}
	}

	// Organize variables for display
	const parsedCSS = {
		filePath: configPaths[0],
		variables: allVariables.map((v) => ({
			name: v.name,
			value: v.value,
		})),
	};
	const organized = organizeVariables([parsedCSS]);

	const totalVariables = Object.values(organized).reduce(
		(sum, vars) => sum + vars.length,
		0,
	);

	return { organized, totalVariables };
}

/**
 * リセットパターンを適用してデフォルト変数をフィルタリング
 */
function applyResets(
	defaultVars: ThemeVariable[],
	userVars: ThemeVariable[],
): ThemeVariable[] {
	// ユーザー定義の `initial` 値を持つ変数を抽出（リセットパターン）
	const resetPatterns = userVars
		.filter((v) => v.value.trim() === "initial")
		.map((v) => v.name);

	if (resetPatterns.length === 0) {
		return defaultVars;
	}

	// デフォルト変数から、リセットパターンに一致するものを除外
	return defaultVars.filter((v) => {
		return !resetPatterns.some((pattern) => {
			if (pattern.endsWith("-*")) {
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
function mergeAndDeduplicate(vars: ThemeVariable[]): ThemeVariable[] {
	const map = new Map<string, ThemeVariable>();

	for (const v of vars) {
		// `initial` 値の変数は除外（リセット用なので表示しない）
		if (v.value.trim() !== "initial") {
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
			console.log(pc.yellow("\nTip: Specify your theme CSS with -c"));
			console.log(
				pc.gray("Example: tailwind-variables-viewer -c ./src/app.css"),
			);
			process.exit(1);
		}
	}
}

// Add helpful examples to help text
program.addHelpText(
	"after",
	`


${pc.bold("Examples:")}
  $ tailwind-variables-viewer -c ./src/app.css
  $ tailwind-variables-viewer -c ./theme.css -p 3001 -o
  $ tailwind-variables-viewer -c ./base.css -c ./colors.css

${pc.bold("More information:")}
  https://github.com/your-repo/tailwind-variables-viewer
`,
);

program.parse();
