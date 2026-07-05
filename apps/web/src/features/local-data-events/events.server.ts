import type { ServerResponse } from "node:http";

export type LocalDataResource = "resumes" | "experiences";

// Only the two canonical data files trigger a reload; the hardened store's
// .bak / .tmp side files and anything else are ignored.
export function resolveChangedResource(filename: string | null): LocalDataResource | null {
	if (filename === "resumes.json") return "resumes";
	if (filename === "experiences.json") return "experiences";
	return null;
}

export type SseHub = {
	add: (response: ServerResponse) => void;
	remove: (response: ServerResponse) => void;
	broadcast: (resource: LocalDataResource) => void;
	readonly size: number;
};

export function createSseHub(): SseHub {
	const clients = new Set<ServerResponse>();

	return {
		add: (response) => {
			clients.add(response);
		},
		remove: (response) => {
			clients.delete(response);
		},
		broadcast: (resource) => {
			const frame = `data: ${JSON.stringify({ resource })}\n\n`;
			for (const response of clients) response.write(frame);
		},
		get size() {
			return clients.size;
		},
	};
}

export function createSseHandler(hub: SseHub) {
	return (_request: unknown, response: ServerResponse): void => {
		response.statusCode = 200;
		response.setHeader("Content-Type", "text/event-stream");
		response.setHeader("Cache-Control", "no-cache, no-transform");
		response.setHeader("Connection", "keep-alive");
		response.write(": connected\n\n");

		hub.add(response);
		response.on("close", () => hub.remove(response));
	};
}
