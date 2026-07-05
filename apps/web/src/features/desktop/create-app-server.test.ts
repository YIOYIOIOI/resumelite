// @vitest-environment node

import type { AddressInfo } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAppRequestListener } from "./create-app-server";

describe("createAppRequestListener", () => {
	let dataDir: string;
	let distDir: string;
	let server: ReturnType<typeof createServer>;
	let base: string;

	beforeEach(async () => {
		dataDir = await mkdtemp(join(tmpdir(), "rr-app-data-"));
		distDir = await mkdtemp(join(tmpdir(), "rr-app-dist-"));
		await writeFile(join(distDir, "index.html"), "<!doctype html><title>App Shell</title>", "utf8");

		const listener = createAppRequestListener({ dataDir, distDir });
		server = createServer(listener);
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(dataDir, { force: true, recursive: true });
		await rm(distDir, { force: true, recursive: true });
	});

	it("serves the API and the SPA shell from one listener", async () => {
		const created = await fetch(`${base}/api/local/resumes`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Desk", slug: "desk", tags: [] }),
		});
		expect(created.status).toBe(201);

		const spa = await fetch(`${base}/dashboard/resumes`);
		expect(spa.status).toBe(200);
		expect(await spa.text()).toContain("<title>App Shell</title>");
	});
});
