// @vitest-environment node

import type { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalRequestHandler } from "./create-local-request-handler";

describe("createLocalRequestHandler", () => {
	let dataDir: string;
	let server: ReturnType<typeof createServer>;
	let base: string;

	beforeEach(async () => {
		dataDir = await mkdtemp(join(tmpdir(), "rr-local-server-"));
		const { handle } = createLocalRequestHandler({ dataDir });
		server = createServer((req, res) => {
			handle(req, res, () => {
				res.statusCode = 404;
				res.end("not found");
			});
		});
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(dataDir, { force: true, recursive: true });
	});

	it("routes resume + experience API and falls through for unrelated paths", async () => {
		const created = await fetch(`${base}/api/local/resumes`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Desktop", slug: "desktop", tags: [] }),
		});
		expect(created.status).toBe(201);

		const experiences = await fetch(`${base}/api/local/experiences`);
		expect(experiences.status).toBe(200);
		expect(await experiences.json()).toEqual([]);

		const other = await fetch(`${base}/anything-else`);
		expect(other.status).toBe(404);
	});
});
