import { useLocalDataLiveReload } from "./use-live-reload";

// Null-rendering component so the SSE subscription runs app-wide, inside the
// QueryClientProvider. Mounted once in the root route.
export function LocalDataLiveReload(): null {
	useLocalDataLiveReload();
	return null;
}
