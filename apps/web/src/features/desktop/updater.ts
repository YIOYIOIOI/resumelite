// Pure, unit-tested logic for the desktop auto-updater. The Electron orchestration
// (dialogs, download, extract, spawn) lives in electron/main.ts and calls into this;
// keeping the parsing, version compare, helper-script text, and copy here means the
// safety-critical bits (notably the "never touch data/" guard) are covered by tests.

export type UpdateAsset = {
	/** Release version with any leading "v" stripped, e.g. "1.2.0". */
	version: string;
	/** Asset file name, e.g. "ResumeLite-1.2.0-win-x64.zip". */
	zipName: string;
	/** Direct download URL for the zip asset. */
	zipUrl: string;
	/** Asset size in bytes, or null when GitHub didn't report one. */
	size: number | null;
	/** Download URL for the "<zip>.sha256" sidecar, or null when not published. */
	sha256Url: string | null;
};

type GithubAsset = { name?: string; browser_download_url?: string; size?: number };
type GithubRelease = { tag_name?: string; assets?: GithubAsset[] };

const WIN_ZIP_RE = /-win-x64\.zip$/i;

// Compare dotted numeric versions (major.minor.patch). Non-numeric or missing parts count
// as 0. Returns true only when `latest` is strictly greater than `current`.
export function isNewerVersion(latest: string, current: string): boolean {
	const a = latest.split(".").map((part) => Number.parseInt(part, 10) || 0);
	const b = current.split(".").map((part) => Number.parseInt(part, 10) || 0);
	for (let i = 0; i < 3; i++) {
		if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
		if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
	}
	return false;
}

// Parse a GitHub "latest release" payload and pick the Windows x64 zip asset plus its
// optional "<zip>.sha256" checksum sidecar. Returns null when there's no usable asset.
export function pickWindowsZipAsset(release: GithubRelease): UpdateAsset | null {
	const version = release.tag_name?.replace(/^v/, "");
	if (!version) return null;

	const assets = release.assets ?? [];
	const zip = assets.find((asset) => asset.name && WIN_ZIP_RE.test(asset.name) && asset.browser_download_url);
	if (!zip?.name || !zip.browser_download_url) return null;

	const sidecar = assets.find((asset) => asset.name === `${zip.name}.sha256`);
	return {
		version,
		zipName: zip.name,
		zipUrl: zip.browser_download_url,
		size: typeof zip.size === "number" ? zip.size : null,
		sha256Url: sidecar?.browser_download_url ?? null,
	};
}

// A published ".sha256" file may be a bare digest or the "sha256sum" format
// ("<hash>  <filename>"). Extract just the 64-hex-char digest, lowercased, or null.
export function parseSha256File(text: string): string | null {
	const match = text.match(/[a-f0-9]{64}/i);
	return match ? match[0].toLowerCase() : null;
}

export type SwapParams = {
	/** PID of the running app; the helper waits for it to exit before swapping. */
	pid: number;
	/** Staged new build directory (contains ResumeLite.exe, dlls, resources/...). */
	sourceDir: string;
	/** Live install directory being replaced — dirname of the running exe. */
	installDir: string;
	/** Full path to the exe to relaunch after the swap. */
	exePath: string;
};

// Single-quote a value for a Windows .cmd literal. cmd doesn't treat backslashes specially,
// so only the surrounding quotes matter; paths with embedded double quotes aren't supported
// (Windows paths can't contain them anyway).
function q(value: string): string {
	return `"${value}"`;
}

// Render the self-contained Windows .cmd that performs the in-place update. It:
//   1. waits for the running app (pid) to exit so its files unlock,
//   2. mirrors the staged build over the install dir, EXCLUDING data\ (/XD) so the user's
//      resumes are never copied over or purged,
//   3. relaunches the app.
// The script and its staged source both live in %TEMP%, outside installDir, so /MIR's purge
// can't delete them mid-run. robocopy is a trusted built-in (no antivirus friction).
export function renderUpdateScript(params: SwapParams): string {
	const dataDir = `${params.installDir}\\data`;
	return [
		"@echo off",
		"setlocal",
		":waitloop",
		`tasklist /nh /fi "PID eq ${params.pid}" 2>nul | find "${params.pid}" >nul`,
		"if not errorlevel 1 (",
		"  timeout /t 1 /nobreak >nul",
		"  goto waitloop",
		")",
		`robocopy ${q(params.sourceDir)} ${q(params.installDir)} /MIR /XD ${q(dataDir)} /R:10 /W:2 >nul`,
		`start "" ${q(params.exePath)}`,
		"endlocal",
		"",
	].join("\r\n");
}

// Pick the updater's language from an Electron locale string ("zh-CN" -> zh, else en).
export function pickUpdaterLocale(locale: string): "zh" | "en" {
	return locale.toLowerCase().startsWith("zh") ? "zh" : "en";
}

// Bilingual copy for the updater's native dialogs and progress window.
export function updaterStrings(locale: string) {
	const zh = pickUpdaterLocale(locale) === "zh";
	return {
		updateTitle: zh ? "发现新版本" : "Update available",
		updateMessage: (version: string) => (zh ? `ResumeLite v${version} 可用。` : `ResumeLite v${version} is available.`),
		updateDetail: (current: string) =>
			zh ? `你正在使用 v${current}，是否下载更新？` : `You're running v${current}. Download the update?`,
		download: zh ? "下载" : "Download",
		later: zh ? "稍后" : "Later",
		downloading: (pct: number) => (zh ? `正在下载更新… ${pct}%` : `Downloading update… ${pct}%`),
		readyTitle: zh ? "更新已就绪" : "Update ready",
		readyMessage: (version: string) =>
			zh ? `ResumeLite v${version} 已下载完成。` : `ResumeLite v${version} has been downloaded.`,
		readyDetail: zh ? "现在安装并重启应用？" : "Install and restart the app now?",
		installRestart: zh ? "安装并重启" : "Install & Restart",
		errorTitle: zh ? "更新失败" : "Update failed",
		errorDetail: zh
			? "更新过程中出现问题。你可以前往下载页手动更新。"
			: "Something went wrong during the update. You can update manually from the download page.",
		openDownloadPage: zh ? "打开下载页" : "Open download page",
	};
}
