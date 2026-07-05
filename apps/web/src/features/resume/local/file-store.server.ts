import type { ResumeData } from "@resumelite/schema/resume/data";
import type {
	CreateLocalResumeInput,
	LocalResume,
	LocalResumeListItem,
	LocalResumeSort,
	UpdateLocalResumeInput,
} from "./types";
import { copyFile, mkdir, open, readFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { defaultResumeData } from "@resumelite/schema/resume/default";
import { templateSchema } from "@resumelite/schema/templates";
import { LOCAL_RESUME_ID_PREFIX } from "./types";

type PersistedLocalResume = Omit<LocalResume, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
};

type ResumeFile = {
	version: 1;
	resumes: PersistedLocalResume[];
};

type FileResumeRepositoryOptions = {
	filePath: string;
	now?: () => Date;
	randomId?: () => string;
};

type LocalResumeBackup = {
	version: 1;
	resumes: unknown[];
};

export type FileResumeRepository = ReturnType<typeof createFileResumeRepository>;

export function createFileResumeRepository({
	filePath,
	now = () => new Date(),
	randomId = createRandomId,
}: FileResumeRepositoryOptions) {
	let queue: Promise<void> = Promise.resolve();

	const runSequentially = async <T>(operation: () => Promise<T>): Promise<T> => {
		const previous = queue;
		let release: () => void = () => {};
		queue = new Promise((resolve) => {
			release = resolve;
		});

		await previous;

		try {
			return await operation();
		} finally {
			release();
		}
	};

	const readResumes = async (): Promise<LocalResume[]> => {
		const file = await readResumeFile(filePath);
		return file.resumes.flatMap((value, index) => {
			const resume = reviveResume(value);
			if (!resume) {
				// Never silently drop data: surface which entry was rejected so a bad
				// resume can be investigated instead of quietly disappearing on next write.
				console.warn(`[local-resumes] skipping invalid resume at index ${index} in ${filePath}`);
				return [];
			}
			return [resume];
		});
	};

	const writeResumes = async (resumes: LocalResume[]) => {
		await writeResumeFile(filePath, {
			version: 1,
			resumes: resumes.map(persistResume),
		});
	};

	const assertSlugAvailable = async (slug: string, ignoreId?: string, resumes?: LocalResume[]) => {
		const existingResumes = resumes ?? (await readResumes());
		const conflict = existingResumes.find((resume) => resume.slug === slug && resume.id !== ignoreId);
		if (conflict) throw new Error("RESUME_SLUG_ALREADY_EXISTS");
	};

	return {
		async list(input: { tags: string[]; sort: LocalResumeSort }): Promise<LocalResumeListItem[]> {
			return runSequentially(async () =>
				sortLocalResumes(filterByTags(await readResumes(), input.tags), input.sort).map(toListItem),
			);
		},

		async listTags(): Promise<string[]> {
			return runSequentially(async () => {
				const tags = new Set((await readResumes()).flatMap((resume) => resume.tags));
				return Array.from(tags).sort((a, b) => a.localeCompare(b));
			});
		},

		async getById(id: string): Promise<LocalResume | null> {
			return runSequentially(async () => {
				const resume = (await readResumes()).find((resume) => resume.id === id);
				return resume ? cloneResume(resume) : null;
			});
		},

		async create(input: CreateLocalResumeInput): Promise<LocalResume> {
			return runSequentially(async () => {
				const resumes = await readResumes();
				await assertSlugAvailable(input.slug, undefined, resumes);

				const timestamp = now();
				const resume: LocalResume = {
					id: randomId(),
					name: input.name,
					slug: input.slug,
					tags: [...input.tags],
					data: cloneResumeData(input.data ?? defaultResumeData),
					isLocked: false,
					createdAt: timestamp,
					updatedAt: timestamp,
				};

				await writeResumes([...resumes, resume]);
				return cloneResume(resume);
			});
		},

		async update(id: string, input: UpdateLocalResumeInput): Promise<LocalResume> {
			return runSequentially(async () => {
				const resumes = await readResumes();
				const index = resumes.findIndex((resume) => resume.id === id);
				if (index === -1) throw new Error(`Local resume not found: ${id}`);

				const existing = resumes[index];
				if (existing.isLocked && !isOnlyLockToggle(input)) throw new Error("RESUME_LOCKED");
				if (input.slug !== undefined) await assertSlugAvailable(input.slug, id, resumes);

				const updated: LocalResume = {
					...existing,
					...(input.name !== undefined ? { name: input.name } : {}),
					...(input.slug !== undefined ? { slug: input.slug } : {}),
					...(input.tags !== undefined ? { tags: [...input.tags] } : {}),
					...(input.data !== undefined ? { data: cloneResumeData(input.data) } : {}),
					...(input.isLocked !== undefined ? { isLocked: input.isLocked } : {}),
					updatedAt: now(),
				};

				const next = [...resumes];
				next[index] = updated;
				await writeResumes(next);
				return cloneResume(updated);
			});
		},

		async duplicate(id: string, input: Pick<CreateLocalResumeInput, "name" | "slug" | "tags">): Promise<LocalResume> {
			return runSequentially(async () => {
				const resumes = await readResumes();
				const source = resumes.find((resume) => resume.id === id);
				if (!source) throw new Error(`Local resume not found: ${id}`);
				await assertSlugAvailable(input.slug, undefined, resumes);

				const timestamp = now();
				const duplicate: LocalResume = {
					id: randomId(),
					name: input.name,
					slug: input.slug,
					tags: [...input.tags],
					data: cloneResumeData(source.data),
					isLocked: false,
					createdAt: timestamp,
					updatedAt: timestamp,
				};

				await writeResumes([...resumes, duplicate]);
				return cloneResume(duplicate);
			});
		},

		async delete(id: string): Promise<void> {
			return runSequentially(async () => {
				const resumes = await readResumes();
				const resume = resumes.find((resume) => resume.id === id);
				if (!resume) throw new Error(`Local resume not found: ${id}`);
				if (resume.isLocked) throw new Error("RESUME_LOCKED");

				await writeResumes(resumes.filter((resume) => resume.id !== id));
			});
		},

		async importBackup(value: unknown): Promise<LocalResume[]> {
			return runSequentially(async () => {
				const imported = parseLocalResumeBackup(value);
				if (imported.length === 0) return [];

				const existing = await readResumes();
				const nextById = new Map(existing.map((resume) => [resume.id, resume]));
				const slugOwners = new Map(existing.map((resume) => [resume.slug, resume.id]));
				const storedImports: LocalResume[] = [];

				for (const resume of imported) {
					const current = nextById.get(resume.id);
					if (current) slugOwners.delete(current.slug);

					const next: LocalResume = {
						...resume,
						slug: resolveImportedSlug(resume.slug, resume.id, slugOwners),
						tags: [...resume.tags],
						data: cloneResumeData(resume.data),
					};

					nextById.set(next.id, next);
					slugOwners.set(next.slug, next.id);
					storedImports.push(next);
				}

				await writeResumes([...nextById.values()]);
				return storedImports.map((resume) => cloneResume(resume));
			});
		},
	};
}

function parseResumeFile(raw: string): ResumeFile {
	const parsed: unknown = JSON.parse(raw);
	if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.resumes)) {
		throw new Error("INVALID_LOCAL_RESUME_FILE");
	}

	return {
		version: 1,
		resumes: parsed.resumes as PersistedLocalResume[],
	};
}

async function readResumeFile(filePath: string): Promise<ResumeFile> {
	try {
		return parseResumeFile(await readFile(filePath, "utf8"));
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") return { version: 1, resumes: [] };

		// resumes.json exists but is unreadable/corrupt (e.g. a truncated write after a
		// crash). Fall back to the one-generation backup before failing, so a single bad
		// file doesn't brick every subsequent read/write.
		try {
			const recovered = parseResumeFile(await readFile(`${filePath}.bak`, "utf8"));
			console.warn(
				`[local-resumes] ${filePath} was unreadable (${
					error instanceof Error ? error.message : "unknown error"
				}); recovered from ${filePath}.bak`,
			);
			return recovered;
		} catch {
			throw error;
		}
	}
}

async function writeResumeFile(filePath: string, file: ResumeFile): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });

	// Keep a one-generation backup of the last-known-good file before overwriting it.
	try {
		await copyFile(filePath, `${filePath}.bak`);
	} catch (error) {
		if (!isNodeError(error) || error.code !== "ENOENT") throw error;
	}

	// Unique temp name so two processes writing at once cannot corrupt a shared temp file.
	const tempPath = `${filePath}.${process.pid}.${globalThis.crypto.randomUUID()}.tmp`;
	const handle = await open(tempPath, "w");
	try {
		await handle.writeFile(`${JSON.stringify(file, null, 2)}\n`, "utf8");
		await handle.sync(); // flush data to disk before the rename makes it visible
	} finally {
		await handle.close();
	}

	await rename(tempPath, filePath);
	await fsyncDirectory(dirname(filePath));
}

async function fsyncDirectory(directory: string): Promise<void> {
	// Directory fsync makes the rename durable on POSIX. It is unsupported on Windows
	// (open() on a directory rejects), so treat it as best-effort.
	try {
		const handle = await open(directory, "r");
		try {
			await handle.sync();
		} finally {
			await handle.close();
		}
	} catch {
		// Ignore filesystems/platforms that reject directory fsync.
	}
}

function reviveResume(value: unknown): LocalResume | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<PersistedLocalResume>;

	if (
		typeof candidate.id !== "string" ||
		typeof candidate.name !== "string" ||
		typeof candidate.slug !== "string" ||
		!Array.isArray(candidate.tags) ||
		!candidate.data ||
		typeof candidate.createdAt !== "string" ||
		typeof candidate.updatedAt !== "string"
	) {
		return null;
	}

	const createdAt = new Date(candidate.createdAt);
	const updatedAt = new Date(candidate.updatedAt);
	if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) return null;

	return {
		id: candidate.id,
		name: candidate.name,
		slug: candidate.slug,
		tags: candidate.tags.filter((tag): tag is string => typeof tag === "string"),
		data: cloneResumeData(candidate.data as ResumeData),
		isLocked: candidate.isLocked ?? false,
		createdAt,
		updatedAt,
	};
}

function persistResume(resume: LocalResume): PersistedLocalResume {
	return {
		...resume,
		data: cloneResumeData(resume.data),
		tags: [...resume.tags],
		createdAt: resume.createdAt.toISOString(),
		updatedAt: resume.updatedAt.toISOString(),
	};
}

function cloneResume(resume: LocalResume): LocalResume {
	return {
		...resume,
		tags: [...resume.tags],
		data: cloneResumeData(resume.data),
		createdAt: new Date(resume.createdAt),
		updatedAt: new Date(resume.updatedAt),
	};
}

function cloneResumeListItem(resume: LocalResumeListItem): LocalResumeListItem {
	return {
		...resume,
		tags: [...resume.tags],
		createdAt: new Date(resume.createdAt),
		updatedAt: new Date(resume.updatedAt),
	};
}

function cloneResumeData(data: ResumeData): ResumeData {
	const clone = structuredClone(data);

	if (!templateSchema.safeParse(clone.metadata.template).success) {
		clone.metadata.template = defaultResumeData.metadata.template;
	}

	normalizeLocalPictureUrl(clone);

	return clone;
}

function normalizeLocalPictureUrl(data: ResumeData): void {
	if (data.metadata.template !== "ai-product") return;
	if (!data.picture.url.endsWith("/pictures/ai-product-resume-portrait.webp")) return;

	data.picture.url = data.picture.url.replace(/\.webp$/i, ".png");
}

function filterByTags(resumes: LocalResume[], tags: string[]): LocalResume[] {
	if (tags.length === 0) return resumes;
	return resumes.filter((resume) => tags.every((tag) => resume.tags.includes(tag)));
}

function sortLocalResumes(resumes: LocalResume[], sort: LocalResumeSort): LocalResume[] {
	return [...resumes].sort((a, b) => {
		if (sort === "name") return a.name.localeCompare(b.name);
		if (sort === "createdAt") return a.createdAt.getTime() - b.createdAt.getTime();
		return b.updatedAt.getTime() - a.updatedAt.getTime();
	});
}

function toListItem(resume: LocalResume): LocalResumeListItem {
	return cloneResumeListItem({
		id: resume.id,
		name: resume.name,
		slug: resume.slug,
		tags: resume.tags,
		isLocked: resume.isLocked,
		createdAt: resume.createdAt,
		updatedAt: resume.updatedAt,
	});
}

function parseLocalResumeBackup(value: unknown): LocalResume[] {
	if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.resumes)) {
		throw new Error("INVALID_LOCAL_RESUME_BACKUP");
	}

	return (value as LocalResumeBackup).resumes.map((item, index) => {
		const resume = reviveResume(item);
		if (!resume) throw new Error(`INVALID_LOCAL_RESUME_BACKUP_ITEM:${index + 1}`);
		return resume;
	});
}

function resolveImportedSlug(slug: string, id: string, slugOwners: Map<string, string>): string {
	const base = slug.trim() || `imported-resume-${Date.now()}`;
	let candidate = base;
	let suffix = 2;

	while (true) {
		const owner = slugOwners.get(candidate);
		if (!owner || owner === id) return candidate;

		candidate = `${base}-${suffix}`;
		suffix += 1;
	}
}

function isOnlyLockToggle(input: UpdateLocalResumeInput): boolean {
	return Object.keys(input).length === 1 && input.isLocked !== undefined;
}

function createRandomId(): string {
	return `${LOCAL_RESUME_ID_PREFIX}${globalThis.crypto.randomUUID()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error !== null && typeof error === "object" && "code" in error;
}
