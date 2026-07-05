import type { LocalExperienceListItem } from "@/features/project/local/storage";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon, GridFourIcon, ListIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import z from "zod";
import { Label } from "@resumelite/ui/components/label";
import { Separator } from "@resumelite/ui/components/separator";
import { Tabs, TabsList, TabsTrigger } from "@resumelite/ui/components/tabs";
import { cn } from "@resumelite/utils/style";
import { Combobox } from "@/components/ui/combobox";
import { listLocalExperiences, listLocalExperienceTags } from "@/features/project/local/storage";
import { DashboardHeader } from "../-components/header";
import { GridView } from "./-components/grid-view";
import { ListView } from "./-components/list-view";

type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
	tags: z.array(z.string()).default([]),
	sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).default("lastUpdatedAt"),
	view: z.enum(["grid", "list"]).default("grid"),
});

type Search = z.output<typeof searchSchema>;

const defaultSearch: Search = { tags: [], sort: "lastUpdatedAt", view: "grid" };

export const Route = createFileRoute("/dashboard/experiences/")({
	component: RouteComponent,
	validateSearch: searchSchema,
	search: {
		middlewares: [stripSearchParams(defaultSearch)],
	},
});

function RouteComponent() {
	const { i18n } = useLingui();
	const { tags, sort, view } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const queryClient = useQueryClient();

	const experiencesQuery = useQuery({
		queryKey: ["local-experiences", { sort, tags }],
		queryFn: async () => {
			const [allTags, experiences] = await Promise.all([
				listLocalExperienceTags(),
				listLocalExperiences({ tags, sort }),
			]);
			return { allTags, experiences };
		},
	});

	const allTags = experiencesQuery.data?.allTags ?? [];
	const experiences: LocalExperienceListItem[] = experiencesQuery.data?.experiences ?? [];

	const onLocalChange = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: ["local-experiences"] });
	}, [queryClient]);

	const tagOptions = useMemo(() => allTags.map((tag) => ({ value: tag, label: tag })), [allTags]);

	const sortOptions = useMemo(() => {
		return [
			{ value: "lastUpdatedAt", label: i18n.t("Last Updated") },
			{ value: "createdAt", label: i18n.t("Created") },
			{ value: "name", label: i18n.t("Name") },
		];
	}, [i18n]);

	return (
		<div className="space-y-4">
			<DashboardHeader icon={BriefcaseIcon} title={t`Project Experiences`} />

			<Separator />

			<div className="flex items-center gap-x-4">
				<div className="flex gap-2">
					<Label>
						<Trans>Sort by</Trans>
					</Label>
					<Combobox
						value={sort}
						options={sortOptions}
						placeholder={t`Sort by`}
						onValueChange={(value) => {
							if (!value) return;
							void navigate({ search: (prev: Search) => ({ ...prev, sort: value as SortOption }) });
						}}
					/>
				</div>

				<div className={cn("flex gap-2", { hidden: tagOptions.length === 0 })}>
					<Label>
						<Trans>Filter by</Trans>
					</Label>
					<Combobox
						multiple
						value={tags}
						options={tagOptions}
						placeholder={t`Filter by`}
						onValueChange={(value) => {
							void navigate({ search: (prev: Search) => ({ ...prev, tags: value ?? [] }) });
						}}
					/>
				</div>

				<Tabs className="ltr:ms-auto rtl:me-auto" value={view}>
					<TabsList>
						<TabsTrigger
							value="grid"
							nativeButton={false}
							className="rounded-r-none"
							render={<Link to="." search={(prev: Search) => ({ ...prev, view: "grid" })} />}
						>
							<GridFourIcon />
							<Trans>Grid</Trans>
						</TabsTrigger>

						<TabsTrigger
							value="list"
							nativeButton={false}
							className="rounded-l-none"
							render={<Link to="." search={(prev: Search) => ({ ...prev, view: "list" })} />}
						>
							<ListIcon />
							<Trans>List</Trans>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{view === "list" ? (
				<ListView experiences={experiences} onLocalChange={onLocalChange} />
			) : (
				<GridView experiences={experiences} onLocalChange={onLocalChange} />
			)}
		</div>
	);
}
