import { MutationCache, QueryClient } from "@tanstack/react-query";

export const getQueryClient = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				gcTime: 5 * 60 * 1000, // 5 minutes
				staleTime: 60 * 1000, // 1 minute
			},
		},
		mutationCache: new MutationCache({
			onSettled: (_1, _2, _3, _4, _5, context) => {
				if (context?.meta?.noInvalidate) return;
				void queryClient.invalidateQueries();
			},
		}),
	});

	return queryClient;
};
