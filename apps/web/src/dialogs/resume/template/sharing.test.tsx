// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@resumelite/schema/resume/default";
import { extractPreset } from "@resumelite/schema/resume/template-preset";
import { TemplateSharingActions } from "./sharing";

const updateResumeData = vi.fn();
const downloadWithAnchor = vi.fn();

const resume = {
	id: "r1",
	name: "My Resume",
	slug: "my-resume",
	tags: ["x"],
	data: defaultResumeData,
	isLocked: false,
	updatedAt: new Date(0),
};

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => resume,
	useUpdateResumeData: () => updateResumeData,
}));

vi.mock("@resumelite/utils/file", async (importOriginal) => ({
	...(await importOriginal<typeof import("@resumelite/utils/file")>()),
	downloadWithAnchor: (...args: unknown[]) => downloadWithAnchor(...args),
}));

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	vi.clearAllMocks();
});

const renderActions = () =>
	render(
		<I18nProvider i18n={i18n}>
			<TemplateSharingActions />
		</I18nProvider>,
	);

describe("TemplateSharingActions", () => {
	it("exports the current resume appearance as a template file", async () => {
		renderActions();

		await userEvent.click(screen.getByText("Export as template"));

		expect(downloadWithAnchor).toHaveBeenCalledOnce();
		const call = downloadWithAnchor.mock.calls.at(0);
		expect(call?.[0]).toBeInstanceOf(Blob);
		expect(String(call?.[1])).toMatch(/\.json$/);
	});

	it("applies a valid imported template file to the resume", async () => {
		const { container } = renderActions();

		const preset = extractPreset(defaultResumeData.metadata, { name: "Shared" });
		const file = new File([JSON.stringify(preset)], "template.json", { type: "application/json" });
		const input = container.querySelector<HTMLInputElement>('input[type="file"]');
		expect(input).not.toBeNull();

		fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

		await waitFor(() => {
			expect(updateResumeData).toHaveBeenCalled();
		});
	});

	it("rejects a file that is not a valid template", async () => {
		const { container } = renderActions();

		const file = new File(['{"not":"a template"}'], "junk.json", { type: "application/json" });
		const input = container.querySelector<HTMLInputElement>('input[type="file"]');

		fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

		await waitFor(() => {
			expect(updateResumeData).not.toHaveBeenCalled();
		});
	});
});
