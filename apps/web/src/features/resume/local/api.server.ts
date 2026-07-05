import type { FileResumeRepository } from "./file-store.server";
import type { CreateLocalResumeInput, LocalResumeSort, UpdateLocalResumeInput } from "./types";

export type LocalResumeApiRequest = {
	method: string;
	pathname: string;
	query: URLSearchParams;
	body?: unknown;
};

export type LocalResumeApiResponse = {
	status: number;
	body?: unknown;
};

const apiPrefix = "/api/local";

export function createLocalResumeApiHandler(repository: FileResumeRepository) {
	return async (request: LocalResumeApiRequest): Promise<LocalResumeApiResponse> => {
		try {
			const path = request.pathname.startsWith(apiPrefix) ? request.pathname.slice(apiPrefix.length) || "/" : "/";
			const segments = path.split("/").filter(Boolean).map(decodeURIComponent);

			if (request.method === "GET" && segments.length === 1 && segments[0] === "tags") {
				return json(200, await repository.listTags());
			}

			if (segments[0] !== "resumes") return json(404, { error: "NOT_FOUND" });

			if (request.method === "GET" && segments.length === 1) {
				return json(
					200,
					await repository.list({
						sort: parseSort(request.query.get("sort")),
						tags: parseTags(request.query),
					}),
				);
			}

			if (request.method === "POST" && segments.length === 1) {
				return json(201, await repository.create(parseCreateInput(request.body)));
			}

			if (request.method === "POST" && segments.length === 2 && segments[1] === "import") {
				return json(200, await repository.importBackup(request.body));
			}

			const id = segments[1];
			if (!id) return json(404, { error: "NOT_FOUND" });

			if (request.method === "GET" && segments.length === 2) {
				const resume = await repository.getById(id);
				return resume ? json(200, resume) : json(404, { error: "NOT_FOUND" });
			}

			if (request.method === "PATCH" && segments.length === 2) {
				return json(200, await repository.update(id, parseUpdateInput(request.body)));
			}

			if (request.method === "DELETE" && segments.length === 2) {
				await repository.delete(id);
				return { status: 204 };
			}

			if (request.method === "POST" && segments.length === 3 && segments[2] === "duplicate") {
				return json(201, await repository.duplicate(id, parseCreateInput(request.body)));
			}

			return json(404, { error: "NOT_FOUND" });
		} catch (error) {
			return json(errorStatus(error), { error: error instanceof Error ? error.message : "UNKNOWN_ERROR" });
		}
	};
}

function json(status: number, body: unknown): LocalResumeApiResponse {
	return { status, body };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Envelope validation only. The `data` payload's deep structure is normalized/guarded
// by the repository on read (reviveResume), so here we just reject obviously malformed
// bodies (non-objects, wrong field types) with a 400 instead of letting them reach disk.
function parseCreateInput(body: unknown): CreateLocalResumeInput {
	if (
		!isRecord(body) ||
		typeof body.name !== "string" ||
		typeof body.slug !== "string" ||
		!isStringArray(body.tags) ||
		(body.data !== undefined && !isRecord(body.data))
	) {
		throw new Error("INVALID_REQUEST_BODY");
	}

	return body as CreateLocalResumeInput;
}

function parseUpdateInput(body: unknown): UpdateLocalResumeInput {
	if (
		!isRecord(body) ||
		(body.name !== undefined && typeof body.name !== "string") ||
		(body.slug !== undefined && typeof body.slug !== "string") ||
		(body.tags !== undefined && !isStringArray(body.tags)) ||
		(body.data !== undefined && !isRecord(body.data)) ||
		(body.isLocked !== undefined && typeof body.isLocked !== "boolean")
	) {
		throw new Error("INVALID_REQUEST_BODY");
	}

	return body as UpdateLocalResumeInput;
}

function parseSort(value: string | null): LocalResumeSort {
	if (value === "createdAt" || value === "name") return value;
	return "lastUpdatedAt";
}

function parseTags(query: URLSearchParams): string[] {
	return query
		.getAll("tags")
		.flatMap((value) => value.split(","))
		.map((value) => value.trim())
		.filter(Boolean);
}

function errorStatus(error: unknown): number {
	if (!(error instanceof Error)) return 500;
	if (error.message.includes("not found")) return 404;
	if (error.message === "RESUME_LOCKED" || error.message === "RESUME_SLUG_ALREADY_EXISTS") return 409;
	if (error.message.startsWith("INVALID_")) return 400;
	return 500;
}
