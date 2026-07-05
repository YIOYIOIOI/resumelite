import z from "zod";

export const experienceDialogSchemas = [
	z.object({ type: z.literal("experience.create"), data: z.undefined() }),
	z.object({ type: z.literal("experience.update"), data: z.object({ id: z.string() }) }),
] as const;
