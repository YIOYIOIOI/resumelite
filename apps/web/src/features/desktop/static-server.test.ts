// @vitest-environment node

import type { AddressInfo } from "node:net";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStaticFileServer } from "./static-server";

describe("createStaticFileServer", () => {
	let rootDir: string;
	let server: ReturnType<typeof createServer>;
	let base: string;

	beforeEach(async () => {
		rootDir = await mkdtemp(join(tmpdir(), "rr-static-"));
		await writeFile(join(rootDir, "index.html"), "<!doctype html><title>App</title>", "utf8");
		await mkdir(join(rootDir, "assets"), { recursive: true });
		await writeFile(join(rootDir, "assets", "app.js"), "console.log('hi')", "utf8");

		const { serve } = createStaticFileServer({ rootDir });
		server = createServer((req, res) => serve(new URL(req.url ?? "/", "http://x").pathname, res));
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterEach(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		await rm(rootDir, { force: true, recursive: true });
	});

	it("serves an existing asset with the right content-type", async () => {
		const response = await fetch(`${base}/assets/app.js`);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("javascript");
		expect(await response.text()).toBe("console.log('hi')");
	});

	it("falls back to index.html for unknown SPA routes", async () => {
		const response = await fetch(`${base}/dashboard/experiences`);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(await response.text()).toContain("<title>App</title>");
	});

	it("does not escape the root on traversal (serves index.html instead)", async () => {
		const response = await fetch(`${base}/../../../etc/hosts`);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain("<title>App</title>");
	});
});
