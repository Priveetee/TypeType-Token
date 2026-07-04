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
};

let session: CachedSession | null = null;
let refreshInFlight: Promise<CachedSession> | null = null;
let forcedRefreshInFlight: Promise<CachedSession> | null = null;
let refreshGeneration = 0;

async function buildSession(): Promise<CachedSession> {
	const visitorData = await fetchVisitorData();
	const challenge = await fetchChallenge(visitorData);

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
	};
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

export async function fetchPoToken(videoId: string, forceRefresh = false): Promise<TokenResult> {
	const { integrityToken, visitorData, visitorBoundPoToken } =
		await getOrRefreshSession(forceRefresh);
	const videoBoundPoToken = await mintPoToken(integrityToken, videoId);
	return {
		visitorData,
		visitorBoundPoToken,
		videoBoundPoToken,
		poToken: visitorBoundPoToken,
		streamingPot: videoBoundPoToken,
	};
}
