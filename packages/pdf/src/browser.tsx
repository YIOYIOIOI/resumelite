import type { ResumeData } from "@resumelite/schema/resume/data";
import type { Template } from "@resumelite/schema/templates";
import type { SectionTitleResolver } from "./section-title";
import { createElement } from "react";
import { ResumeDocument } from "./document";
import { pdf } from "./renderer";

type CreateResumePdfBlobOptions = {
	data: ResumeData;
	template?: Template | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export const createResumePdfBlob = async ({ data, template, resolveSectionTitle }: CreateResumePdfBlobOptions) => {
	const document = createElement(ResumeDocument, {
		data,
		template: template ?? data.metadata.template,
		resolveSectionTitle,
	}) as Parameters<typeof pdf>[0];

	return pdf(document).toBlob();
};
