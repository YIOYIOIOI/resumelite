import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { TranslateIcon } from "@phosphor-icons/react";
import { SidebarMenuButton, SidebarMenuItem } from "@resumelite/ui/components/sidebar";
import { loadLocale, setLocaleCookie } from "@/libs/locale";

// Native language names — shown as-is (not translated), the usual convention for a
// language switcher so speakers of either language recognize their own.
const NATIVE_LABEL = { "en-US": "English", "zh-CN": "中文" } as const;

export function LanguageToggle() {
	const { i18n } = useLingui();
	const current: keyof typeof NATIVE_LABEL = i18n.locale.startsWith("zh") ? "zh-CN" : "en-US";
	const next = current === "zh-CN" ? "en-US" : "zh-CN";

	const handleToggle = async () => {
		setLocaleCookie(next);
		await loadLocale(next);
		window.location.reload();
	};

	return (
		<SidebarMenuItem>
			<SidebarMenuButton type="button" onClick={handleToggle} tooltip={i18n.t(msg`Switch language`)}>
				<TranslateIcon />
				<span className="shrink-0 transition-[margin,opacity] duration-200 ease-in-out group-data-[collapsible=icon]:-ms-8 group-data-[collapsible=icon]:opacity-0">
					{NATIVE_LABEL[current]}
				</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
