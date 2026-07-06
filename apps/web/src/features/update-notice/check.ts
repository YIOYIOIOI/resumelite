import { isNewerVersion } from "../desktop/updater";

const RELEASES_API = "https://api.github.com/repos/YIOYIOIOI/resumelite/releases/latest";
export const RELEASES_PAGE = "https://github.com/YIOYIOIOI/resumelite/releases/latest";
const DISMISSED_KEY = "resumelite:update-dismissed-version";

export type LatestRelease = { version: string; url: string };

// Fetch the latest published release from GitHub. Returns null on any network/parse/HTTP
// error or when there's no usable tag — an update check must never disrupt the app.
export async function fetchLatestRelease(signal?: AbortSignal): Promise<LatestRelease | null> {
	try {
		const response = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" }, signal });
		if (!response.ok) return null;
		const data = (await response.json()) as { tag_name?: string; html_url?: string };
		const version = data.tag_name?.replace(/^v/, "");
		if (!version) return null;
		return { version, url: data.html_url || RELEASES_PAGE };
	} catch {
		return null;
	}
}

// Whether to surface the "update available" notice: the latest release must be newer than the
// running build AND newer than any version the user has already dismissed.
export function shouldNotify(current: string, latest: string, dismissed: string | null): boolean {
	if (!isNewerVersion(latest, current)) return false;
	if (dismissed && !isNewerVersion(latest, dismissed)) return false;
	return true;
}

// The web notice is redundant inside the Electron desktop build, which has its own native
// updater — skip it there to avoid a double prompt.
export function isElectronRuntime(): boolean {
	return typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent);
}

export function getDismissedVersion(): string | null {
	try {
		return localStorage.getItem(DISMISSED_KEY);
	} catch {
		return null;
	}
}

export function setDismissedVersion(version: string): void {
	try {
		localStorage.setItem(DISMISSED_KEY, version);
	} catch {
		// Ignore storage errors (private mode, disabled storage) — dismissal is best-effort.
	}
}
