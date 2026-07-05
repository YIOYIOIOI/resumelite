import { describe, expect, it } from "vitest";
import { getCodedErrorMessage, getReadableErrorMessage, getResumeErrorMessage } from "./error-message";

class CodedError extends Error {
	constructor(
		public code: string,
		message = "",
	) {
		super(message);
	}
}

describe("getReadableErrorMessage", () => {
	it("returns the string error directly", () => {
		expect(getReadableErrorMessage("explicit error", "fallback")).toBe("explicit error");
	});

	it("returns Error.message", () => {
		expect(getReadableErrorMessage(new Error("boom"), "fallback")).toBe("boom");
	});

	it("returns fallback for unknown shapes", () => {
		expect(getReadableErrorMessage({ random: "object" }, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage(null, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage(undefined, "fallback")).toBe("fallback");
		expect(getReadableErrorMessage(42, "fallback")).toBe("fallback");
	});
});

describe("getCodedErrorMessage", () => {
	it("uses byCode mapping when present", () => {
		expect(
			getCodedErrorMessage(new CodedError("RESUME_LOCKED"), {
				fallback: "fallback",
				byCode: { RESUME_LOCKED: "It is locked." },
			}),
		).toBe("It is locked.");
	});

	it("returns server message when allowed", () => {
		expect(
			getCodedErrorMessage(new CodedError("OTHER", "Server-provided message"), {
				fallback: "fallback",
				allowServerMessage: true,
			}),
		).toBe("Server-provided message");
	});
});

describe("getResumeErrorMessage", () => {
	it("returns mapped message for RESUME_LOCKED", () => {
		expect(getResumeErrorMessage(new CodedError("RESUME_LOCKED"))).toBe(
			"This resume is locked. Unlock it first to make changes.",
		);
	});

	it("returns readable plain Error messages", () => {
		expect(getResumeErrorMessage(new Error("boom"))).toBe("boom");
	});
});
