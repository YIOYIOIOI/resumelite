// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { createLocalResume, getLocalResumeById, updateLocalResume } from "../local/storage";
import { setupLocalResumeApiTestServer } from "../local/test-utils";
import { useResumeStore } from "./draft";

const toastMocks = vi.hoisted(() => ({
	dismiss: vi.fn(),
	error: vi.fn(() => "sync-error-toast"),
}));

vi.mock("sonner", () => ({
	toast: toastMocks,
}));

async function flushMicrotasks() {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

describe("builder resume autosave", () => {
	let cleanupLocalResumeApi: () => Promise<void>;

	beforeEach(async () => {
		cleanupLocalResumeApi = await setupLocalResumeApiTestServer({ idPrefix: "local_draft" });
		i18n.loadAndActivate({ locale: "en-US", messages: {} });
		toastMocks.dismiss.mockClear();
		toastMocks.error.mockClear();
		localStorage.clear();
		useResumeStore.getState().reset();
	});

	afterEach(async () => {
		useResumeStore.getState().reset();
		await cleanupLocalResumeApi();
	});

	it("saves local resume edits into durable local storage", async () => {
		const resume = await createLocalResume({ name: "Local Resume", slug: "local-resume", tags: ["local"] });
		useResumeStore.getState().initialize(resume);

		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Local Name";
		});

		await waitForAutosave();
		await flushMicrotasks();

		expect((await getLocalResumeById(resume.id))?.data.basics.name).toBe("Local Name");
		expect(useResumeStore.getState().resume?.data.basics.name).toBe("Local Name");
	});

	it("keeps only the latest rapid local edit", async () => {
		const resume = await createLocalResume({ name: "Rapid Resume", slug: "rapid-resume", tags: [] });
		useResumeStore.getState().initialize(resume);

		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "First Name";
		});
		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Latest Name";
		});

		await waitForAutosave();
		await flushMicrotasks();

		expect((await getLocalResumeById(resume.id))?.data.basics.name).toBe("Latest Name");
	});

	it("blocks edits when the local resume is locked", async () => {
		const resume = await createLocalResume({ name: "Locked Resume", slug: "locked-resume", tags: [] });
		const locked = await updateLocalResume(resume.id, { isLocked: true });
		useResumeStore.getState().initialize(locked);

		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.name = "Should Not Save";
		});

		await waitForAutosave();
		await flushMicrotasks();

		expect((await getLocalResumeById(resume.id))?.data.basics.name).toBe("");
		expect(toastMocks.error).toHaveBeenCalledWith("This resume is locked and cannot be updated.", {
			id: undefined,
		});
	});

	it("replaces the current draft when loader data is newer for the same resume", async () => {
		const resume = await createLocalResume({ name: "Loader Resume", slug: "loader-resume", tags: [] });
		const current = {
			...resume,
			data: structuredClone(resume.data),
			updatedAt: new Date(resume.updatedAt.getTime()),
		};
		current.data.basics.headline = "Original headline";

		const incoming = {
			...resume,
			data: structuredClone(resume.data),
			updatedAt: new Date(resume.updatedAt.getTime() + 1000),
		};
		incoming.data.basics.headline = "Imported headline";

		useResumeStore.getState().initialize(current);
		useResumeStore.getState().syncResumeFromLoader(incoming);

		expect(useResumeStore.getState().resume?.data.basics.headline).toBe("Imported headline");
	});

	it("replaces the current draft when loader data differs at the same timestamp", async () => {
		const resume = await createLocalResume({ name: "Normalized Resume", slug: "normalized-resume", tags: [] });
		const current = {
			...resume,
			data: structuredClone(resume.data),
		};
		current.data.basics.headline = "Current draft headline";

		const incoming = {
			...resume,
			data: structuredClone(resume.data),
		};
		incoming.data.basics.headline = "Loader headline";

		useResumeStore.getState().initialize(current);
		useResumeStore.getState().syncResumeFromLoader(incoming);

		expect(useResumeStore.getState().resume?.data.basics.headline).toBe("Loader headline");
	});

	it("does not replace a newer local draft with older loader data", async () => {
		const resume = await createLocalResume({ name: "Fresh Draft", slug: "fresh-draft", tags: [] });
		const current = {
			...resume,
			data: structuredClone(resume.data),
			updatedAt: new Date(resume.updatedAt.getTime() + 2000),
		};
		current.data.basics.headline = "当前编辑中的职位";

		const incoming = {
			...resume,
			data: structuredClone(resume.data),
			updatedAt: new Date(resume.updatedAt.getTime() + 1000),
		};
		incoming.data.basics.headline = "旧 loader 职位";

		useResumeStore.getState().initialize(current);
		useResumeStore.getState().syncResumeFromLoader(incoming);

		expect(useResumeStore.getState().resume?.data.basics.headline).toBe("当前编辑中的职位");
	});

	it("does not replace pending local edits with loader data", async () => {
		const resume = await createLocalResume({ name: "Pending Draft", slug: "pending-draft", tags: [] });
		const incoming = {
			...resume,
			name: "Updated Name",
			data: structuredClone(resume.data),
			updatedAt: new Date(resume.updatedAt.getTime() + 1000),
		};
		incoming.data.basics.headline = "Loader headline";

		useResumeStore.getState().initialize(resume);
		useResumeStore.getState().updateResumeData((draft) => {
			draft.basics.headline = "Unsaved local headline";
		});
		useResumeStore.getState().syncResumeFromLoader(incoming);

		expect(useResumeStore.getState().resume?.name).toBe("Updated Name");
		expect(useResumeStore.getState().resume?.data.basics.headline).toBe("Unsaved local headline");

		await waitForAutosave();
		await flushMicrotasks();
	});
});

function waitForAutosave(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 650));
}
