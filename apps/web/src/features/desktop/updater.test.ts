// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	isNewerVersion,
	parseSha256File,
	pickUpdaterLocale,
	pickWindowsZipAsset,
	renderUpdateScript,
	updaterStrings,
} from "./updater";

describe("isNewerVersion", () => {
	it("detects newer major/minor/patch", () => {
		expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
		expect(isNewerVersion("1.2.0", "1.1.9")).toBe(true);
		expect(isNewerVersion("1.1.1", "1.1.0")).toBe(true);
	});

	it("is false for equal or older versions", () => {
		expect(isNewerVersion("1.1.0", "1.1.0")).toBe(false);
		expect(isNewerVersion("1.0.0", "1.1.0")).toBe(false);
		expect(isNewerVersion("1.1.0", "1.1.1")).toBe(false);
	});

	it("treats missing/non-numeric parts as zero", () => {
		expect(isNewerVersion("1.2", "1.1.9")).toBe(true);
		expect(isNewerVersion("1", "1.0.0")).toBe(false);
		expect(isNewerVersion("x.y.z", "1.0.0")).toBe(false);
	});
});

describe("pickWindowsZipAsset", () => {
	const release = {
		tag_name: "v1.2.0",
		assets: [
			{ name: "ResumeLite-1.2.0-win-x64.zip.sha256", browser_download_url: "https://x/sum", size: 64 },
			{ name: "ResumeLite-1.2.0-win-x64.zip", browser_download_url: "https://x/zip", size: 183500800 },
			{ name: "source.tar.gz", browser_download_url: "https://x/src", size: 10 },
		],
	};

	it("picks the win-x64 zip, strips the v, and finds its sha256 sidecar", () => {
		expect(pickWindowsZipAsset(release)).toEqual({
			version: "1.2.0",
			zipName: "ResumeLite-1.2.0-win-x64.zip",
			zipUrl: "https://x/zip",
			size: 183500800,
			sha256Url: "https://x/sum",
		});
	});

	it("returns a null sha256Url when no sidecar is published", () => {
		const asset = pickWindowsZipAsset({
			tag_name: "1.2.0",
			assets: [{ name: "ResumeLite-1.2.0-win-x64.zip", browser_download_url: "https://x/zip", size: 1 }],
		});
		expect(asset?.sha256Url).toBeNull();
	});

	it("returns null when there is no tag or no matching asset", () => {
		expect(pickWindowsZipAsset({ assets: [] })).toBeNull();
		expect(
			pickWindowsZipAsset({ tag_name: "v1.2.0", assets: [{ name: "notes.txt", browser_download_url: "u" }] }),
		).toBeNull();
		expect(pickWindowsZipAsset({ tag_name: "v1.2.0", assets: [{ name: "ResumeLite-1.2.0-win-x64.zip" }] })).toBeNull();
	});
});

describe("parseSha256File", () => {
	const digest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

	it("reads a bare digest", () => {
		expect(parseSha256File(digest)).toBe(digest);
	});

	it("reads the sha256sum format and lowercases", () => {
		expect(parseSha256File(`${digest.toUpperCase()}  ResumeLite-1.2.0-win-x64.zip\n`)).toBe(digest);
	});

	it("returns null when there is no digest", () => {
		expect(parseSha256File("no hash here")).toBeNull();
	});
});

describe("renderUpdateScript", () => {
	const script = renderUpdateScript({
		pid: 4242,
		sourceDir: "C:\\Users\\me\\AppData\\Local\\Temp\\resumelite-update\\ResumeLite",
		installDir: "D:\\Apps\\ResumeLite",
		exePath: "D:\\Apps\\ResumeLite\\ResumeLite.exe",
	});

	it("waits for the running app's pid before swapping", () => {
		expect(script).toContain('tasklist /nh /fi "PID eq 4242"');
		expect(script).toContain(":waitloop");
		expect(script).toContain("goto waitloop");
	});

	it("mirrors the staged build over the install dir", () => {
		expect(script).toContain(
			'robocopy "C:\\Users\\me\\AppData\\Local\\Temp\\resumelite-update\\ResumeLite" "D:\\Apps\\ResumeLite" /MIR',
		);
	});

	it("excludes the data folder so the user's resumes are never touched", () => {
		expect(script).toContain('/XD "D:\\Apps\\ResumeLite\\data"');
	});

	it("relaunches the exe after the swap", () => {
		expect(script).toContain('start "" "D:\\Apps\\ResumeLite\\ResumeLite.exe"');
	});
});

describe("updater locale + strings", () => {
	it("picks zh for Chinese locales and en otherwise", () => {
		expect(pickUpdaterLocale("zh-CN")).toBe("zh");
		expect(pickUpdaterLocale("zh-Hans")).toBe("zh");
		expect(pickUpdaterLocale("en-US")).toBe("en");
		expect(pickUpdaterLocale("fr")).toBe("en");
	});

	it("returns Chinese copy for zh and English copy for en", () => {
		const zh = updaterStrings("zh-CN");
		expect(zh.updateTitle).toBe("发现新版本");
		expect(zh.installRestart).toBe("安装并重启");
		expect(zh.downloading(45)).toContain("45%");

		const en = updaterStrings("en-US");
		expect(en.updateTitle).toBe("Update available");
		expect(en.installRestart).toBe("Install & Restart");
	});
});
