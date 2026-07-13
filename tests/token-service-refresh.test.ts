import { beforeAll, describe, expect, it, mock } from "bun:test";
import type { IntegrityTokenData } from "bgutils-js";
import type { TokenResult } from "../src/token-service.ts";

let markVisitorDataStarted: (() => void) | undefined;
const visitorDataStarted = new Promise<void>((resolve) => {
	markVisitorDataStarted = resolve;
});
let releaseVisitorData: (() => void) | undefined;
const visitorDataGate = new Promise<void>((resolve) => {
	releaseVisitorData = resolve;
});
const mockExecuteBotGuard = mock(async (): Promise<string> => "botguard-response");
const mockMintPoToken = mock(async (_token: string, id: string): Promise<string> => `pot-${id}`);
const mockResetBotGuardPage = mock(async (): Promise<void> => undefined);
let visitorDataRequests = 0;

mock.module("../src/botguard-page.ts", () => ({
	executeBotGuard: mockExecuteBotGuard,
	mintPoToken: mockMintPoToken,
	resetBotGuardPage: mockResetBotGuardPage,
}));

mock.module("../src/botguard-challenge.ts", () => ({
	fetchChallenge: mock(async () => ({
		interpreterScript: "interpreter",
		program: "program",
		globalName: "trayride",
	})),
}));

mock.module("../src/innertube.ts", () => ({
	fetchVisitorData: mock(async (): Promise<string> => {
		visitorDataRequests += 1;
		if (visitorDataRequests === 1) {
			markVisitorDataStarted?.();
			await visitorDataGate;
		}
		return "visitor-session";
	}),
	fetchIntegrityToken: mock(
		async (): Promise<IntegrityTokenData> => ({
			integrityToken: "integrity-token",
			estimatedTtlSecs: 60,
		}),
	),
}));

let fetchPoToken: (
	videoId: string,
	forceRefresh?: boolean,
	refreshVideo?: boolean,
) => Promise<TokenResult>;

describe("token refresh concurrency", () => {
	beforeAll(async () => {
		const module = await import("../src/token-service.ts?refresh-race-test");
		fetchPoToken = module.fetchPoToken;
	});

	it("joins a forced refresh to an active session refresh", async () => {
		const regular = fetchPoToken("regular-video");
		await visitorDataStarted;
		const forced = fetchPoToken("forced-video", true);
		releaseVisitorData?.();

		const [regularResult, forcedResult] = await Promise.all([regular, forced]);

		expect(regularResult.visitorData).toBe("visitor-session");
		expect(forcedResult.visitorData).toBe("visitor-session");
		expect(visitorDataRequests).toBe(1);
		expect(mockResetBotGuardPage.mock.calls.length).toBe(1);
		expect(mockExecuteBotGuard.mock.calls.length).toBe(1);
	});

	it("deduplicates concurrent video token refreshes", async () => {
		await fetchPoToken("refresh-video");
		const callsBefore = mockMintPoToken.mock.calls.length;
		await Promise.all([
			fetchPoToken("refresh-video", false, true),
			fetchPoToken("refresh-video", false, true),
		]);
		expect(mockMintPoToken.mock.calls.length).toBe(callsBefore + 1);
		await fetchPoToken("refresh-video", false, true);
		expect(mockMintPoToken.mock.calls.length).toBe(callsBefore + 1);
	});

	it("bounds the video token cache", async () => {
		for (let index = 0; index <= 512; index += 1) {
			await fetchPoToken(`cache-limit-${index}`);
		}
		const callsBefore = mockMintPoToken.mock.calls.length;
		await fetchPoToken("cache-limit-0");
		expect(mockMintPoToken.mock.calls.length).toBe(callsBefore + 1);
	});
});
