import { describe, expect, it, mock } from "bun:test";
import type { RawCaptionTrack } from "../src/innertube.ts";
import type { SubtitleTrack } from "../src/subtitles.ts";
import type { TokenResult } from "../src/token-service.ts";
import type { YoutubeSabrSession } from "../src/youtube-sabr-session.ts";

const mockFetchPoToken = mock(
	async (videoId: string, _forceRefresh = false, _refreshVideo = false): Promise<TokenResult> => ({
		visitorData: "visitor-data",
		visitorBoundPoToken: "visitor-bound-token",
		videoBoundPoToken: `video-bound-${videoId}`,
		poToken: "visitor-bound-token",
		streamingPot: `video-bound-${videoId}`,
	}),
);

mock.module("../src/token-service.ts", () => ({
	fetchPoToken: mockFetchPoToken,
}));

mock.module("../src/innertube.ts", () => ({
	fetchCaptionTracks: mock(async (_videoId: string): Promise<RawCaptionTrack[]> => []),
	fetchVisitorData: mock(async (): Promise<string> => "visitor-data"),
	fetchChallenge: mock(async () => ({})),
	fetchIntegrityToken: mock(async () => ({ integrityToken: "integrity-token" })),
}));

mock.module("../src/youtube-sabr-session.ts", () => ({
	fetchYoutubeSabrSession: mock(
		async (videoId: string, client = "MWEB"): Promise<YoutubeSabrSession> => ({
			videoId,
			client: client === "WEB" ? "WEB" : "MWEB",
			visitorData: "visitor-data",
			poToken: "visitor-bound-token",
			streamingPot: `video-bound-${videoId}`,
			serverAbrStreamingUrl: "https://example.test/sabr",
			videoPlaybackUstreamerConfig: "ustreamer-config",
			durationMs: 1000,
			title: "Test video",
			formats: [],
		}),
	),
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
		expect(body.visitorData).toBe("visitor-data");
		expect(body.visitorBoundPoToken).toBe("visitor-bound-token");
		expect(body.videoBoundPoToken).toBe("video-bound-abc");
		expect(body.poToken).toBe("visitor-bound-token");
		expect(body.streamingPot).toBe("video-bound-abc");
	});

	it("GET /potoken forwards refresh requests", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(
			new Request("http://localhost:8081/potoken?videoId=abc&refresh=true"),
		);

		expect(res.status).toBe(200);
		expect(mockFetchPoToken.mock.calls.at(-1)?.[1]).toBe(true);
	});

	it("GET /potoken forwards video refresh requests", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(
			new Request("http://localhost:8081/potoken?videoId=abc&refreshVideo=true"),
		);

		expect(res.status).toBe(200);
		expect(mockFetchPoToken.mock.calls.at(-1)?.[2]).toBe(true);
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

	it("GET /youtube/sabr/session without videoId returns 400", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/youtube/sabr/session"));

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("videoId query parameter is required");
	});

	it("GET /youtube/sabr/session rejects unsupported clients", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(
			new Request("http://localhost:8081/youtube/sabr/session?videoId=abc&client=ANDROID_VR"),
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("client must be WEB or MWEB");
	});

	it("GET /youtube/sabr/session returns SABR metadata", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(
			new Request("http://localhost:8081/youtube/sabr/session?videoId=abc"),
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as YoutubeSabrSession;
		expect(body.videoId).toBe("abc");
		expect(body.client).toBe("MWEB");
		expect(body.serverAbrStreamingUrl).toBe("https://example.test/sabr");
		expect(body.videoPlaybackUstreamerConfig).toBe("ustreamer-config");
	});

	it("unknown route returns 404", async () => {
		const { handler } = await import("../src/index.ts");
		const res = await handler(new Request("http://localhost:8081/unknown"));

		expect(res.status).toBe(404);
	});
});
