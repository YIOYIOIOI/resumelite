// @vitest-environment happy-dom

import type { ResumeData } from "@resumelite/schema/resume/data";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@resumelite/schema/resume/default";
import {
	createLocalResume,
	deleteLocalResume,
	duplicateLocalResume,
	getLocalResumeById,
	importLocalResumeBackup,
	listLocalResumes,
	listLocalTags,
	updateLocalResume,
} from "./storage";
import { setupLocalResumeApiTestServer } from "./test-utils";

function cloneResumeData(data: ResumeData): ResumeData {
	return structuredClone(data);
}

describe("local resume storage", () => {
	let cleanupLocalResumeApi: () => Promise<void>;

	beforeEach(async () => {
		cleanupLocalResumeApi = await setupLocalResumeApiTestServer({ idPrefix: "local_client" });
		localStorage.clear();
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-06-30T12:00:00.000Z"));
	});

	afterEach(async () => {
		vi.useRealTimers();
		await cleanupLocalResumeApi();
	});

	it("starts with no resumes", async () => {
		expect(await listLocalResumes({ tags: [], sort: "lastUpdatedAt" })).toEqual([]);
		expect(await listLocalTags()).toEqual([]);
	});

	it("creates a resume with cloned default data", async () => {
		const created = await createLocalResume({ name: "Local Resume", slug: "local-resume", tags: ["local"] });
		created.data.basics.name = "Changed outside store";

		const stored = await getLocalResumeById(created.id);
		expect(stored?.name).toBe("Local Resume");
		expect(stored?.slug).toBe("local-resume");
		expect(stored?.tags).toEqual(["local"]);
		expect(stored?.data.basics.name).toBe(defaultResumeData.basics.name);
		expect(stored?.createdAt).toEqual(new Date("2026-06-30T12:00:00.000Z"));
		expect(stored?.updatedAt).toEqual(new Date("2026-06-30T12:00:00.000Z"));
	});

	it("updates resume data and updatedAt", async () => {
		const created = await createLocalResume({ name: "Local Resume", slug: "local-resume", tags: [] });
		const nextData = cloneResumeData(created.data);
		nextData.basics.name = "Ada Lovelace";

		vi.setSystemTime(new Date("2026-06-30T12:01:00.000Z"));
		const updated = await updateLocalResume(created.id, { data: nextData });

		expect(updated.data.basics.name).toBe("Ada Lovelace");
		expect(updated.updatedAt).toEqual(new Date("2026-06-30T12:01:00.000Z"));
		expect((await getLocalResumeById(created.id))?.data.basics.name).toBe("Ada Lovelace");
	});

	it("lists sorted resumes and tags", async () => {
		await createLocalResume({ name: "Beta", slug: "beta", tags: ["b", "shared"] });
		vi.setSystemTime(new Date("2026-06-30T12:01:00.000Z"));
		await createLocalResume({ name: "Alpha", slug: "alpha", tags: ["a", "shared"] });

		expect((await listLocalResumes({ tags: [], sort: "name" })).map((resume) => resume.name)).toEqual([
			"Alpha",
			"Beta",
		]);
		expect((await listLocalResumes({ tags: ["a"], sort: "name" })).map((resume) => resume.slug)).toEqual(["alpha"]);
		expect((await listLocalResumes({ tags: [], sort: "lastUpdatedAt" })).map((resume) => resume.name)).toEqual([
			"Alpha",
			"Beta",
		]);
		expect(await listLocalTags()).toEqual(["a", "b", "shared"]);
	});

	it("duplicates and deletes resumes", async () => {
		const created = await createLocalResume({ name: "Source", slug: "source", tags: ["x"] });
		const duplicate = await duplicateLocalResume(created.id, { name: "Copy", slug: "copy", tags: ["y"] });

		expect(duplicate.id).not.toBe(created.id);
		expect(duplicate.data).toEqual(created.data);
		expect((await listLocalResumes({ tags: [], sort: "name" })).map((resume) => resume.name)).toEqual([
			"Copy",
			"Source",
		]);

		await deleteLocalResume(created.id);
		expect(await getLocalResumeById(created.id)).toBeNull();
		expect((await getLocalResumeById(duplicate.id))?.name).toBe("Copy");
	});

	it("blocks updates and deletes for locked resumes", async () => {
		const created = await createLocalResume({ name: "Locked", slug: "locked", tags: [] });
		const locked = await updateLocalResume(created.id, { isLocked: true });

		await expect(updateLocalResume(locked.id, { name: "Edited" })).rejects.toThrow("RESUME_LOCKED");
		await expect(deleteLocalResume(locked.id)).rejects.toThrow("RESUME_LOCKED");
		expect((await getLocalResumeById(locked.id))?.name).toBe("Locked");

		const unlocked = await updateLocalResume(locked.id, { isLocked: false });
		expect(unlocked.isLocked).toBe(false);
		await expect(updateLocalResume(unlocked.id, { name: "Edited" })).resolves.toMatchObject({ name: "Edited" });
	});

	it("stores new resumes durably through the local API", async () => {
		const created = await createLocalResume({ name: "Durable", slug: "durable", tags: [] });

		expect((await getLocalResumeById(created.id))?.name).toBe("Durable");
		expect(fetch).toHaveBeenCalled();
	});

	it("imports local resume backups with metadata intact", async () => {
		const importedData = cloneResumeData(defaultResumeData);
		importedData.basics.name = "Grace Hopper";
		importedData.metadata.template = "ai-product";
		importedData.picture.url = "/uploads/019f1812-97e7-773e-9432-6f8c579e48bb/pictures/ai-product-resume-portrait.webp";

		const imported = await importLocalResumeBackup({
			version: 1,
			exportedAt: "2026-07-01T00:00:00.000Z",
			resumes: [
				{
					id: "aa045667-5b2f-4aca-8f75-dc4bc7ee19f1",
					name: "Grace Hopper Resume",
					slug: "grace-hopper",
					tags: ["legacy", "navy"],
					data: importedData,
					isLocked: false,
					createdAt: "2026-06-30T11:07:45.016Z",
					updatedAt: "2026-06-30T11:30:03.729Z",
				},
			],
		});

		expect(imported).toHaveLength(1);
		expect(imported[0]).toMatchObject({
			id: "aa045667-5b2f-4aca-8f75-dc4bc7ee19f1",
			name: "Grace Hopper Resume",
			slug: "grace-hopper",
			tags: ["legacy", "navy"],
		});
		expect(imported[0]?.createdAt).toEqual(new Date("2026-06-30T11:07:45.016Z"));
		expect(imported[0]?.updatedAt).toEqual(new Date("2026-06-30T11:30:03.729Z"));
		expect((await getLocalResumeById("aa045667-5b2f-4aca-8f75-dc4bc7ee19f1"))?.data.basics.name).toBe("Grace Hopper");
		expect((await getLocalResumeById("aa045667-5b2f-4aca-8f75-dc4bc7ee19f1"))?.data.metadata.template).toBe(
			"ai-product",
		);
		expect((await getLocalResumeById("aa045667-5b2f-4aca-8f75-dc4bc7ee19f1"))?.data.picture.url).toBe(
			"/uploads/019f1812-97e7-773e-9432-6f8c579e48bb/pictures/ai-product-resume-portrait.png",
		);
		expect((await listLocalResumes({ tags: ["legacy"], sort: "name" })).map((resume) => resume.slug)).toEqual([
			"grace-hopper",
		]);
	});

	it("renames imported backup slugs that conflict with existing resumes", async () => {
		await createLocalResume({ name: "Existing", slug: "shared-slug", tags: [] });

		const [imported] = await importLocalResumeBackup({
			version: 1,
			resumes: [
				{
					id: "legacy-id",
					name: "Imported",
					slug: "shared-slug",
					tags: [],
					data: defaultResumeData,
					isLocked: false,
					createdAt: "2026-06-30T11:07:45.016Z",
					updatedAt: "2026-06-30T11:30:03.729Z",
				},
			],
		});

		expect(imported?.slug).toBe("shared-slug-2");
		expect((await listLocalResumes({ tags: [], sort: "name" })).map((resume) => resume.slug).sort()).toEqual([
			"shared-slug",
			"shared-slug-2",
		]);
	});

	it("returns empty results when no resumes are stored", async () => {
		expect(await listLocalResumes({ tags: [], sort: "name" })).toEqual([]);
		expect(await getLocalResumeById("missing")).toBeNull();
	});

	it("rejects invalid local resume backups", async () => {
		await expect(importLocalResumeBackup({ version: 2, resumes: [] })).rejects.toThrow("INVALID_LOCAL_RESUME_BACKUP");
		await expect(importLocalResumeBackup({ version: 1, resumes: [{ id: "missing-fields" }] })).rejects.toThrow(
			"INVALID_LOCAL_RESUME_BACKUP_ITEM:1",
		);
	});
});
