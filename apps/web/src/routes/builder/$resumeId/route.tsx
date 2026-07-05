import type React from "react";
import type { Layout } from "react-resizable-panels";
import type { BuilderLayout } from "./-store/sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Cookies from "js-cookie";
import { useEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";
import { ResizableGroup, ResizablePanel, ResizableSeparator } from "@resumelite/ui/components/resizable";
import {
	useBuilderResumeUpdateSubscription,
	useResumeCleanup,
	useResumeStore,
	useSyncResumeFromLoader,
} from "@/features/resume/builder/draft";
import { getLocalResumeById } from "@/features/resume/local/storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { createNoindexFollowMeta } from "@/libs/seo";
import { BuilderHeader } from "./-components/header";
import { BuilderSidebarLeft } from "./-sidebar/left";
import { BuilderSidebarRight } from "./-sidebar/right";
import {
	BUILDER_LAYOUT_COOKIE_NAME,
	DEFAULT_BUILDER_LAYOUT,
	mapPanelLayoutToBuilderLayout,
	parseBuilderLayoutCookie,
	useBuilderSidebar,
	useBuilderSidebarStore,
} from "./-store/sidebar";

export const Route = createFileRoute("/builder/$resumeId")({
	ssr: false,
	component: RouteComponent,
	loader: async ({ params }) => {
		const resume = await getLocalResumeById(params.resumeId);
		if (!resume) throw redirect({ to: "/dashboard/resumes", replace: true });
		const layout = getBuilderLayout();

		return { layout, name: resume.name, resume };
	},
	head: ({ loaderData }) => ({
		meta: loaderData
			? [{ title: `${loaderData.name} - ResumeLite` }, createNoindexFollowMeta()]
			: [createNoindexFollowMeta()],
	}),
});

function RouteComponent() {
	const { layout: initialLayout, resume } = Route.useLoaderData();

	const { resumeId } = Route.useParams();
	const syncResumeFromLoader = useSyncResumeFromLoader();
	const isReady = useResumeStore((state) => state.isReady);
	const initializedResumeId = useResumeStore((state) => state.resumeId);
	const isInitialized = isReady && initializedResumeId === resumeId;

	useResumeCleanup();
	useBuilderResumeUpdateSubscription();

	useEffect(() => {
		syncResumeFromLoader(resume);
	}, [syncResumeFromLoader, resume]);

	if (!isInitialized) return null;

	return <BuilderLayoutShell initialLayout={initialLayout} />;
}

type BuilderLayoutShellProps = React.ComponentProps<"div"> & {
	initialLayout: BuilderLayout;
};

function BuilderLayoutShell({ initialLayout }: BuilderLayoutShellProps) {
	const isMobile = useIsMobile();
	const canPersistLayoutRef = useRef(false);

	const leftSidebarRef = usePanelRef();
	const rightSidebarRef = usePanelRef();

	const setLeftSidebar = useBuilderSidebarStore((state) => state.setLeftSidebar);
	const setRightSidebar = useBuilderSidebarStore((state) => state.setRightSidebar);
	const setLayout = useBuilderSidebarStore((state) => state.setLayout);

	const { maxSidebarSize, minSidebarSize, collapsedSidebarSize, groupResizeBehavior } = useBuilderSidebar((state) => ({
		maxSidebarSize: state.maxSidebarSize,
		minSidebarSize: state.minSidebarSize,
		collapsedSidebarSize: state.collapsedSidebarSize,
		groupResizeBehavior: state.groupResizeBehavior,
	}));

	useEffect(() => {
		setLayout(initialLayout);
		canPersistLayoutRef.current = true;
	}, [initialLayout, setLayout]);

	const onLayoutChanged = (layout: Layout) => {
		const nextLayout = mapPanelLayoutToBuilderLayout(layout);
		if (!canPersistLayoutRef.current) return;
		setLayout(nextLayout);
		setBuilderLayout(nextLayout);
	};

	useEffect(() => {
		if (!leftSidebarRef || !rightSidebarRef) return;

		setLeftSidebar(leftSidebarRef);
		setRightSidebar(rightSidebarRef);
	}, [leftSidebarRef, rightSidebarRef, setLeftSidebar, setRightSidebar]);

	const sidebarMinSize = isMobile ? "0%" : `${minSidebarSize}px`;
	const sidebarCollapsedSize = isMobile ? "0%" : `${collapsedSidebarSize}px`;
	const leftSidebarSize = isMobile ? "0%" : `${initialLayout.left}%`;
	const rightSidebarSize = isMobile ? "0%" : `${initialLayout.right}%`;
	const artboardSize = isMobile ? "100%" : `${initialLayout.artboard}%`;

	return (
		<div className="flex h-svh flex-col">
			<BuilderHeader />

			<ResizableGroup orientation="horizontal" className="mt-14 flex-1" onLayoutChanged={onLayoutChanged}>
				<ResizablePanel
					collapsible
					id="left"
					panelRef={leftSidebarRef}
					groupResizeBehavior={groupResizeBehavior}
					maxSize={maxSidebarSize}
					minSize={sidebarMinSize}
					collapsedSize={sidebarCollapsedSize}
					defaultSize={leftSidebarSize}
					className="z-20 h-[calc(100svh-3.5rem)]"
				>
					<BuilderSidebarLeft />
				</ResizablePanel>
				<ResizableSeparator withHandle className="z-50 border-s" />
				<ResizablePanel id="artboard" defaultSize={artboardSize} className="h-[calc(100svh-3.5rem)]">
					<Outlet />
				</ResizablePanel>
				<ResizableSeparator withHandle className="z-50 border-e" />
				<ResizablePanel
					collapsible
					id="right"
					panelRef={rightSidebarRef}
					groupResizeBehavior={groupResizeBehavior}
					maxSize={maxSidebarSize}
					minSize={sidebarMinSize}
					collapsedSize={sidebarCollapsedSize}
					defaultSize={rightSidebarSize}
					className="z-20 h-[calc(100svh-3.5rem)]"
				>
					<BuilderSidebarRight />
				</ResizablePanel>
			</ResizableGroup>
		</div>
	);
}

const setBuilderLayout = (data: BuilderLayout) => {
	const layout = parseBuilderLayoutCookie(JSON.stringify(data));
	Cookies.set(BUILDER_LAYOUT_COOKIE_NAME, JSON.stringify(layout), { path: "/" });
};

const getBuilderLayout = (): BuilderLayout => {
	const layout = Cookies.get(BUILDER_LAYOUT_COOKIE_NAME);
	if (!layout) return DEFAULT_BUILDER_LAYOUT;
	return parseBuilderLayoutCookie(layout);
};
