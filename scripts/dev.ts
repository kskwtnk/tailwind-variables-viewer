#!/usr/bin/env bun

/**
 * Development mode with watch and server
 * Watches UI files, rebuilds on changes, and runs CLI server
 */

import { type ChildProcess, spawn } from "node:child_process";
import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildUI } from "./lib/ui-builder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const watchDir = resolve(projectRoot, "src/ui");

let serverProcess: ChildProcess | null = null;

// Build CLI
async function buildCLI(): Promise<boolean> {
	return new Promise((resolve) => {
		const build = spawn("bun", ["run", "build:cli"], {
			cwd: projectRoot,
			stdio: "inherit",
		});

		build.on("close", (code) => {
			resolve(code === 0);
		});
	});
}

// Start CLI server
async function startServer(openBrowser: boolean = false): Promise<void> {
	if (serverProcess) {
		serverProcess.kill("SIGTERM");
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	const args = ["dist/cli/index.js", "-c", "dev/sample.css"];
	if (openBrowser) {
		args.push("-o");
	}

	serverProcess = spawn("node", args, {
		cwd: projectRoot,
		stdio: "inherit",
	});

	serverProcess.on("error", (err) => {
		console.error("Server error:", err);
	});
}

// Initial build and start
console.log("👀 Starting development mode...\n");

const uiBuildSuccess = await buildUI({ projectRoot, verbose: true });
if (!uiBuildSuccess) {
	console.error("UI build failed");
	process.exit(1);
}

console.log("");
const cliBuildSuccess = await buildCLI();
if (!cliBuildSuccess) {
	console.error("CLI build failed");
	process.exit(1);
}

console.log("");
await startServer(true); // Open browser on first start

// Wait for server to start before watching
await new Promise((resolve) => setTimeout(resolve, 1000));

console.log("\n👀 Watching for changes in src/ui/...");
console.log("   (Server will NOT restart on UI changes)\n");

// Watch for file changes
const watcher = watch(watchDir, { recursive: true }, async (filename) => {
	if (
		filename &&
		(filename.endsWith(".ts") ||
			filename.endsWith(".css") ||
			filename.endsWith(".html"))
	) {
		console.log(`\n🔄 File changed: ${filename}`);

		const success = await buildUI({ projectRoot, verbose: true });
		if (success) {
			console.log("✓ Rebuild complete");
			console.log("   Refresh your browser to see changes\n");
			console.log("👀 Watching for changes...");
		} else {
			console.error("Build failed, watching continues...");
		}
	}
});

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\n\n🛑 Shutting down...");
	watcher.close();

	if (serverProcess) {
		serverProcess.kill("SIGTERM");
	}

	setTimeout(() => {
		process.exit(0);
	}, 500);
});
