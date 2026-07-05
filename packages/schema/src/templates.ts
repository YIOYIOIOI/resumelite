import z from "zod";

export const templateSchema = z.enum([
	"ai-product",
	"azurill",
	"bronzor",
	"chikorita",
	"ditgar",
	"ditto",
	"gengar",
	"glalie",
	"kakuna",
	"lapras",
	"leafish",
	"meowth",
	"onyx",
	"pikachu",
	"rhyhorn",
	"scizor",
]);

export type Template = z.infer<typeof templateSchema>;
