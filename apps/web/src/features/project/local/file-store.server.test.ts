// @vitest-environment node

import type { ExperienceData } from "@resumelite/schema/project/data";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultExperienceData } from "@resumelite/schema/project/default";
import { createFileExperienceRepository } from "./file-store.server";

function experienceData(overrides: Partial<ExperienceData> = {}): ExperienceData {
	return { ...structuredClone(defaultExperienceData), ...overrides };
}

describe("file experience repository", () => {
	let tempDir: string;
	let filePath: string;
	let now: Date;
	let idCounter: number;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "rr-experience-store-"));
		filePath = join(tempDir, "experiences.json");
		now = new Date("2026-06-30T12:00:00.000Z");
		idCounter = 0;
	});

	afterEach(async () => {
		await rm(tempDir, { force: true, recursive: true });
	});

	const createRepository = () =>
		createFileExperienceRepository({
			filePath,
			now: () => now,
			randomId: () => `experience_test_${++idCounter}`,
		});

	it("stores a new experience in a JSON file independent of the resumes store", async () => {
		const repository = createRepository();

		const created = await repository.create({
			name: "Checkout rebuild",
			slug: "checkout-rebuild",
			tags: ["work"],
			data: experienceData({ title: "Checkout rebuild", techStack: ["TypeScript"] }),
		});
		created.data.title = "changed outside store";

		const stored = await repository.getById(created.id);
		const raw = JSON.parse(await readFile(filePath, "utf8")) as { experiences: Array<{ id: string }> };

		expect(raw.experiences.map((experience) => experience.id)).toEqual(["experience_test_1"]);
		expect(stored?.data.title).toBe("Checkout rebuild");
		expect(stored?.data.techStack).toEqual(["TypeScript"]);
		expect(stored?.createdAt).toEqual(new Date("2026-06-30T12:00:00.000Z"));
	});

	it("updates, lists, duplicates, deletes, and enforces slug uniqueness from the same file", async () => {
		const repository = createRepository();
		const created = await repository.create({ name: "Source", slug: "source", tags: ["a"] });

		now = new Date("2026-06-30T12:01:00.000Z");
		const updated = await repository.update(created.id, {
			data: experienceData({ title: "Ada" }),
			tags: ["a", "shared"],
		});
		const duplicate = await repository.duplicate(updated.id, { name: "Copy", slug: "copy", tags: ["b"] });

		expect(updated.data.title).toBe("Ada");
		expect(updated.updatedAt).toEqual(new Date("2026-06-30T12:01:00.000Z"));
		expect(duplicate.data).toEqual(updated.data);
		expect((await repository.list({ tags: ["a"], sort: "name" })).map((e) => e.slug)).toEqual(["source"]);
		expect(await repository.listTags()).toEqual(["a", "b", "shared"]);

		await expect(repository.create({ name: "Dupe slug", slug: "source", tags: [] })).rejects.toThrow(
			"EXPERIENCE_SLUG_ALREADY_EXISTS",
		);

		await repository.delete(updated.id);
		expect(await repository.getById(updated.id)).toBeNull();
		expect((await repository.getById(duplicate.id))?.name).toBe("Copy");
	});

	it("recovers from the backup file when experiences.json becomes unreadable", async () => {
		const repository = createRepository();
		const first = await repository.create({ name: "First", slug: "first", tags: [] });
		// The second write copies the last-known-good file to experiences.json.bak.
		await repository.create({ name: "Second", slug: "second", tags: [] });

		await writeFile(filePath, "{ not valid json", "utf8");

		const recovered = createRepository();
		const list = await recovered.list({ tags: [], sort: "name" });

		expect(list.map((e) => e.slug)).toEqual(["first"]);
		expect((await recovered.getById(first.id))?.name).toBe("First");
	});

	it("skips (does not silently coerce) an experience with a structurally invalid payload", async () => {
		const repository = createRepository();
		await repository.create({ name: "Good", slug: "good", tags: [] });

		// Corrupt the single record's techStack to a non-array on disk.
		const parsed = JSON.parse(await readFile(filePath, "utf8")) as {
			version: number;
			experiences: Array<{ data: { techStack: unknown } }>;
		};
		parsed.experiences[0].data.techStack = "not-an-array";
		await writeFile(filePath, JSON.stringify(parsed), "utf8");

		const repositoryAfter = createRepository();
		expect(await repositoryAfter.list({ tags: [], sort: "name" })).toEqual([]);
	});
});
