// @vitest-environment node

import type { ResumeData } from "@resumelite/schema/resume/data";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultResumeData } from "@resumelite/schema/resume/default";
import { createFileResumeRepository } from "./file-store.server";

function cloneResumeData(data: ResumeData): ResumeData {
	return structuredClone(data);
}

describe("file resume repository", () => {
	let tempDir: string;
	let filePath: string;
	let now: Date;
	let idCounter: number;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "rr-file-store-"));
		filePath = join(tempDir, "resumes.json");
		now = new Date("2026-06-30T12:00:00.000Z");
		idCounter = 0;
	});

	afterEach(async () => {
		await rm(tempDir, { force: true, recursive: true });
	});

	const createRepository = () =>
		createFileResumeRepository({
			filePath,
			now: () => now,
			randomId: () => `local_test_${++idCounter}`,
		});

	it("stores new resumes in a JSON file that is independent of browser storage", async () => {
		const repository = createRepository();

		const created = await repository.create({ name: "Local Resume", slug: "local-resume", tags: ["local"] });
		created.data.basics.name = "Changed outside store";

		const stored = await repository.getById(created.id);
		const raw = JSON.parse(await readFile(filePath, "utf8")) as { resumes: Array<{ id: string }> };

		expect(raw.resumes.map((resume) => resume.id)).toEqual(["local_test_1"]);
		expect(stored?.data.basics.name).toBe(defaultResumeData.basics.name);
		expect(stored?.createdAt).toEqual(new Date("2026-06-30T12:00:00.000Z"));
	});

	it("updates, lists, duplicates, deletes, and enforces locks from the same file", async () => {
		const repository = createRepository();
		const created = await repository.create({ name: "Source", slug: "source", tags: ["a"] });
		const nextData = cloneResumeData(created.data);
		nextData.basics.name = "Ada Lovelace";

		now = new Date("2026-06-30T12:01:00.000Z");
		const updated = await repository.update(created.id, { data: nextData, tags: ["a", "shared"] });
		const duplicate = await repository.duplicate(updated.id, { name: "Copy", slug: "copy", tags: ["b"] });

		expect(updated.data.basics.name).toBe("Ada Lovelace");
		expect(updated.updatedAt).toEqual(new Date("2026-06-30T12:01:00.000Z"));
		expect(duplicate.data).toEqual(updated.data);
		expect((await repository.list({ tags: ["a"], sort: "name" })).map((resume) => resume.slug)).toEqual(["source"]);
		expect(await repository.listTags()).toEqual(["a", "b", "shared"]);

		await repository.update(updated.id, { isLocked: true });
		await expect(repository.update(updated.id, { name: "Edited" })).rejects.toThrow("RESUME_LOCKED");
		await expect(repository.delete(updated.id)).rejects.toThrow("RESUME_LOCKED");

		await repository.update(updated.id, { isLocked: false });
		await repository.delete(updated.id);
		expect(await repository.getById(updated.id)).toBeNull();
		expect((await repository.getById(duplicate.id))?.name).toBe("Copy");
	});

	it("imports backups by id and resolves slug conflicts", async () => {
		const repository = createRepository();
		await repository.create({ name: "Existing", slug: "shared-slug", tags: [] });

		const data = cloneResumeData(defaultResumeData);
		data.basics.name = "Grace Hopper";
		data.metadata.template = "ai-product";
		data.picture.url = "/uploads/example/pictures/ai-product-resume-portrait.webp";

		const imported = await repository.importBackup({
			version: 1,
			resumes: [
				{
					id: "legacy-id",
					name: "Imported",
					slug: "shared-slug",
					tags: ["legacy"],
					data,
					isLocked: false,
					createdAt: "2026-06-30T11:07:45.016Z",
					updatedAt: "2026-06-30T11:30:03.729Z",
				},
			],
		});

		expect(imported[0]).toMatchObject({ id: "legacy-id", slug: "shared-slug-2" });
		expect((await repository.getById("legacy-id"))?.data.picture.url).toBe(
			"/uploads/example/pictures/ai-product-resume-portrait.png",
		);
	});

	it("recovers from the backup file when resumes.json becomes unreadable", async () => {
		const repository = createRepository();
		const first = await repository.create({ name: "First", slug: "first", tags: [] });
		// The second write copies the last-known-good file to resumes.json.bak.
		await repository.create({ name: "Second", slug: "second", tags: [] });

		// Simulate a truncated/garbage write of the primary file after a crash.
		await writeFile(filePath, "{ not valid json", "utf8");

		const recovered = createRepository();
		const list = await recovered.list({ tags: [], sort: "name" });

		expect(list.map((resume) => resume.slug)).toEqual(["first"]);
		expect((await recovered.getById(first.id))?.name).toBe("First");
	});
});
