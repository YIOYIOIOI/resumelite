// @vitest-environment happy-dom

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocalDataLiveReload } from "./use-live-reload";

class FakeEventSource {
	static instances: FakeEventSource[] = [];
	onmessage: ((event: { data: string }) => void) | null = null;
	url: string;
	closed = false;
	constructor(url: string) {
		this.url = url;
		FakeEventSource.instances.push(this);
	}
	close() {
		this.closed = true;
	}
	emit(data: string) {
		this.onmessage?.({ data });
	}
}

function Harness() {
	useLocalDataLiveReload();
	return null;
}

describe("useLocalDataLiveReload", () => {
	beforeEach(() => {
		FakeEventSource.instances = [];
		vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("invalidates the matching query key when a change event arrives", () => {
		const queryClient = new QueryClient();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");

		render(
			<QueryClientProvider client={queryClient}>
				<Harness />
			</QueryClientProvider>,
		);

		const source = FakeEventSource.instances[0];
		expect(source.url).toBe("/api/local/events");

		source.emit(JSON.stringify({ resource: "resumes" }));
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["local-resumes"] });

		source.emit(JSON.stringify({ resource: "experiences" }));
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ["local-experiences"] });
	});

	it("ignores unknown resources and malformed payloads", () => {
		const queryClient = new QueryClient();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");

		render(
			<QueryClientProvider client={queryClient}>
				<Harness />
			</QueryClientProvider>,
		);

		const source = FakeEventSource.instances[0];
		source.emit("not json");
		source.emit(JSON.stringify({ resource: "unknown" }));
		expect(invalidate).not.toHaveBeenCalled();
	});
});
