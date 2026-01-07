import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
	OrganizedVariables,
	ServerOptions,
	ServerResult,
} from "./types.js";

/**
 * Start HTTP server with static file serving and JSON API
 * Uses Node.js standard APIs for compatibility with both Node.js and Bun
 *
 * @param organizedVariables - Organized theme variables to serve via API
 * @param options - Server options (port, etc.)
 * @returns Server instance, actual port, and URL
 */
export async function startServer(
	organizedVariables: OrganizedVariables,
	options: ServerOptions = {},
): Promise<ServerResult> {
	const port = options.port || 3000;

	// Get the directory where the CLI is installed (inside node_modules)
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	// Go up two levels: core -> dist -> package root
	const packageRoot = resolve(__dirname, "..", "..");
	const distUiDir = resolve(packageRoot, "dist", "ui");
	const apiDir = resolve(distUiDir, "api");

	// Write variables as static JSON file in dist/ui/api/
	await mkdir(apiDir, { recursive: true });
	await writeFile(
		resolve(apiDir, "variables.json"),
		JSON.stringify(organizedVariables, null, 2),
		"utf8",
	);

	// Create HTTP server using Node.js standard API
	const server = createServer(async (req, res) => {
		if (!req.url) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Bad Request");
			return;
		}
		const url = new URL(req.url, `http://${req.headers.host}`);

		// API endpoint
		if (url.pathname === "/api/variables.json") {
			res.writeHead(200, {
				"Cache-Control": "no-cache",
				"Content-Type": "application/json",
			});
			res.end(JSON.stringify(organizedVariables, null, 2));
			return;
		}

		// Static file serving
		try {
			const filePath =
				url.pathname === "/"
					? resolve(distUiDir, "index.html")
					: resolve(distUiDir, url.pathname.slice(1));

			const content = await readFile(filePath);
			const contentType = getContentType(extname(filePath));

			res.writeHead(200, {
				"Cache-Control": "public, max-age=3600",
				"Content-Type": contentType,
			});
			res.end(content);
		} catch {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Not Found");
		}
	});

	// Automatic port search if specified port is in use
	let actualPort = port;
	let retries = 10;

	const tryListen = (): Promise<number> => {
		return new Promise((resolve, reject) => {
			server.once("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "EADDRINUSE" && retries > 0) {
					retries--;
					actualPort++;
					console.log(
						`Port ${actualPort - 1} is in use, trying another one...`,
					);
					server.close();
					setTimeout(() => tryListen().then(resolve).catch(reject), 100);
				} else {
					reject(err);
				}
			});

			server.listen(actualPort, () => {
				resolve(actualPort);
			});
		});
	};

	actualPort = await tryListen();

	return {
		port: actualPort,
		server,
		url: `http://localhost:${actualPort}`,
	};
}

/**
 * Get MIME type based on file extension
 */
function getContentType(ext: string): string {
	const types: Record<string, string> = {
		".css": "text/css; charset=utf-8",
		".gif": "image/gif",
		".html": "text/html; charset=utf-8",
		".ico": "image/x-icon",
		".jpeg": "image/jpeg",
		".jpg": "image/jpeg",
		".js": "application/javascript; charset=utf-8",
		".json": "application/json; charset=utf-8",
		".png": "image/png",
		".svg": "image/svg+xml",
	};
	return types[ext] || "application/octet-stream";
}
