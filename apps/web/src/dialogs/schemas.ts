import z from "zod";
import { experienceDialogSchemas } from "./project/schema";
import { resumeDialogSchemas } from "./resume/schema";

export const dialogSchemaRegistries = [
	{ domain: "resume", schemas: resumeDialogSchemas },
	{ domain: "experience", schemas: experienceDialogSchemas },
] as const;

// Load-bearing: the discriminated union is built from this spread, not from
// dialogSchemaRegistries. Every dialog domain MUST be spread here or its DialogProps<T>
// resolve to `never`.
const dialogSchemaEntries = [...resumeDialogSchemas, ...experienceDialogSchemas] as const;

export const dialogTypeSchema = z.discriminatedUnion("type", dialogSchemaEntries);

export type DialogSchema = z.infer<typeof dialogTypeSchema>;
export type DialogType = DialogSchema["type"];

export type DialogData<T extends DialogType> = Extract<DialogSchema, { type: T }>["data"];

type DialogPropsData<T extends DialogType> =
	DialogData<T> extends undefined ? Record<string, never> : { data: DialogData<T> };

export type DialogProps<T extends DialogType> = DialogPropsData<T>;
