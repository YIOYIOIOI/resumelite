import type { IncomingMessage, ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createLocalRequestHandler } from "./src/features/local-server/create-local-request-handler";

const rootPackageJsonPath = new URL("../../package.json", import.meta.url);
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf-8")) as { version: string | undefined };
const appVersion = JSON.stringify(rootPackageJson.version ?? "0.0.0");
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

// The local persistence backend (/api/local + /uploads + SSE) lives in a shared handler
// so the same implementation powers both this Vite middleware and the Electron main
// process. Built at server-start (here), never at module load, so `vite build` starts no
// file watcher.
const configureLocalMiddlewares = (middlewares: {
	use: (handler: (request: IncomingMessage, response: ServerResponse, next: () => void) => void) => void;
}) => {
	const localHandler = createLocalRequestHandler({ dataDir: resolve(workspaceRoot, "data") });
	middlewares.use(localHandler.handle);
};

export default defineConfig({
	envDir: workspaceRoot,

	resolve: {
		tsconfigPaths: true,
	},

	define: {
		__APP_VERSION__: appVersion,
	},

	build: {
		chunkSizeWarningLimit: 10 * 1024, // 10 MB
	},

	server: {
		// Local-only personal tool: /api/local has no auth, so bind to loopback only.
		// Change to `true` (0.0.0.0) intentionally if LAN access is ever required.
		host: "localhost",
		strictPort: true,
		port: Number.parseInt(process.env.PORT ?? "3000", 10),
	},

	plugins: [
		{
			name: "reactive-resume-local-data",
			configureServer(server) {
				configureLocalMiddlewares(server.middlewares);
			},
			configurePreviewServer(server) {
				configureLocalMiddlewares(server.middlewares);
			},
		},
		tailwindcss(),
		tanstackRouter({
			target: "react",
			semicolons: true,
			quoteStyle: "double",
			autoCodeSplitting: true,
		}),
		viteReact(),
		lingui(),
		babel({ presets: [reactCompilerPreset(), linguiTransformerBabelPreset()] }),
	],
});
