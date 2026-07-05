import type { ResumeData } from "@resumelite/schema/resume/data";

const supportedPdfPictureExtensions = new Set([".jpeg", ".jpg", ".png"]);

const dataImageMimePattern = /^data:image\/(jpe?g|png);/i;

const getPicturePathname = (source: string) => {
	try {
		return new URL(source, "https://reactive-resume.local").pathname.toLowerCase();
	} catch {
		return source.split(/[?#]/)[0]?.toLowerCase() ?? "";
	}
};

const isPdfPictureSourceCompatible = (source: string) => {
	const trimmedSource = source.trim();
	if (trimmedSource === "") return false;
	if (trimmedSource.startsWith("data:image/")) return dataImageMimePattern.test(trimmedSource);

	const extension = getPicturePathname(trimmedSource).match(/\.[a-z0-9]+$/)?.[0];
	if (!extension) return true;

	return supportedPdfPictureExtensions.has(extension);
};

export const hasTemplatePicture = (picture: ResumeData["picture"]) =>
	!picture.hidden && isPdfPictureSourceCompatible(picture.url);
