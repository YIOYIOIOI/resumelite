import { describe, expect, it } from "vitest";
import { hasTemplatePicture } from "./picture";

const basePicture = {
	hidden: false,
	url: "",
	size: 80,
	rotation: 0,
	aspectRatio: 1,
	borderRadius: 0,
	borderColor: "rgba(0, 0, 0, 0.5)",
	borderWidth: 0,
	shadowColor: "rgba(0, 0, 0, 0.5)",
	shadowWidth: 0,
} as const;

describe("hasTemplatePicture", () => {
	it("returns true when not hidden and url has a PDF-compatible image extension", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.png" })).toBe(true);
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.JPG?version=1#crop" })).toBe(true);
		expect(hasTemplatePicture({ ...basePicture, url: "https://example.com/me.jpeg" })).toBe(true);
	});

	it("returns true for extensionless URLs because their content type can still be compatible", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/picture?id=123" })).toBe(true);
		expect(hasTemplatePicture({ ...basePicture, url: "blob:https://local-app/picture" })).toBe(true);
	});

	it("returns true for compatible image data URIs", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "data:image/png;base64,AAA=" })).toBe(true);
		expect(hasTemplatePicture({ ...basePicture, url: "data:image/jpeg;base64,AAA=" })).toBe(true);
	});

	it("returns false when hidden", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.png", hidden: true })).toBe(false);
	});

	it("returns false when url is empty", () => {
		expect(hasTemplatePicture(basePicture)).toBe(false);
	});

	it("returns false when url is whitespace only", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "   " })).toBe(false);
	});

	it("returns false for image formats that React PDF cannot render", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.webp" })).toBe(false);
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.WEBP?version=1#crop" })).toBe(false);
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.svg" })).toBe(false);
		expect(hasTemplatePicture({ ...basePicture, url: "data:image/webp;base64,AAA=" })).toBe(false);
	});
});
