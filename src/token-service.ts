import { fetchChallenge } from "./botguard-challenge.ts";
import { executeBotGuard, mintPoToken, resetBotGuardPage } from "./botguard-page.ts";
import { fetchIntegrityToken, fetchVisitorData } from "./innertube.ts";

const EXPIRY_MARGIN_MS = 10 * 60 * 1000;

export type TokenResult = {
	visitorData: string;
	visitorBoundPoToken: string;
	videoBoundPoToken: string;
	poToken: string;
	streamingPot: string;
};

type CachedSession = {
	visitorData: string;
	visitorBoundPoToken: string;
	integrityToken: string;
	expiresAt: number;
	videoBoundPoTokens: Map<string, string>;
	videoBoundPoTokenRequests: Map<string, Promise<string>>;
};

let session: CachedSession | null = null;
let refreshInFlight: Promise<CachedSession> | null = null;
let forcedRefreshInFlight: Promise<CachedSession> | null = null;
let refreshGeneration = 0;

async function buildSession(): Promise<CachedSession> {
	const visitorData = await fetchVisitorData();
	const challenge = await fetchChallenge();

	const botguardResponse = await executeBotGuard(
		challenge.interpreterScript,
		challenge.program,
		challenge.globalName,
	);
	const integrityTokenData = await fetchIntegrityToken(botguardResponse);

	if (!integrityTokenData.integrityToken) {
		throw new Error("integrityToken missing from GenerateIT response");
	}

	const visitorBoundPoToken = await mintPoToken(integrityTokenData.integrityToken, visitorData);
	const ttlMs = (integrityTokenData.estimatedTtlSecs ?? 21600) * 1000;

	return {
		visitorData,
		visitorBoundPoToken,
		integrityToken: integrityTokenData.integrityToken,
		expiresAt: Date.now() + ttlMs - EXPIRY_MARGIN_MS,
		videoBoundPoTokens: new Map(),
		videoBoundPoTokenRequests: new Map(),
	};
}

async function getVideoBoundPoToken(s: CachedSession, videoId: string): Promise<string> {
	const cached = s.videoBoundPoTokens.get(videoId);
	if (cached !== undefined) return cached;

	const inFlight = s.videoBoundPoTokenRequests.get(videoId);
	if (inFlight !== undefined) return inFlight;

	const request = mintPoToken(s.integrityToken, videoId)
		.then((token) => {
			s.videoBoundPoTokens.set(videoId, token);
			return token;
		})
		.finally(() => s.videoBoundPoTokenRequests.delete(videoId));
	s.videoBoundPoTokenRequests.set(videoId, request);
	return request;
}

async function refreshVideoBoundPoToken(s: CachedSession, videoId: string): Promise<string> {
	s.videoBoundPoTokens.delete(videoId);
	s.videoBoundPoTokenRequests.delete(videoId);
	return getVideoBoundPoToken(s, videoId);
}

function startSessionRefresh(forceRefresh: boolean): Promise<CachedSession> {
	const generation = ++refreshGeneration;
	const promise = resetBotGuardPage()
		.then(() => buildSession())
		.then((s) => {
			if (generation === refreshGeneration) session = s;
			return s;
		})
		.finally(() => {
			if (forceRefresh) {
				forcedRefreshInFlight = null;
			} else {
				refreshInFlight = null;
			}
		});

	if (forceRefresh) {
		forcedRefreshInFlight = promise;
	} else {
		refreshInFlight = promise;
	}

	return promise;
}

export async function getOrRefreshSession(forceRefresh = false): Promise<CachedSession> {
	if (!forceRefresh && session !== null && Date.now() < session.expiresAt) return session;
	if (forceRefresh) return forcedRefreshInFlight ?? startSessionRefresh(true);
	if (forcedRefreshInFlight) return forcedRefreshInFlight;
	return refreshInFlight ?? startSessionRefresh(false);
}

export async function fetchPoToken(
	videoId: string,
	forceRefresh = false,
	refreshVideo = false,
): Promise<TokenResult> {
	const currentSession = await getOrRefreshSession(forceRefresh);
	const { visitorData, visitorBoundPoToken } = currentSession;
	const videoBoundPoToken = refreshVideo
		? await refreshVideoBoundPoToken(currentSession, videoId)
		: await getVideoBoundPoToken(currentSession, videoId);
	return {
		visitorData,
		visitorBoundPoToken,
		videoBoundPoToken,
		poToken: visitorBoundPoToken,
		streamingPot: videoBoundPoToken,
	};
}
