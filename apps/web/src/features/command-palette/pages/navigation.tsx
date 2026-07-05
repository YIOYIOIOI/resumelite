import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { HouseSimpleIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { CommandItem } from "@resumelite/ui/components/command";
import { useCommandPaletteStore } from "../store";
import { BaseCommandGroup } from "./base";

export function NavigationCommandGroup() {
	const navigate = useNavigate();
	const reset = useCommandPaletteStore((state) => state.reset);

	const onNavigate = async (path: string) => {
		await navigate({ to: path });
		reset();
	};

	return (
		<BaseCommandGroup heading={<Trans>Go to…</Trans>}>
			<CommandItem keywords={[t`Home`]} value="navigation.home" onSelect={() => onNavigate("/")}>
				<HouseSimpleIcon />
				<Trans>Home</Trans>
			</CommandItem>

			<CommandItem keywords={[t`Resumes`]} value="navigation.resumes" onSelect={() => onNavigate("/dashboard/resumes")}>
				<ReadCvLogoIcon />
				<Trans>Resumes</Trans>
			</CommandItem>
		</BaseCommandGroup>
	);
}
