import { executeBotGuard, mintPoToken, resetBotGuardPage } from "./botguard-page.ts";
import { fetchChallenge, fetchIntegrityToken, fetchVisitorData } from "./innertube.ts";

const EXPIRY_MARGIN_MS = 10 * 60 * 1000;

export type TokenResult = {
	poToken: string;
	visitorData: string;
	streamingPot: string;
};

type CachedSession = {
	visitorData: string;
	poToken: string;
	integrityToken: string;
	expiresAt: number;
};

let session: CachedSession | null = null;

async function buildSession(): Promise<CachedSession> {
	const visitorData = await fetchVisitorData();
	const challenge = await fetchChallenge();

	const script = challenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;
	if (!script) throw new Error("BotGuard interpreter script is null");

	const botguardResponse = await executeBotGuard(script, challenge.program, challenge.globalName);
	const integrityTokenData = await fetchIntegrityToken(botguardResponse);

	if (!integrityTokenData.integrityToken) {
		throw new Error("integrityToken missing from GenerateIT response");
	}

	const poToken = await mintPoToken(integrityTokenData.integrityToken, visitorData);
	const ttlMs = (integrityTokenData.estimatedTtlSecs ?? 21600) * 1000;

	return {
		visitorData,
		poToken,
		integrityToken: integrityTokenData.integrityToken,
		expiresAt: Date.now() + ttlMs - EXPIRY_MARGIN_MS,
	};
}

export async function getOrRefreshSession(): Promise<CachedSession> {
	if (session === null || Date.now() >= session.expiresAt) {
		await resetBotGuardPage();
		session = await buildSession();
	}
	return session;
}

export async function fetchPoToken(videoId: string): Promise<TokenResult> {
	const { integrityToken, visitorData, poToken } = await getOrRefreshSession();
	const streamingPot = await mintPoToken(integrityToken, videoId);
	return { poToken, visitorData, streamingPot };
}
