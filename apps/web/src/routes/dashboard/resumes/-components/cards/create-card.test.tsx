// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { useDialogStore } from "@/dialogs/store";
import { listLocalResumes } from "@/features/resume/local/storage";
import { setupLocalResumeApiTestServer } from "@/features/resume/local/test-utils";
import { CreateResumeCard } from "./create-card";
import { ImportResumeCard } from "./import-card";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

let cleanupLocalResumeApi: () => Promise<void>;

beforeEach(async () => {
	cleanupLocalResumeApi = await setupLocalResumeApiTestServer({ idPrefix: "local_card" });
});

afterEach(async () => {
	useDialogStore.setState({ open: false, activeDialog: null, onBeforeClose: null });
	localStorage.clear();
	await cleanupLocalResumeApi();
});

describe("CreateResumeCard", () => {
	it("renders the create-resume copy", () => {
		render(<CreateResumeCard />);
		expect(screen.getByText("Create a new resume")).toBeInTheDocument();
		expect(screen.getByText("Start building your resume from scratch")).toBeInTheDocument();
	});

	it("creates a local resume when clicked", async () => {
		const onLocalCreate = vi.fn();
		render(<CreateResumeCard onLocalCreate={onLocalCreate} />);

		const card = screen.getByText("Create a new resume").closest("div[class*='aspect-page']") as HTMLElement;
		fireEvent.click(card);

		await vi.waitFor(() => expect(onLocalCreate).toHaveBeenCalledTimes(1));
		expect(await listLocalResumes({ tags: [], sort: "lastUpdatedAt" })).toHaveLength(1);
	});
});

describe("ImportResumeCard", () => {
	it("renders the import-resume copy", () => {
		render(<ImportResumeCard />);
		expect(screen.getByText("Import an existing resume")).toBeInTheDocument();
		expect(screen.getByText("Continue where you left off")).toBeInTheDocument();
	});

	it("opens the resume.import dialog when clicked", () => {
		render(<ImportResumeCard />);

		const card = screen.getByText("Import an existing resume").closest("div[class*='aspect-page']") as HTMLElement;
		fireEvent.click(card);

		const state = useDialogStore.getState();
		expect(state.open).toBe(true);
		expect(state.activeDialog?.type).toBe("resume.import");
	});
});
