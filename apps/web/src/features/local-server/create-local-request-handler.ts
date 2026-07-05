import type { IncomingMessage, ServerResponse } from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync, watch } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { createSseHandler, createSseHub, resolveChangedResource } from "../local-data-events/events.server";
import { createLocalExperienceApiHandler } from "../project/local/api.server";
import { createFileExperienceRepository } from "../project/local/file-store.server";
import { createLocalResumeApiHandler } from "../resume/local/api.server";
import { createFileResumeRepository } from "../resume/local/file-store.server";

const uploadContentTypes: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

export type LocalRequestHandler = {
	handle: (request: IncomingMessage, response: ServerResponse, next: () => void) => void;
};

// The local persistence "backend" as a framework-agnostic Connect-style handler, so both
// the Vite dev/preview middleware and the Electron main process can host it from one place.
export function createLocalRequestHandler(options: { dataDir: string }): LocalRequestHandler {
	const resumesPath = resolve(options.dataDir, "local", "resumes.json");
	const experiencesPath = resolve(options.dataDir, "local", "experiences.json");
	const uploadsRoot = resolve(options.dataDir, "uploads");
	const localDataDir = dirname(resumesPath);

	const resumeApiHandler = createLocalResumeApiHandler(createFileResumeRepository({ filePath: resumesPath }));
	const experienceApiHandler = createLocalExperienceApiHandler(
		createFileExperienceRepository({ filePath: experiencesPath }),
	);
	const liveEventsHub = createSseHub();
	const liveEventsSseHandler = createSseHandler(liveEventsHub);

	// Watch data/local and push SSE events so connected clients refresh on change.
	const debounce = new Map<string, ReturnType<typeof setTimeout>>();
	try {
		mkdirSync(localDataDir, { recursive: true });
		watch(localDataDir, (_event, filename) => {
			const resource = resolveChangedResource(typeof filename === "string" ? filename : null);
			if (!resource) return;
			clearTimeout(debounce.get(resource));
			debounce.set(
				resource,
				setTimeout(() => liveEventsHub.broadcast(resource), 150),
			);
		});
	} catch {
		// data/local may be unwatchable in some environments; live-reload is best-effort.
	}

	const isInsideUploadsRoot = (filePath: string) =>
		filePath === uploadsRoot || filePath.startsWith(`${uploadsRoot}${sep}`);

	const handleApiRequest = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> => {
		const relativeSegments = url.pathname.slice("/api/local".length).split("/").filter(Boolean);
		const apiHandler = relativeSegments[0] === "experiences" ? experienceApiHandler : resumeApiHandler;

		try {
			const result = await apiHandler({
				body: await readJsonRequestBody(request),
				method: request.method ?? "GET",
				pathname: url.pathname,
				query: url.searchParams,
			});

			response.statusCode = result.status;
			if (result.body === undefined) {
				response.end();
				return;
			}

			response.setHeader("Content-Type", "application/json; charset=utf-8");
			response.end(JSON.stringify(result.body));
		} catch (error) {
			response.statusCode = 500;
			response.setHeader("Content-Type", "application/json; charset=utf-8");
			response.end(JSON.stringify({ error: error instanceof Error ? error.message : "UNKNOWN_ERROR" }));
		}
	};

	const handle = (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
		const url = request.url ? new URL(request.url, "http://localhost") : null;
		if (!url) {
			next();
			return;
		}

		if (url.pathname.startsWith("/api/local")) {
			if (url.pathname === "/api/local/events") {
				liveEventsSseHandler(request, response);
				return;
			}
			void handleApiRequest(request, response, url);
			return;
		}

		if (url.pathname.startsWith("/uploads/")) {
			const relativePath = decodeURIComponent(url.pathname.slice("/uploads/".length));
			const filePath = resolve(uploadsRoot, relativePath);
			if (!isInsideUploadsRoot(filePath) || !existsSync(filePath) || !statSync(filePath).isFile()) {
				next();
				return;
			}
			response.statusCode = 200;
			response.setHeader(
				"Content-Type",
				uploadContentTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
			);
			createReadStream(filePath).pipe(response);
			return;
		}

		next();
	};

	return { handle };
}

function readJsonRequestBody(request: IncomingMessage): Promise<unknown> {
	if (request.method === "GET" || request.method === "HEAD" || request.method === "DELETE")
		return Promise.resolve(undefined);

	return new Promise((resolve, reject) => {
		let body = "";
		request.setEncoding("utf8");
		request.on("data", (chunk: string) => {
			body += chunk;
		});
		request.on("end", () => {
			if (!body.trim()) {
				resolve(undefined);
				return;
			}
			try {
				resolve(JSON.parse(body));
			} catch (error) {
				reject(error);
			}
		});
		request.on("error", reject);
	});
}
