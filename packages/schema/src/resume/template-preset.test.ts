import { describe, expect, it } from "vitest";
import { defaultResumeData } from "./default";
import { applyPreset, extractPreset, templatePresetSchema } from "./template-preset";

const metadata = defaultResumeData.metadata;

describe("extractPreset", () => {
	it("captures appearance, sets format version, and excludes private notes", () => {
		const preset = extractPreset(metadata, { name: "My Style", tags: ["minimal"] });

		expect(preset.formatVersion).toBe(1);
		expect(preset.name).toBe("My Style");
		expect(preset.tags).toEqual(["minimal"]);
		expect(preset.appearance.template).toBe(metadata.template);
		expect(preset.appearance).not.toHaveProperty("notes");
		expect(templatePresetSchema.safeParse(preset).success).toBe(true);
	});

	it("omits author when not provided", () => {
		const preset = extractPreset(metadata, { name: "X" });
		expect(preset.author).toBeUndefined();
		expect(preset.tags).toEqual([]);
	});
});

describe("templatePresetSchema", () => {
	it("rejects a malformed preset", () => {
		expect(templatePresetSchema.safeParse({ name: "X" }).success).toBe(false);
		expect(templatePresetSchema.safeParse({ formatVersion: 2, name: "X", appearance: {} }).success).toBe(false);
	});
});

describe("applyPreset", () => {
	it("swaps appearance while keeping the target's notes", () => {
		const target = { ...metadata, notes: "<p>my private notes</p>", template: "azurill" as const };
		const preset = extractPreset({ ...metadata, template: "onyx" }, { name: "X" });

		const result = applyPreset(preset, target);

		expect(result.template).toBe("onyx");
		expect(result.notes).toBe("<p>my private notes</p>");
	});

	it("drops layout references to unknown custom sections but keeps standard ones", () => {
		const preset = extractPreset(
			{
				...metadata,
				layout: {
					sidebarWidth: 30,
					pages: [{ fullWidth: false, main: ["experience", "custom-uuid-123"], sidebar: ["skills"] }],
				},
			},
			{ name: "X" },
		);

		const result = applyPreset(preset, metadata);

		expect(result.layout.pages[0]?.main).toEqual(["experience"]);
		expect(result.layout.pages[0]?.sidebar).toEqual(["skills"]);
	});

	it("keeps custom-section references the target resume actually has", () => {
		const preset = extractPreset(
			{ ...metadata, layout: { sidebarWidth: 30, pages: [{ fullWidth: false, main: ["known-uuid"], sidebar: [] }] } },
			{ name: "X" },
		);

		const result = applyPreset(preset, metadata, ["known-uuid"]);

		expect(result.layout.pages[0]?.main).toEqual(["known-uuid"]);
	});

	it("drops sectionId style rules that target sections the resume doesn't have", () => {
		const preset = extractPreset(
			{
				...metadata,
				styleRules: [
					{
						id: "r1",
						label: "",
						enabled: true,
						target: { scope: "global" },
						slots: { text: { color: "rgba(0,0,0,1)" } },
					},
					{
						id: "r2",
						label: "",
						enabled: true,
						target: { scope: "sectionId", sectionId: "gone-uuid" },
						slots: { text: { color: "rgba(0,0,0,1)" } },
					},
				],
			},
			{ name: "X" },
		);

		const result = applyPreset(preset, metadata);

		expect(result.styleRules.map((rule) => rule.id)).toEqual(["r1"]);
	});
});
