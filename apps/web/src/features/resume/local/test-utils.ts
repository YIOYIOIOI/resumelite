import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { vi } from "vitest";
import { createLocalResumeApiHandler } from "./api.server";
import { createFileResumeRepository } from "./file-store.server";

type LocalResumeApiTestServerOptions = {
	idPrefix?: string;
};

export async function setupLocalResumeApiTestServer({
	idPrefix = "local_test",
}: LocalResumeApiTestServerOptions = {}): Promise<() => Promise<void>> {
	const tempDir = await mkdtemp(join(tmpdir(), "rr-local-api-test-"));
	let idCounter = 0;
	const handler = createLocalResumeApiHandler(
		createFileResumeRepository({
			filePath: join(tempDir, "resumes.json"),
			now: () => new Date(Date.now()),
			randomId: () => `${idPrefix}_${++idCounter}`,
		}),
	);

	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(
				typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
				"http://localhost",
			);
			const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
			const result = await handler({
				body,
				method: init?.method ?? "GET",
				pathname: url.pathname,
				query: url.searchParams,
			});

			return new Response(result.body === undefined ? null : JSON.stringify(result.body), {
				status: result.status,
				headers: result.body === undefined ? undefined : { "Content-Type": "application/json" },
			});
		}),
	);

	return async () => {
		vi.unstubAllGlobals();
		await rm(tempDir, { force: true, recursive: true });
	};
}
