import type { AddressInfo } from "node:net";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { app, BrowserWindow, dialog, shell } from "electron";
import { createAppRequestListener } from "../src/features/desktop/create-app-server";

const RELEASES_API = "https://api.github.com/repos/YIOYIOIOI/resumelite/releases/latest";
const RELEASES_PAGE = "https://github.com/YIOYIOIOI/resumelite/releases/latest";

function resolveDataDir(): string {
	// Packaged: store data next to the exe (self-contained, delete-folder-to-uninstall).
	if (app.isPackaged) return join(dirname(app.getPath("exe")), "data");
	// Unpackaged fallback (running electron directly): repo data/.
	return join(process.cwd(), "data");
}

function isNewerVersion(latest: string, current: string): boolean {
	const a = latest.split(".").map((part) => Number.parseInt(part, 10) || 0);
	const b = current.split(".").map((part) => Number.parseInt(part, 10) || 0);
	for (let i = 0; i < 3; i++) {
		if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
		if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
	}
	return false;
}

// Best-effort update check: ask GitHub for the latest release and, if it's newer than the
// running build, offer to open the download page. Never auto-downloads or installs, and
// fails silently when offline or rate-limited so it can't disrupt startup.
async function checkForUpdates(): Promise<void> {
	try {
		const response = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
		if (!response.ok) return;

		const release = (await response.json()) as { tag_name?: string };
		const latest = release.tag_name?.replace(/^v/, "");
		if (!latest || !isNewerVersion(latest, app.getVersion())) return;

		const { response: choice } = await dialog.showMessageBox({
			type: "info",
			title: "Update available",
			message: `ResumeLite v${latest} is available.`,
			detail: `You're running v${app.getVersion()}. Open the download page?`,
			buttons: ["Download", "Later"],
			defaultId: 0,
			cancelId: 1,
		});
		if (choice === 0) await shell.openExternal(RELEASES_PAGE);
	} catch {
		// Offline, rate-limited, or a parse error — ignore; an update check must never block use.
	}
}

async function openMainWindow(port: number): Promise<void> {
	const window = new BrowserWindow({
		width: 1280,
		height: 800,
		icon: join(app.getAppPath(), "icon.png"),
		webPreferences: { contextIsolation: true },
	});
	await window.loadURL(`http://127.0.0.1:${port}/`);
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
			.then(() => {
				// Only the packaged desktop build checks for updates (dev/web don't need it).
				if (app.isPackaged) void checkForUpdates();
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
