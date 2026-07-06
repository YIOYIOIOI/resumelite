// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultResumeData } from "@resumelite/schema/resume/default";
import { extractPreset } from "@resumelite/schema/resume/template-preset";
import { fetchCommunityPreset, fetchCommunityTemplates } from "@/features/templates/registry";
import { CommunityTemplateGallery } from "./community";

const updateResumeData = vi.fn();
const closeDialog = vi.fn();

const mockResume = {
	id: "r1",
	name: "R",
	slug: "r",
	tags: [] as string[],
	data: defaultResumeData,
	isLocked: false,
	updatedAt: new Date(0),
};

vi.mock("@/features/templates/registry", () => ({
	fetchCommunityTemplates: vi.fn(),
	fetchCommunityPreset: vi.fn(),
}));

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => mockResume,
	useUpdateResumeData: () => updateResumeData,
}));

vi.mock("@/dialogs/store", () => ({
	useDialogStore: (selector: (state: { closeDialog: () => void }) => unknown) => selector({ closeDialog }),
}));

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	vi.clearAllMocks();
});

function renderGallery() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<I18nProvider i18n={i18n}>
				<CommunityTemplateGallery />
			</I18nProvider>
		</QueryClientProvider>,
	);
}

describe("CommunityTemplateGallery", () => {
	it("lists templates from the registry", async () => {
		vi.mocked(fetchCommunityTemplates).mockResolvedValue([
			{ slug: "clean", name: "Clean Two-Column", author: "amy", tags: ["minimal"], preview: "https://x/clean.jpg" },
		]);

		renderGallery();

		expect(await screen.findByText("Clean Two-Column")).toBeInTheDocument();
	});

	it("applies a template when Use is clicked", async () => {
		vi.mocked(fetchCommunityTemplates).mockResolvedValue([
			{ slug: "clean", name: "Clean", tags: [], preview: "https://x/clean.jpg" },
		]);
		vi.mocked(fetchCommunityPreset).mockResolvedValue(extractPreset(defaultResumeData.metadata, { name: "Clean" }));

		renderGallery();
		await screen.findByText("Clean");
		await userEvent.click(screen.getByRole("button", { name: "Use" }));

		await waitFor(() => {
			expect(fetchCommunityPreset).toHaveBeenCalledWith("clean");
			expect(updateResumeData).toHaveBeenCalled();
			expect(closeDialog).toHaveBeenCalled();
		});
	});

	it("shows a fallback with retry when the registry is unreachable", async () => {
		vi.mocked(fetchCommunityTemplates).mockRejectedValue(new Error("offline"));

		renderGallery();

		expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});
