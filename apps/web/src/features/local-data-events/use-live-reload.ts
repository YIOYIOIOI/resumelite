import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const RESOURCE_QUERY_KEY: Record<string, string> = {
	resumes: "local-resumes",
	experiences: "local-experiences",
};

export function useLocalDataLiveReload(): void {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (typeof EventSource === "undefined") return;

		const source = new EventSource("/api/local/events");

		source.onmessage = (event) => {
			let resource: string | undefined;
			try {
				resource = (JSON.parse(event.data) as { resource?: string }).resource;
			} catch {
				return; // ignore malformed frames
			}

			const queryKey = resource ? RESOURCE_QUERY_KEY[resource] : undefined;
			if (queryKey) void queryClient.invalidateQueries({ queryKey: [queryKey] });
		};

		return () => source.close();
	}, [queryClient]);
}
