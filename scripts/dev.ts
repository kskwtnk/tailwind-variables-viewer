#!/usr/bin/env bun
/**
 * Development server with HMR
 * Serves src/ui directly with Vite dev server
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { organizeVariables } from "../src/core/extractor.js";
import { parseThemeVariables } from "../src/core/theme-parser.js";
import type { ThemeVariable } from "../src/core/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

// Parse dev sample CSS
const sampleCssPath = resolve(projectRoot, "dev/sample.css");

async function parseAndOrganize(configPath: string) {
	const parsedTheme = await parseThemeVariables(configPath);

	let allVariables = [...parsedTheme.variables];
	if (parsedTheme.hasImport) {
		try {
			const tailwindThemePath = resolve("node_modules/tailwindcss/theme.css");
			const tailwindTheme = await parseThemeVariables(tailwindThemePath, false);

			let defaultVars = tailwindTheme.variables;
			if (parsedTheme.hasReset) {
				defaultVars = [];
			} else {
				defaultVars = applyResets(defaultVars, parsedTheme.variables);
			}

			allVariables = mergeAndDeduplicate([
				...defaultVars,
				...parsedTheme.variables,
			]);
		} catch {
			// Silently fail if Tailwind default theme not found
		}
	}

	const parsedCSS = {
		filePath: configPath,
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

function applyResets(
	defaultVars: ThemeVariable[],
	userVars: ThemeVariable[],
): ThemeVariable[] {
	const resetPatterns = userVars
		.filter((v) => v.value.trim() === "initial")
		.map((v) => v.name);

	if (resetPatterns.length === 0) {
		return defaultVars;
	}

	return defaultVars.filter((v) => {
		return !resetPatterns.some((pattern) => {
			if (pattern.endsWith("-*")) {
				const prefix = pattern.slice(0, -2);
				return v.name.startsWith(prefix);
			}
			return v.name === pattern;
		});
	});
}

function mergeAndDeduplicate(vars: ThemeVariable[]): ThemeVariable[] {
	const map = new Map<string, ThemeVariable>();

	for (const v of vars) {
		if (v.value.trim() !== "initial") {
			map.set(v.name, v);
		}
	}

	return Array.from(map.values());
}

// Main
console.log("🔍 Parsing theme variables...");
const { organized, totalVariables } = await parseAndOrganize(sampleCssPath);
console.log(`✓ Found ${totalVariables} variables`);

// Write variables JSON to src/ui/api
const srcUiDir = resolve(projectRoot, "src/ui");
const apiDir = resolve(srcUiDir, "api");
await mkdir(apiDir, { recursive: true });
await writeFile(
	resolve(apiDir, "variables.json"),
	JSON.stringify(organized, null, 2),
	"utf8",
);
console.log("✓ Wrote variables.json");

// Start Vite dev server
console.log("\n🚀 Starting Vite dev server...");

const server = await createServer({
	plugins: [
		{
			async configureServer(server) {
				// Watch sample CSS for changes
				const chokidar = await import("chokidar");
				const watcher = chokidar.watch(sampleCssPath, {
					awaitWriteFinish: { pollInterval: 50, stabilityThreshold: 100 },
					ignoreInitial: true,
				});

				watcher.on("change", async () => {
					console.log("\n🔄 Sample CSS changed, reloading...");
					try {
						const result = await parseAndOrganize(sampleCssPath);
						await writeFile(
							resolve(apiDir, "variables.json"),
							JSON.stringify(result.organized, null, 2),
							"utf8",
						);
						server.ws.send({
							path: "*",
							type: "full-reload",
						});
						console.log(`✓ Reloaded (${result.totalVariables} variables)`);
					} catch (error) {
						console.error("Error reloading:", error);
					}
				});
			},
			name: "watch-sample-css",
		},
	],
	server: {
		open: true,
	},
});

await server.listen();

const url = `http://localhost:${server.config.server.port}`;
console.log(`\n✓ Server started at ${url}`);
console.log("👀 Watching for changes...");
console.log("   dev/sample.css");
console.log("   src/ui/**");
console.log("\nPress Ctrl+C to stop\n");

process.on("SIGINT", async () => {
	console.log("\n\n👋 Shutting down...");
	await server.close();
	process.exit(0);
});
