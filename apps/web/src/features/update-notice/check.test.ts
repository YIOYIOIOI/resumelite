// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchLatestRelease,
	getDismissedVersion,
	isElectronRuntime,
	RELEASES_PAGE,
	setDismissedVersion,
	shouldNotify,
} from "./check";

afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
});

describe("shouldNotify", () => {
	it("notifies when the latest release is newer and nothing was dismissed", () => {
		expect(shouldNotify("1.2.0", "1.3.0", null)).toBe(true);
	});

	it("does not notify when up to date or ahead", () => {
		expect(shouldNotify("1.2.0", "1.2.0", null)).toBe(false);
		expect(shouldNotify("1.3.0", "1.2.0", null)).toBe(false);
	});

	it("does not notify when the newer version was already dismissed", () => {
		expect(shouldNotify("1.2.0", "1.3.0", "1.3.0")).toBe(false);
	});

	it("notifies again when a version newer than the dismissed one appears", () => {
		expect(shouldNotify("1.2.0", "1.4.0", "1.3.0")).toBe(true);
	});
});

describe("fetchLatestRelease", () => {
	const mockFetch = (value: unknown, ok = true) =>
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok, json: async () => value }));

	it("returns the version (v stripped) and release url", async () => {
		mockFetch({ tag_name: "v1.3.0", html_url: "https://github.com/x/releases/tag/v1.3.0" });
		expect(await fetchLatestRelease()).toEqual({
			version: "1.3.0",
			url: "https://github.com/x/releases/tag/v1.3.0",
		});
	});

	it("falls back to the releases page when no html_url is present", async () => {
		mockFetch({ tag_name: "1.3.0" });
		expect(await fetchLatestRelease()).toEqual({ version: "1.3.0", url: RELEASES_PAGE });
	});

	it("returns null on a non-OK response, missing tag, or thrown error", async () => {
		mockFetch({ tag_name: "v1.3.0" }, false);
		expect(await fetchLatestRelease()).toBeNull();

		mockFetch({});
		expect(await fetchLatestRelease()).toBeNull();

		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		expect(await fetchLatestRelease()).toBeNull();
	});
});

describe("isElectronRuntime", () => {
	it("is true only when the user agent mentions Electron", () => {
		vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 ResumeLite/1.2.0 Electron/43.0.0" });
		expect(isElectronRuntime()).toBe(true);

		vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Chrome/142.0" });
		expect(isElectronRuntime()).toBe(false);
	});
});

describe("dismissed version storage", () => {
	it("round-trips through localStorage and defaults to null", () => {
		expect(getDismissedVersion()).toBeNull();
		setDismissedVersion("1.3.0");
		expect(getDismissedVersion()).toBe("1.3.0");
	});
});
