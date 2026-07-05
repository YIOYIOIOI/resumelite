// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalExperienceApiHandler } from "./api.server";
import { createFileExperienceRepository } from "./file-store.server";

describe("local experience API handler", () => {
	let tempDir: string;
	let idCounter: number;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "rr-experience-api-"));
		idCounter = 0;
	});

	afterEach(async () => {
		await rm(tempDir, { force: true, recursive: true });
	});

	const createHandler = () =>
		createLocalExperienceApiHandler(
			createFileExperienceRepository({
				filePath: join(tempDir, "experiences.json"),
				now: () => new Date("2026-06-30T12:00:00.000Z"),
				randomId: () => `experience_api_${++idCounter}`,
			}),
		);

	it("creates and reads experiences through the local API", async () => {
		const handler = createHandler();

		const created = await handler({
			body: { name: "API Experience", slug: "api-experience", tags: ["api"] },
			method: "POST",
			pathname: "/api/local/experiences",
			query: new URLSearchParams(),
		});

		expect(created.status).toBe(201);
		expect(created.body).toMatchObject({ id: "experience_api_1", name: "API Experience" });

		const read = await handler({
			method: "GET",
			pathname: "/api/local/experiences/experience_api_1",
			query: new URLSearchParams(),
		});

		expect(read.status).toBe(200);
		expect(read.body).toMatchObject({ id: "experience_api_1", slug: "api-experience" });
	});

	it("lists filtered experiences and serves nested tags without treating 'tags' as an id", async () => {
		const handler = createHandler();

		await handler({
			body: { name: "Tagged", slug: "tagged", tags: ["oss"] },
			method: "POST",
			pathname: "/api/local/experiences",
			query: new URLSearchParams(),
		});

		const listed = await handler({
			method: "GET",
			pathname: "/api/local/experiences",
			query: new URLSearchParams([["tags", "oss"]]),
		});
		expect(listed.status).toBe(200);
		expect(listed.body).toMatchObject([{ slug: "tagged" }]);

		const tags = await handler({
			method: "GET",
			pathname: "/api/local/experiences/tags",
			query: new URLSearchParams(),
		});
		expect(tags.status).toBe(200);
		expect(tags.body).toEqual(["oss"]);
	});

	it("rejects a malformed create body with 400", async () => {
		const handler = createHandler();

		const result = await handler({
			body: { name: 123, slug: "x", tags: [] },
			method: "POST",
			pathname: "/api/local/experiences",
			query: new URLSearchParams(),
		});

		expect(result.status).toBe(400);
		expect(result.body).toMatchObject({ error: "INVALID_REQUEST_BODY" });
	});
});
