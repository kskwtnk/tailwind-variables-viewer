/**
 * Shared UI build logic
 * Used by both build-ui.ts and dev-watch.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export interface BuildUIOptions {
	projectRoot: string;
	verbose?: boolean;
}

export async function buildUI(options: BuildUIOptions): Promise<boolean> {
	const { projectRoot, verbose = true } = options;

	if (verbose) {
		console.log("Building UI with Bun.build...");
	}

	try {
		// Build TypeScript/JavaScript
		const result = await Bun.build({
			entrypoints: [resolve(projectRoot, "src/ui/app.ts")],
			minify: true,
			naming: "[name]-[hash].[ext]",
			outdir: resolve(projectRoot, "dist/ui/assets"),
			sourcemap: "external",
			target: "browser",
		});

		if (!result.success) {
			console.error("Build failed:");
			for (const message of result.logs) {
				console.error(message);
			}
			return false;
		}

		if (verbose) {
			console.log(`✓ Built ${result.outputs.length} file(s)`);
		}

		// Get the built filenames
		const jsOutput = result.outputs.find(
			(o) => o.path.endsWith(".js") && !o.path.endsWith(".map"),
		);
		const cssOutput = result.outputs.find(
			(o) => o.path.endsWith(".css") && !o.path.endsWith(".map"),
		);

		if (!jsOutput) {
			console.error("No JS output found");
			return false;
		}

		const jsFilename = basename(jsOutput.path);
		const cssFilename = cssOutput ? basename(cssOutput.path) : null;

		if (verbose) {
			console.log(`✓ Built JS: ${jsFilename}`);
			if (cssFilename) {
				console.log(`✓ Built CSS: ${cssFilename}`);
			}
		}

		// Copy static files
		const distUiDir = resolve(projectRoot, "dist/ui");
		mkdirSync(distUiDir, { recursive: true });

		// Copy and update HTML with correct JS/CSS paths
		let html = readFileSync(resolve(projectRoot, "src/ui/index.html"), "utf-8");
		html = html.replace("/app.ts", `/assets/${jsFilename}`);

		// Add CSS link if CSS was built
		if (cssFilename) {
			html = html.replace(
				"</head>",
				`  <link rel="stylesheet" href="/assets/${cssFilename}">\n</head>`,
			);
		}

		writeFileSync(resolve(distUiDir, "index.html"), html);
		if (verbose) {
			console.log("✓ Copied and updated index.html");
		}

		// Create API directory
		mkdirSync(resolve(distUiDir, "api"), { recursive: true });

		if (verbose) {
			console.log("✓ UI build complete");
		}

		return true;
	} catch (error) {
		console.error("Build error:", error);
		return false;
	}
}
