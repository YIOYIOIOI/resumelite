export function getReadableErrorMessage(error: unknown, fallback: string): string {
	if (typeof error === "string" && error) return error;
	if (error instanceof Error && error.message) return error.message;
	return fallback;
}

type ErrorMessageByCode = Record<string, string>;
type ErrorWithCode = Error & { code?: string };

export function getCodedErrorMessage(
	error: unknown,
	options: {
		fallback: string;
		byCode?: ErrorMessageByCode;
		allowServerMessage?: boolean;
	},
): string {
	if (!(error instanceof Error)) return getReadableErrorMessage(error, options.fallback);
	const codedError = error as ErrorWithCode;

	const mappedMessage = codedError.code ? options.byCode?.[codedError.code] : undefined;
	if (mappedMessage) return mappedMessage;

	if (options.allowServerMessage && error.message) return error.message;
	return options.fallback;
}

export function getResumeErrorMessage(error: unknown): string {
	return getCodedErrorMessage(error, {
		byCode: {
			RESUME_SLUG_ALREADY_EXISTS: "A resume with this slug already exists.",
			RESUME_LOCKED: "This resume is locked. Unlock it first to make changes.",
		},
		fallback: "Something went wrong. Please try again.",
		allowServerMessage: true,
	});
}
