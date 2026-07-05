import { createRouter } from "@tanstack/react-router";
import { ErrorScreen } from "./components/layout/error-screen";
import { LoadingScreen } from "./components/layout/loading-screen";
import { NotFoundScreen } from "./components/layout/not-found-screen";
import { getLocale, loadLocale } from "./libs/locale";
import { getQueryClient } from "./libs/query/client";
import { getTheme } from "./libs/theme";
import { routeTree } from "./routeTree.gen";

export const getRouter = async () => {
	const queryClient = getQueryClient();

	const [theme, locale] = await Promise.all([getTheme(), getLocale()]);

	await loadLocale(locale);

	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		defaultViewTransition: true,
		defaultStructuralSharing: true,
		defaultErrorComponent: ErrorScreen,
		defaultPendingComponent: LoadingScreen,
		defaultNotFoundComponent: NotFoundScreen,
		context: { queryClient, theme, locale },
	});

	return router;
};
