// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalResumeApiHandler } from "./api.server";
import { createFileResumeRepository } from "./file-store.server";

describe("local resume API handler", () => {
	let tempDir: string;
	let idCounter: number;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "rr-api-"));
		idCounter = 0;
	});

	afterEach(async () => {
		await rm(tempDir, { force: true, recursive: true });
	});

	const createHandler = () =>
		createLocalResumeApiHandler(
			createFileResumeRepository({
				filePath: join(tempDir, "resumes.json"),
				now: () => new Date("2026-06-30T12:00:00.000Z"),
				randomId: () => `local_api_${++idCounter}`,
			}),
		);

	it("creates and reads resumes through a local API backed by the same file", async () => {
		const handler = createHandler();

		const created = await handler({
			body: { name: "API Resume", slug: "api-resume", tags: ["api"] },
			method: "POST",
			pathname: "/api/local/resumes",
			query: new URLSearchParams(),
		});

		expect(created.status).toBe(201);
		expect(created.body).toMatchObject({ id: "local_api_1", name: "API Resume" });

		const read = await handler({
			method: "GET",
			pathname: "/api/local/resumes/local_api_1",
			query: new URLSearchParams(),
		});

		expect(read.status).toBe(200);
		expect(read.body).toMatchObject({ id: "local_api_1", slug: "api-resume" });
	});

	it("imports backups and lists filtered resumes", async () => {
		const handler = createHandler();

		await handler({
			body: {
				version: 1,
				resumes: [
					{
						id: "local_imported",
						name: "Imported",
						slug: "imported",
						tags: ["xhs"],
						data: { basics: { name: "", headline: "" }, metadata: { template: "azurill" } },
						isLocked: false,
						createdAt: "2026-06-30T11:00:00.000Z",
						updatedAt: "2026-06-30T11:00:00.000Z",
					},
				],
			},
			method: "POST",
			pathname: "/api/local/resumes/import",
			query: new URLSearchParams(),
		});

		const listed = await handler({
			method: "GET",
			pathname: "/api/local/resumes",
			query: new URLSearchParams([["tags", "xhs"]]),
		});

		expect(listed.status).toBe(200);
		expect(listed.body).toMatchObject([{ id: "local_imported", name: "Imported" }]);
	});
});
