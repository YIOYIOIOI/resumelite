import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PlusIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CommandItem, CommandShortcut } from "@resumelite/ui/components/command";
import { Kbd } from "@resumelite/ui/components/kbd";
import { createUntitledLocalResume, listLocalResumes } from "@/features/resume/local/storage";
import { useCommandPaletteStore } from "../store";
import { BaseCommandGroup } from "./base";

export function ResumesCommandGroup() {
	const navigate = useNavigate();
	const reset = useCommandPaletteStore((state) => state.reset);
	const peekPage = useCommandPaletteStore((state) => state.peekPage);
	const pushPage = useCommandPaletteStore((state) => state.pushPage);

	const isResumesPage = peekPage() === "resumes";
	const resumesQuery = useQuery({
		queryKey: ["command-palette", "local-resumes", isResumesPage],
		queryFn: () => listLocalResumes({ tags: [], sort: "lastUpdatedAt" }),
		enabled: isResumesPage,
	});
	const resumes = resumesQuery.data ?? [];

	const onCreate = async () => {
		const resume = await createUntitledLocalResume();
		await navigate({ to: "/builder/$resumeId", params: { resumeId: resume.id } });
		reset();
	};

	const onNavigate = async (path: string) => {
		await navigate({ to: path });
		reset();
	};

	return (
		<>
			<BaseCommandGroup heading={<Trans>Search for…</Trans>}>
				<CommandItem keywords={[t`Resumes`]} value="search.resumes" onSelect={() => pushPage("resumes")}>
					<ReadCvLogoIcon />
					<Trans>Resumes</Trans>
				</CommandItem>
			</BaseCommandGroup>

			<BaseCommandGroup page="resumes" heading={<Trans>Resumes</Trans>}>
				<CommandItem onSelect={onCreate}>
					<PlusIcon />
					<Trans>Create a new resume</Trans>
				</CommandItem>

				{resumes.map((resume) => (
					<CommandItem
						key={resume.id}
						value={resume.id}
						keywords={[resume.name]}
						onSelect={() => onNavigate(`/builder/${resume.id}`)}
					>
						<ReadCvLogoIcon />
						{resume.name}

						<CommandShortcut className="opacity-0 transition-opacity group-data-[selected=true]/command-item:opacity-100">
							<Trans comment="Command palette hint that pressing Enter opens the selected resume">
								Press <Kbd>Enter</Kbd> to open
							</Trans>
						</CommandShortcut>
					</CommandItem>
				))}
			</BaseCommandGroup>
		</>
	);
}
