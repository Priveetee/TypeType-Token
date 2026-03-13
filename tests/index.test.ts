import { describe, expect, it, mock } from "bun:test";
import type { SubtitleTrack } from "../src/subtitles.ts";
import type { TokenResult } from "../src/token-service.ts";

mock.module("../src/token-service.ts", () => ({
	fetchPoToken: mock(
		async (videoId: string): Promise<TokenResult> => ({
			poToken: `pot-${videoId}`,
			visitorData: "visitor-data",
			streamingPot: `stream-${videoId}`,
		}),
	),
}));

mock.module("../src/subtitles.ts", () => ({
	fetchSubtitles: mock(async (_videoId: string): Promise<SubtitleTrack[]> => []),
}));

describe("handler", () => {
	it("GET /health returns 200 with status ok", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/health"));

		expect(res.status).toBe(200);
		const body = (await res.json()) as { status: string };
		expect(body).toEqual({ status: "ok" });
	});

	it("GET /potoken without videoId returns 400", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/potoken"));

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("videoId query parameter is required");
	});

	it("GET /potoken with videoId returns token result", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/potoken?videoId=abc"));

		expect(res.status).toBe(200);
		const body = (await res.json()) as TokenResult;
		expect(body.poToken).toBe("pot-abc");
		expect(body.visitorData).toBe("visitor-data");
		expect(body.streamingPot).toBe("stream-abc");
	});

	it("GET /subtitles without videoId returns 400", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/subtitles"));

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("videoId query parameter is required");
	});

	it("GET /subtitles with videoId returns array", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/subtitles?videoId=abc"));

		expect(res.status).toBe(200);
		const body = (await res.json()) as SubtitleTrack[];
		expect(Array.isArray(body)).toBe(true);
	});

	it("unknown route returns 404", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/unknown"));

		expect(res.status).toBe(404);
	});
});
