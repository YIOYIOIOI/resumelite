import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { getQueryClient } from "./client";

describe("getQueryClient", () => {
	it("returns a QueryClient instance", () => {
		const client = getQueryClient();
		expect(client).toBeInstanceOf(QueryClient);
	});

	it("returns a fresh client on each call", () => {
		const a = getQueryClient();
		const b = getQueryClient();
		expect(a).not.toBe(b);
	});

	it("uses local React Query timing defaults", () => {
		const client = getQueryClient();
		const queries = client.getDefaultOptions().queries;

		expect(queries?.gcTime).toBe(5 * 60 * 1000);
		expect(queries?.staleTime).toBe(60 * 1000);
		expect(queries?.queryKeyHashFn).toBeUndefined();
		expect(client.getDefaultOptions().dehydrate).toBeUndefined();
		expect(client.getDefaultOptions().hydrate).toBeUndefined();
	});
});
