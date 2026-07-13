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
let releaseRacingMint: (() => void) | undefined;
let markRacingMintStarted: (() => void) | undefined;
const refreshEvents: string[] = [];
const mockMintPoToken = mock(async (_token: string, id: string): Promise<string> => {
	if (id === "racing-video") {
		refreshEvents.push("mint-started");
		markRacingMintStarted?.();
		await new Promise<void>((resolve) => {
			releaseRacingMint = resolve;
		});
		refreshEvents.push("mint-finished");
	}
	return `pot-${id}`;
});
const mockResetBotGuardPage = mock(async (): Promise<void> => {
	refreshEvents.push("page-reset");
});
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

	it("waits for active video token mints before resetting BotGuard", async () => {
		const racingMintStarted = new Promise<void>((resolve) => {
			markRacingMintStarted = resolve;
		});
		const eventsBefore = refreshEvents.length;
		const activeMint = fetchPoToken("racing-video");
		await racingMintStarted;
		const forcedRefresh = fetchPoToken("forced-after-race", true);
		const joinedRefresh = fetchPoToken("joined-during-refresh");
		await Promise.resolve();
		expect(refreshEvents.slice(eventsBefore)).toEqual(["mint-started"]);

		releaseRacingMint?.();
		await Promise.all([activeMint, forcedRefresh, joinedRefresh]);

		expect(refreshEvents.slice(eventsBefore)).toEqual([
			"mint-started",
			"mint-finished",
			"page-reset",
		]);
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
