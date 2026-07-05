// @vitest-environment node

import type { ServerResponse } from "node:http";
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createSseHandler, createSseHub, resolveChangedResource } from "./events.server";

// Minimal ServerResponse fake: captures headers/writes and can emit "close".
function fakeResponse() {
	const emitter = new EventEmitter();
	const res = Object.assign(emitter, {
		statusCode: 0,
		headers: {} as Record<string, string>,
		setHeader(name: string, value: string) {
			this.headers[name.toLowerCase()] = value;
		},
		write: vi.fn(() => true),
	});
	return res as unknown as ServerResponse & {
		statusCode: number;
		headers: Record<string, string>;
		write: ReturnType<typeof vi.fn>;
	};
}

describe("resolveChangedResource", () => {
	it("maps the two data files and ignores everything else", () => {
		expect(resolveChangedResource("resumes.json")).toBe("resumes");
		expect(resolveChangedResource("experiences.json")).toBe("experiences");
		expect(resolveChangedResource("resumes.json.bak")).toBeNull();
		expect(resolveChangedResource("resumes.json.1234.abcd.tmp")).toBeNull();
		expect(resolveChangedResource(null)).toBeNull();
	});
});

describe("createSseHub", () => {
	it("broadcasts an SSE-framed event to every client and tracks size", () => {
		const hub = createSseHub();
		const a = fakeResponse();
		const b = fakeResponse();
		hub.add(a);
		hub.add(b);
		expect(hub.size).toBe(2);

		hub.broadcast("resumes");
		expect(a.write).toHaveBeenCalledWith('data: {"resource":"resumes"}\n\n');
		expect(b.write).toHaveBeenCalledWith('data: {"resource":"resumes"}\n\n');

		hub.remove(a);
		expect(hub.size).toBe(1);
		hub.broadcast("experiences");
		expect(a.write).toHaveBeenCalledTimes(1);
		expect(b.write).toHaveBeenLastCalledWith('data: {"resource":"experiences"}\n\n');
	});
});

describe("createSseHandler", () => {
	it("opens the stream, registers the client, and removes it on close", () => {
		const hub = createSseHub();
		const handler = createSseHandler(hub);
		const res = fakeResponse();

		handler({}, res);

		expect(res.statusCode).toBe(200);
		expect(res.headers["content-type"]).toBe("text/event-stream");
		expect(hub.size).toBe(1);

		(res as unknown as EventEmitter).emit("close");
		expect(hub.size).toBe(0);
	});
});
