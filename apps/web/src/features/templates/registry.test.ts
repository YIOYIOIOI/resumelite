import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@resumelite/schema/resume/default";
import { extractPreset } from "@resumelite/schema/resume/template-preset";
import { fetchCommunityPreset, fetchCommunityTemplates } from "./registry";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
	vi.clearAllMocks();
});

function jsonResponse(data: unknown, ok = true, status = 200) {
	return { ok, status, text: async () => JSON.stringify(data) };
}

describe("fetchCommunityTemplates", () => {
	it("returns templates and resolves relative preview URLs to absolute", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				templates: [{ slug: "clean", name: "Clean", tags: ["minimal"], preview: "templates/clean/preview.jpg" }],
			}),
		);

		const result = await fetchCommunityTemplates();

		expect(result).toHaveLength(1);
		expect(result[0]?.slug).toBe("clean");
		expect(result[0]?.preview).toMatch(/^https:\/\/.+\/templates\/clean\/preview\.jpg$/);
	});

	it("rejects an entry whose preview is an absolute URL (no third-party images)", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ templates: [{ slug: "x", name: "X", tags: [], preview: "https://cdn.example/x.png" }] }),
		);

		await expect(fetchCommunityTemplates()).rejects.toThrow();
	});

	it("throws on a non-ok response", async () => {
		fetchMock.mockResolvedValue(jsonResponse(null, false, 404));
		await expect(fetchCommunityTemplates()).rejects.toThrow();
	});

	it("throws on a malformed index", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ nope: true }));
		await expect(fetchCommunityTemplates()).rejects.toThrow();
	});
});

describe("fetchCommunityPreset", () => {
	it("returns a validated preset", async () => {
		const preset = extractPreset(defaultResumeData.metadata, { name: "Clean" });
		fetchMock.mockResolvedValue(jsonResponse(preset));

		const result = await fetchCommunityPreset("clean");

		expect(result.name).toBe("Clean");
		expect(result.appearance.template).toBe(defaultResumeData.metadata.template);
	});

	it("rejects an unsafe slug without fetching", async () => {
		await expect(fetchCommunityPreset("../etc/passwd")).rejects.toThrow();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("throws when the preset file is malformed", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ not: "a preset" }));
		await expect(fetchCommunityPreset("clean")).rejects.toThrow();
	});
});
