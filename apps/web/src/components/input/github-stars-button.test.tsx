// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

const { GithubStarsButton } = await import("./github-stars-button");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

const renderButton = () =>
	render(
		<I18nProvider i18n={i18n}>
			<GithubStarsButton />
		</I18nProvider>,
	);

describe("GithubStarsButton", () => {
	it("renders an anchor pointing at the project repo with rel=noopener noreferrer and target=_blank", () => {
		renderButton();
		const link = screen.getByRole("button") as HTMLAnchorElement;
		expect(link.href).toBe("https://github.com/amruthpillai/reactive-resume");
		expect(link.target).toBe("_blank");
		expect(link.rel).toBe("noopener noreferrer");
	});

	it("uses the no-count aria-label when star count hasn't loaded yet", () => {
		renderButton();
		const link = screen.getByRole("button") as HTMLAnchorElement;
		expect(link.getAttribute("aria-label")).toBe("Star us on GitHub (opens in new tab)");
	});

	it("does not render a CountUp when star count is undefined", () => {
		renderButton();
		expect(screen.queryByTestId("count-up")).toBeNull();
	});
});
