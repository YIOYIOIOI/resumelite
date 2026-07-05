// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Sidebar, SidebarProvider } from "@resumelite/ui/components/sidebar";
import { loadLocale, setLocaleCookie } from "@/libs/locale";
import { LanguageToggle } from "./language-toggle";

vi.mock("@/libs/locale", () => ({
	loadLocale: vi.fn().mockResolvedValue(undefined),
	setLocaleCookie: vi.fn(),
}));

const reload = vi.fn();

beforeAll(() => {
	Object.defineProperty(window, "location", {
		configurable: true,
		value: { ...window.location, reload },
	});
});

afterEach(() => {
	vi.clearAllMocks();
});

const renderToggle = () =>
	render(
		<I18nProvider i18n={i18n}>
			<SidebarProvider>
				<Sidebar>
					<LanguageToggle />
				</Sidebar>
			</SidebarProvider>
		</I18nProvider>,
	);

const clickToggle = async () => {
	const button = screen.getByText(/English|中文/).closest("button");
	await userEvent.click(button as HTMLButtonElement);
};

describe("LanguageToggle", () => {
	it("shows the active language natively (English) and switches to Chinese", async () => {
		i18n.loadAndActivate({ locale: "en", messages: {} });
		renderToggle();

		expect(screen.getByText("English")).toBeInTheDocument();

		await clickToggle();

		expect(setLocaleCookie).toHaveBeenCalledWith("zh-CN");
		expect(loadLocale).toHaveBeenCalledWith("zh-CN");
	});

	it("shows 中文 when a Chinese locale is active and switches back to English", async () => {
		i18n.loadAndActivate({ locale: "zh-CN", messages: {} });
		renderToggle();

		expect(screen.getByText("中文")).toBeInTheDocument();

		await clickToggle();

		expect(setLocaleCookie).toHaveBeenCalledWith("en-US");
		expect(loadLocale).toHaveBeenCalledWith("en-US");
	});
});
