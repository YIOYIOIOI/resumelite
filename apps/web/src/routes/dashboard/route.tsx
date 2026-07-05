import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { SidebarProvider } from "@resumelite/ui/components/sidebar";
import { createNoindexFollowMeta } from "@/libs/seo";
import { getDashboardSidebarState, setDashboardSidebarState } from "./-components/functions";
import { DashboardSidebar } from "./-components/sidebar";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	loader: async () => {
		const sidebarState = getDashboardSidebarState();
		return { sidebarState };
	},
	head: () => ({
		meta: [createNoindexFollowMeta()],
	}),
});

function RouteComponent() {
	const router = useRouter();
	const { sidebarState } = Route.useLoaderData();

	const handleSidebarOpenChange = (open: boolean) => {
		setDashboardSidebarState(open);
		void router.invalidate();
	};

	return (
		<SidebarProvider open={sidebarState} onOpenChange={handleSidebarOpenChange}>
			<DashboardSidebar />

			<main className="@container flex-1 p-4 md:ps-2">
				<Outlet />
			</main>
		</SidebarProvider>
	);
}
