import type { ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";

const contentTypes: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".map": "application/json",
	".webmanifest": "application/manifest+json",
};

// Serves the built web app (dist) for the Electron host: real files by path, and the
// SPA shell (index.html) for any non-file route so TanStack Router handles it client-side.
export function createStaticFileServer(options: { rootDir: string }) {
	const rootDir = resolve(options.rootDir);
	const indexHtmlPath = join(rootDir, "index.html");

	const sendFile = (filePath: string, response: ServerResponse): void => {
		response.statusCode = 200;
		response.setHeader("Content-Type", contentTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream");
		createReadStream(filePath).pipe(response);
	};

	const serve = (pathname: string, response: ServerResponse): void => {
		const decoded = decodeURIComponent(pathname);
		const candidate = resolve(rootDir, `.${decoded}`);
		const inside = candidate === rootDir || candidate.startsWith(`${rootDir}${sep}`);

		if (inside && existsSync(candidate) && statSync(candidate).isFile()) {
			sendFile(candidate, response);
			return;
		}

		// SPA fallback: any non-file route (or a traversal attempt) renders the app shell.
		sendFile(indexHtmlPath, response);
	};

	return { serve };
}
