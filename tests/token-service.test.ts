import { beforeAll, describe, expect, it, mock } from "bun:test";
import type { DescrambledChallenge, IntegrityTokenData } from "bgutils-js";
import type { TokenResult } from "../src/token-service.ts";

const VISITOR_DATA = "visitor-data-test-123";
const INTEGRITY_TOKEN = "integrity-token-test-xyz";

const mockExecuteBotGuard = mock(
	async (_script: string, _prog: string, _name: string): Promise<string> =>
		"botguard-response-test",
);
const mockMintPoToken = mock(async (_token: string, id: string): Promise<string> => `pot-${id}`);
const mockResetBotGuardPage = mock(async (): Promise<void> => undefined);

mock.module("../src/botguard-page.ts", () => ({
	executeBotGuard: mockExecuteBotGuard,
	mintPoToken: mockMintPoToken,
	resetBotGuardPage: mockResetBotGuardPage,
}));

mock.module("bgutils-js", () => ({
	BG: {
		Challenge: {
			parseChallengeData: mock(
				(_raw: unknown): DescrambledChallenge => ({
					interpreterJavascript: {
						privateDoNotAccessOrElseSafeScriptWrappedValue: "/* noop */",
						privateDoNotAccessOrElseTrustedResourceUrlWrappedValue: null,
					},
					interpreterHash: "hash-test",
					program: "program-test",
					globalName: "vm_test",
				}),
			),
		},
	},
}));

mock.module("../src/innertube.ts", () => ({
	fetchVisitorData: mock(async (): Promise<string> => VISITOR_DATA),
	fetchChallenge: mock(
		async (): Promise<DescrambledChallenge> => ({
			interpreterJavascript: {
				privateDoNotAccessOrElseSafeScriptWrappedValue: "/* noop */",
				privateDoNotAccessOrElseTrustedResourceUrlWrappedValue: null,
			},
			interpreterHash: "hash-test",
			program: "program-test",
			globalName: "vm_test",
		}),
	),
	fetchIntegrityToken: mock(
		async (_response: string): Promise<IntegrityTokenData> => ({
			integrityToken: INTEGRITY_TOKEN,
			estimatedTtlSecs: 21600,
		}),
	),
	fetchCaptionTracks: mock(async (_videoId: string, _visitorData: string, _poToken: string) => []),
}));

let fetchPoToken: (videoId: string) => Promise<TokenResult>;

describe("fetchPoToken", () => {
	beforeAll(async () => {
		const module = await import("../src/token-service.ts");
		fetchPoToken = module.fetchPoToken;
	});

	it("returns correct token structure on first call", async () => {
		const result = await fetchPoToken("video-id-1");

		expect(result.visitorData).toBe(VISITOR_DATA);
		expect(result.poToken).toBe(`pot-${VISITOR_DATA}`);
		expect(result.streamingPot).toBe("pot-video-id-1");
		expect(mockExecuteBotGuard.mock.calls.length).toBe(1);
	});

	it("uses cached session on subsequent calls without re-initializing", async () => {
		const callsBefore = mockExecuteBotGuard.mock.calls.length;

		await fetchPoToken("video-id-2");

		expect(mockExecuteBotGuard.mock.calls.length).toBe(callsBefore);
	});

	it("mints a distinct streamingPot per videoId", async () => {
		const result1 = await fetchPoToken("video-alpha");
		const result2 = await fetchPoToken("video-beta");

		expect(result1.streamingPot).toBe("pot-video-alpha");
		expect(result2.streamingPot).toBe("pot-video-beta");
		expect(result1.streamingPot).not.toBe(result2.streamingPot);
	});

	it("preserves visitorData and poToken across requests", async () => {
		const result = await fetchPoToken("video-id-3");

		expect(result.visitorData).toBe(VISITOR_DATA);
		expect(result.poToken).toBe(`pot-${VISITOR_DATA}`);
	});
});
