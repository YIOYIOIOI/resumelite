import type { ExperienceData } from "@resumelite/schema/project/data";
import type {
	CreateLocalExperienceInput,
	LocalExperience,
	LocalExperienceListItem,
	LocalExperienceSort,
	UpdateLocalExperienceInput,
} from "./types";
import { copyFile, mkdir, open, readFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { experienceDataSchema } from "@resumelite/schema/project/data";
import { defaultExperienceData } from "@resumelite/schema/project/default";
import { LOCAL_EXPERIENCE_ID_PREFIX } from "./types";

type PersistedLocalExperience = Omit<LocalExperience, "createdAt" | "updatedAt"> & {
	createdAt: string;
	updatedAt: string;
};

type ExperienceFile = {
	version: 1;
	experiences: PersistedLocalExperience[];
};

type FileExperienceRepositoryOptions = {
	filePath: string;
	now?: () => Date;
	randomId?: () => string;
};

export type FileExperienceRepository = ReturnType<typeof createFileExperienceRepository>;

export function createFileExperienceRepository({
	filePath,
	now = () => new Date(),
	randomId = createRandomId,
}: FileExperienceRepositoryOptions) {
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

	const readExperiences = async (): Promise<LocalExperience[]> => {
		const file = await readExperienceFile(filePath);
		return file.experiences.flatMap((value, index) => {
			const experience = reviveExperience(value);
			if (!experience) {
				// Never silently drop data: surface which entry was rejected so a bad
				// experience can be investigated instead of quietly disappearing on next write.
				console.warn(`[local-experiences] skipping invalid experience at index ${index} in ${filePath}`);
				return [];
			}
			return [experience];
		});
	};

	const writeExperiences = async (experiences: LocalExperience[]) => {
		await writeExperienceFile(filePath, {
			version: 1,
			experiences: experiences.map(persistExperience),
		});
	};

	const assertSlugAvailable = async (slug: string, ignoreId?: string, experiences?: LocalExperience[]) => {
		const existing = experiences ?? (await readExperiences());
		const conflict = existing.find((experience) => experience.slug === slug && experience.id !== ignoreId);
		if (conflict) throw new Error("EXPERIENCE_SLUG_ALREADY_EXISTS");
	};

	return {
		async list(input: { tags: string[]; sort: LocalExperienceSort }): Promise<LocalExperienceListItem[]> {
			return runSequentially(async () =>
				sortLocalExperiences(filterByTags(await readExperiences(), input.tags), input.sort).map(toListItem),
			);
		},

		async listTags(): Promise<string[]> {
			return runSequentially(async () => {
				const tags = new Set((await readExperiences()).flatMap((experience) => experience.tags));
				return Array.from(tags).sort((a, b) => a.localeCompare(b));
			});
		},

		async getById(id: string): Promise<LocalExperience | null> {
			return runSequentially(async () => {
				const experience = (await readExperiences()).find((experience) => experience.id === id);
				return experience ? cloneExperience(experience) : null;
			});
		},

		async create(input: CreateLocalExperienceInput): Promise<LocalExperience> {
			return runSequentially(async () => {
				const experiences = await readExperiences();
				await assertSlugAvailable(input.slug, undefined, experiences);

				const timestamp = now();
				const experience: LocalExperience = {
					id: randomId(),
					name: input.name,
					slug: input.slug,
					tags: [...input.tags],
					data: cloneExperienceData(input.data ?? defaultExperienceData),
					createdAt: timestamp,
					updatedAt: timestamp,
				};

				await writeExperiences([...experiences, experience]);
				return cloneExperience(experience);
			});
		},

		async update(id: string, input: UpdateLocalExperienceInput): Promise<LocalExperience> {
			return runSequentially(async () => {
				const experiences = await readExperiences();
				const index = experiences.findIndex((experience) => experience.id === id);
				if (index === -1) throw new Error(`Local experience not found: ${id}`);

				if (input.slug !== undefined) await assertSlugAvailable(input.slug, id, experiences);

				const existing = experiences[index];
				const updated: LocalExperience = {
					...existing,
					...(input.name !== undefined ? { name: input.name } : {}),
					...(input.slug !== undefined ? { slug: input.slug } : {}),
					...(input.tags !== undefined ? { tags: [...input.tags] } : {}),
					...(input.data !== undefined ? { data: cloneExperienceData(input.data) } : {}),
					updatedAt: now(),
				};

				const next = [...experiences];
				next[index] = updated;
				await writeExperiences(next);
				return cloneExperience(updated);
			});
		},

		async duplicate(
			id: string,
			input: Pick<CreateLocalExperienceInput, "name" | "slug" | "tags">,
		): Promise<LocalExperience> {
			return runSequentially(async () => {
				const experiences = await readExperiences();
				const source = experiences.find((experience) => experience.id === id);
				if (!source) throw new Error(`Local experience not found: ${id}`);
				await assertSlugAvailable(input.slug, undefined, experiences);

				const timestamp = now();
				const duplicate: LocalExperience = {
					id: randomId(),
					name: input.name,
					slug: input.slug,
					tags: [...input.tags],
					data: cloneExperienceData(source.data),
					createdAt: timestamp,
					updatedAt: timestamp,
				};

				await writeExperiences([...experiences, duplicate]);
				return cloneExperience(duplicate);
			});
		},

		async delete(id: string): Promise<void> {
			return runSequentially(async () => {
				const experiences = await readExperiences();
				const experience = experiences.find((experience) => experience.id === id);
				if (!experience) throw new Error(`Local experience not found: ${id}`);

				await writeExperiences(experiences.filter((experience) => experience.id !== id));
			});
		},
	};
}

function parseExperienceFile(raw: string): ExperienceFile {
	const parsed: unknown = JSON.parse(raw);
	if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.experiences)) {
		throw new Error("INVALID_LOCAL_EXPERIENCE_FILE");
	}

	return {
		version: 1,
		experiences: parsed.experiences as PersistedLocalExperience[],
	};
}

async function readExperienceFile(filePath: string): Promise<ExperienceFile> {
	try {
		return parseExperienceFile(await readFile(filePath, "utf8"));
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") return { version: 1, experiences: [] };

		// experiences.json exists but is unreadable/corrupt (e.g. a truncated write after a
		// crash). Fall back to the one-generation backup before failing, so a single bad
		// file doesn't brick every subsequent read/write.
		try {
			const recovered = parseExperienceFile(await readFile(`${filePath}.bak`, "utf8"));
			console.warn(
				`[local-experiences] ${filePath} was unreadable (${
					error instanceof Error ? error.message : "unknown error"
				}); recovered from ${filePath}.bak`,
			);
			return recovered;
		} catch {
			throw error;
		}
	}
}

async function writeExperienceFile(filePath: string, file: ExperienceFile): Promise<void> {
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

function reviveExperience(value: unknown): LocalExperience | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<PersistedLocalExperience>;

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

	// Structural validation of the content payload. Enum drift is coerced (schema .catch),
	// but a genuinely broken payload fails here and the row is logged+skipped by the caller
	// rather than silently rewritten with blanked fields.
	const data = experienceDataSchema.safeParse(candidate.data);
	if (!data.success) return null;

	return {
		id: candidate.id,
		name: candidate.name,
		slug: candidate.slug,
		tags: candidate.tags.filter((tag): tag is string => typeof tag === "string"),
		data: data.data,
		createdAt,
		updatedAt,
	};
}

function persistExperience(experience: LocalExperience): PersistedLocalExperience {
	return {
		...experience,
		data: cloneExperienceData(experience.data),
		tags: [...experience.tags],
		createdAt: experience.createdAt.toISOString(),
		updatedAt: experience.updatedAt.toISOString(),
	};
}

function cloneExperience(experience: LocalExperience): LocalExperience {
	return {
		...experience,
		tags: [...experience.tags],
		data: cloneExperienceData(experience.data),
		createdAt: new Date(experience.createdAt),
		updatedAt: new Date(experience.updatedAt),
	};
}

function cloneExperienceData(data: ExperienceData): ExperienceData {
	return experienceDataSchema.parse(structuredClone(data));
}

function filterByTags(experiences: LocalExperience[], tags: string[]): LocalExperience[] {
	if (tags.length === 0) return experiences;
	return experiences.filter((experience) => tags.every((tag) => experience.tags.includes(tag)));
}

function sortLocalExperiences(experiences: LocalExperience[], sort: LocalExperienceSort): LocalExperience[] {
	return [...experiences].sort((a, b) => {
		if (sort === "name") return a.name.localeCompare(b.name);
		if (sort === "createdAt") return a.createdAt.getTime() - b.createdAt.getTime();
		return b.updatedAt.getTime() - a.updatedAt.getTime();
	});
}

function toListItem(experience: LocalExperience): LocalExperienceListItem {
	return {
		id: experience.id,
		name: experience.name,
		slug: experience.slug,
		tags: [...experience.tags],
		nature: experience.data.nature,
		stage: experience.data.stage,
		createdAt: new Date(experience.createdAt),
		updatedAt: new Date(experience.updatedAt),
	};
}

function createRandomId(): string {
	return `${LOCAL_EXPERIENCE_ID_PREFIX}${globalThis.crypto.randomUUID()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error !== null && typeof error === "object" && "code" in error;
}
