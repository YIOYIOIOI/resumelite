import type { AddressInfo } from "node:net";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { app, BrowserWindow, dialog } from "electron";
import { createAppRequestListener } from "../src/features/desktop/create-app-server";

function resolveDataDir(): string {
	// Packaged: store data next to the exe (self-contained, delete-folder-to-uninstall).
	if (app.isPackaged) return join(dirname(app.getPath("exe")), "data");
	// Unpackaged fallback (running electron directly): repo data/.
	return join(process.cwd(), "data");
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
		openMainWindow(port).catch((error: unknown) => {
			dialog.showErrorBox("ResumeLite", `Could not open the window:\n${String(error)}`);
			app.quit();
		});
	});
});

app.on("window-all-closed", () => {
	app.quit();
});
