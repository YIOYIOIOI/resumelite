// @vitest-environment happy-dom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";

const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));

// Mock only fetchLatestRelease; the gate, shouldNotify, and dismissal storage stay real.
vi.mock("./check", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./check")>();
	return { ...actual, fetchLatestRelease: vi.fn() };
});

import { fetchLatestRelease } from "./check";
import { useUpdateNotice } from "./use-update-notice";

const mockFetch = vi.mocked(fetchLatestRelease);

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	localStorage.clear();
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("useUpdateNotice", () => {
	it("shows a toast (with version and a GitHub action) when a newer release exists", async () => {
		vi.stubGlobal("__APP_VERSION__", "1.1.0");
		mockFetch.mockResolvedValue({ version: "1.2.0", url: "https://github.com/x/releases/tag/v1.2.0" });

		renderHook(() => useUpdateNotice());

		await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
		const [message, options] = toast.mock.calls[0] as [string, { action?: { label?: string } }];
		expect(String(message)).toContain("1.2.0");
		expect(options.action?.label).toBeTruthy();
	});

	it("does not toast when the app is up to date", async () => {
		vi.stubGlobal("__APP_VERSION__", "1.2.0");
		mockFetch.mockResolvedValue({ version: "1.2.0", url: "x" });

		renderHook(() => useUpdateNotice());
		await flush();

		expect(toast).not.toHaveBeenCalled();
	});

	it("does not toast when that version was already dismissed", async () => {
		vi.stubGlobal("__APP_VERSION__", "1.1.0");
		localStorage.setItem("resumelite:update-dismissed-version", "1.2.0");
		mockFetch.mockResolvedValue({ version: "1.2.0", url: "x" });

		renderHook(() => useUpdateNotice());
		await flush();

		expect(toast).not.toHaveBeenCalled();
	});
});
