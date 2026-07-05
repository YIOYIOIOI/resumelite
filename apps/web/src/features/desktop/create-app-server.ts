import type { IncomingMessage, ServerResponse } from "node:http";
import { createLocalRequestHandler } from "../local-server/create-local-request-handler";
import { createStaticFileServer } from "./static-server";

// One request listener for the Electron-hosted HTTP server: the local API/uploads/SSE
// handler first, then the static dist/ (with SPA fallback) for everything else.
export function createAppRequestListener(options: { dataDir: string; distDir: string }) {
	const local = createLocalRequestHandler({ dataDir: options.dataDir });
	const staticFiles = createStaticFileServer({ rootDir: options.distDir });

	return (request: IncomingMessage, response: ServerResponse): void => {
		local.handle(request, response, () => {
			const url = request.url ? new URL(request.url, "http://localhost") : null;
			staticFiles.serve(url?.pathname ?? "/", response);
		});
	};
}
