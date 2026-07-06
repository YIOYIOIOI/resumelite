import type { AddressInfo } from "node:net";
import type { UpdateAsset } from "../src/features/desktop/updater";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, writeFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { app, BrowserWindow, dialog, shell } from "electron";
import { createAppRequestListener } from "../src/features/desktop/create-app-server";
import {
	isNewerVersion,
	parseSha256File,
	pickWindowsZipAsset,
	renderUpdateScript,
	updaterStrings,
} from "../src/features/desktop/updater";

const RELEASES_API = "https://api.github.com/repos/YIOYIOIOI/resumelite/releases/latest";
const RELEASES_PAGE = "https://github.com/YIOYIOIOI/resumelite/releases/latest";

function resolveDataDir(): string {
	// Packaged: store data next to the exe (self-contained, delete-folder-to-uninstall).
	if (app.isPackaged) return join(dirname(app.getPath("exe")), "data");
	// Unpackaged fallback (running electron directly): repo data/.
	return join(process.cwd(), "data");
}

// Ask GitHub for the latest release and, if its Windows build is newer than the running
// one, return the zip asset to download. Null when offline, rate-limited, or up to date.
async function fetchLatestAsset(): Promise<UpdateAsset | null> {
	const response = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
	if (!response.ok) return null;

	const asset = pickWindowsZipAsset((await response.json()) as Parameters<typeof pickWindowsZipAsset>[0]);
	if (!asset || !isNewerVersion(asset.version, app.getVersion())) return null;
	return asset;
}

// A tiny always-on-top progress window (no extra asset files — inline data URL). The main
// process pushes updates via executeJavaScript, so no preload/IPC is needed.
function createProgressWindow(parent: BrowserWindow): BrowserWindow {
	const win = new BrowserWindow({
		width: 400,
		height: 130,
		parent,
		modal: false,
		alwaysOnTop: true,
		resizable: false,
		minimizable: false,
		maximizable: false,
		frame: false,
		show: true,
		webPreferences: { contextIsolation: true },
	});
	const html = `<!doctype html><meta charset="utf-8"><style>
		html,body{margin:0;height:100%}
		body{font-family:system-ui,'Segoe UI',sans-serif;display:flex;flex-direction:column;justify-content:center;
		gap:14px;padding:0 26px;background:#0b0b0c;color:#e7e7e9;user-select:none}
		.t{font-size:14px}.bar{height:8px;border-radius:99px;background:#26262b;overflow:hidden}
		.f{height:100%;width:0;background:#0084d1;transition:width .2s ease}</style>
		<div class="t" id="t"></div><div class="bar"><div class="f" id="f"></div></div>
		<script>window.setP=function(t,p){document.getElementById('t').textContent=t;document.getElementById('f').style.width=p+'%'}</script>`;
	void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
	return win;
}

function updateProgress(win: BrowserWindow | null, text: string, pct: number): void {
	if (!win || win.isDestroyed()) return;
	void win.webContents.executeJavaScript(`window.setP&&window.setP(${JSON.stringify(text)},${pct})`).catch(() => {});
}

// Stream the download to disk, hashing as we go so we never hold the whole (~175 MB) zip in
// memory. Returns the byte count and the SHA-256 hex digest for verification.
async function downloadToFile(
	url: string,
	dest: string,
	expectedSize: number | null,
	onProgress: (pct: number) => void,
): Promise<{ bytes: number; sha256: string }> {
	const response = await fetch(url, { headers: { Accept: "application/octet-stream" } });
	if (!response.ok || !response.body) throw new Error(`Download failed (HTTP ${response.status}).`);

	const total = expectedSize ?? (Number(response.headers.get("content-length")) || 0);
	const hash = createHash("sha256");
	const file = createWriteStream(dest);
	const reader = response.body.getReader();
	let bytes = 0;
	let lastPct = -1;

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			hash.update(value);
			bytes += value.length;
			if (!file.write(value)) await new Promise<void>((resolve) => file.once("drain", resolve));
			if (total > 0) {
				const pct = Math.min(99, Math.floor((bytes / total) * 100));
				if (pct !== lastPct) {
					lastPct = pct;
					onProgress(pct);
				}
			}
		}
	} finally {
		await new Promise<void>((resolve, reject) => {
			file.on("error", reject);
			file.end(() => resolve());
		});
	}
	onProgress(100);
	return { bytes, sha256: hash.digest("hex") };
}

function run(command: string, args: string[]): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, { windowsHide: true });
		child.on("error", reject);
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with ${code}.`));
		});
	});
}

// Unpack the zip. tar.exe (present on Windows 10 1803+) is fast; fall back to PowerShell's
// slower Expand-Archive if it isn't available.
function extractZip(zipPath: string, destDir: string): Promise<void> {
	const psQuote = (value: string) => `'${value.replace(/'/g, "''")}'`;
	return run("tar.exe", ["-xf", zipPath, "-C", destDir]).catch(() =>
		run("powershell.exe", [
			"-NoProfile",
			"-NonInteractive",
			"-Command",
			`Expand-Archive -LiteralPath ${psQuote(zipPath)} -DestinationPath ${psQuote(destDir)} -Force`,
		]),
	);
}

// Write the detached swap helper, launch it, and quit so it can replace our locked files.
function applyUpdateAndRestart(stagingDir: string, newAppDir: string): void {
	const exePath = app.getPath("exe");
	const script = renderUpdateScript({
		pid: process.pid,
		sourceDir: newAppDir,
		installDir: dirname(exePath),
		exePath,
	});
	const helperPath = join(stagingDir, "apply-update.cmd");
	writeFileSync(helperPath, script, "utf8");
	spawn("cmd.exe", ["/c", helperPath], { detached: true, stdio: "ignore", windowsHide: true }).unref();
	app.quit();
}

// Download -> verify -> extract -> confirm -> swap. Any failure shows a friendly dialog with
// a "open download page" escape hatch so the user can always fall back to a manual update.
async function downloadAndInstall(parent: BrowserWindow, asset: UpdateAsset): Promise<void> {
	const strings = updaterStrings(app.getLocale());
	const stagingDir = join(app.getPath("temp"), "resumelite-update");
	let progress: BrowserWindow | null = null;

	try {
		await rm(stagingDir, { recursive: true, force: true });
		await mkdir(stagingDir, { recursive: true });
		const zipPath = join(stagingDir, asset.zipName);

		progress = createProgressWindow(parent);
		const { bytes, sha256 } = await downloadToFile(asset.zipUrl, zipPath, asset.size, (pct) => {
			parent.setProgressBar(pct / 100);
			updateProgress(progress, strings.downloading(pct), pct);
		});
		parent.setProgressBar(-1);

		if (asset.size != null && bytes !== asset.size) throw new Error("Downloaded size does not match the release.");
		if (asset.sha256Url) {
			const expected = parseSha256File(await (await fetch(asset.sha256Url)).text());
			if (expected && sha256 !== expected) throw new Error("Checksum mismatch.");
		}

		await extractZip(zipPath, stagingDir);
		const newAppDir = join(stagingDir, "ResumeLite");
		if (!existsSync(join(newAppDir, "ResumeLite.exe"))) throw new Error("Extracted build is missing ResumeLite.exe.");

		progress.destroy();
		progress = null;

		const { response } = await dialog.showMessageBox(parent, {
			type: "info",
			title: strings.readyTitle,
			message: strings.readyMessage(asset.version),
			detail: strings.readyDetail,
			buttons: [strings.installRestart, strings.later],
			defaultId: 0,
			cancelId: 1,
		});
		if (response === 0) applyUpdateAndRestart(stagingDir, newAppDir);
	} catch {
		if (progress && !progress.isDestroyed()) progress.destroy();
		parent.setProgressBar(-1);
		const { response } = await dialog.showMessageBox(parent, {
			type: "error",
			title: strings.errorTitle,
			message: strings.errorTitle,
			detail: strings.errorDetail,
			buttons: [strings.openDownloadPage, strings.later],
			defaultId: 0,
			cancelId: 1,
		});
		if (response === 0) await shell.openExternal(RELEASES_PAGE);
	}
}

// Best-effort update check at startup: offer to download a newer build in-app. Fails silently
// when offline or rate-limited so it can never block use.
async function checkForUpdates(parent: BrowserWindow): Promise<void> {
	try {
		const asset = await fetchLatestAsset();
		if (!asset) return;

		const strings = updaterStrings(app.getLocale());
		const { response } = await dialog.showMessageBox(parent, {
			type: "info",
			title: strings.updateTitle,
			message: strings.updateMessage(asset.version),
			detail: strings.updateDetail(app.getVersion()),
			buttons: [strings.download, strings.later],
			defaultId: 0,
			cancelId: 1,
		});
		if (response === 0) await downloadAndInstall(parent, asset);
	} catch {
		// Offline, rate-limited, or a parse error — ignore; an update check must never block use.
	}
}

async function openMainWindow(port: number): Promise<BrowserWindow> {
	const window = new BrowserWindow({
		width: 1280,
		height: 800,
		icon: join(app.getAppPath(), "icon.png"),
		webPreferences: { contextIsolation: true },
	});
	await window.loadURL(`http://127.0.0.1:${port}/`);
	return window;
}

app.whenReady().then(() => {
	const dataDir = resolveDataDir();
	const distDir = join(app.getAppPath(), "dist");
	const listener = createAppRequestListener({ dataDir, distDir });
	const server = createServer(listener);

	server.on("error", (error) => {
		dialog.showErrorBox("ResumeLite", `Could not start the local server:\n${error.message}`);
		app.quit();
	});

	server.listen(0, "127.0.0.1", () => {
		const port = (server.address() as AddressInfo).port;
		openMainWindow(port)
			.then((window) => {
				// Only the packaged desktop build checks for updates (dev/web don't need it).
				if (app.isPackaged) void checkForUpdates(window);
			})
			.catch((error: unknown) => {
				dialog.showErrorBox("ResumeLite", `Could not open the window:\n${String(error)}`);
				app.quit();
			});
	});
});

app.on("window-all-closed", () => {
	app.quit();
});
