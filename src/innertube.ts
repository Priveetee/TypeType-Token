import { BG } from "bgutils-js";
import type { DescrambledChallenge, IntegrityTokenData } from "bgutils-js";

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const WAA_API_KEY = "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw";
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const WAA_BASE_URL = "https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa";
const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
	"Chrome/131.0.0.0 Safari/537.36";

const ANDROID_VR_USER_AGENT =
	"com.google.android.apps.youtube.vr.oculus/1.65.10 " +
	"(Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";
const ANDROID_VR_CLIENT_VERSION = "1.65.10";
const ANDROID_VR_CLIENT_NAME_ID = "28";

const WAA_HEADERS: Record<string, string> = {
	"content-type": "application/json+protobuf",
	"x-goog-api-key": WAA_API_KEY,
	"x-user-agent": "grpc-web-javascript/0.1",
	"user-agent": USER_AGENT,
};

export async function fetchVisitorData(): Promise<string> {
	const response = await fetch(
		`https://www.youtube.com/youtubei/v1/config?key=${INNERTUBE_API_KEY}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				context: {
					client: {
						hl: "en",
						gl: "US",
						clientName: "WEB",
						clientVersion: "2.20240726.00.00",
					},
				},
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Innertube config request failed: ${response.status}`);
	}

	const data = (await response.json()) as { responseContext?: { visitorData?: string } };
	const visitorData = data.responseContext?.visitorData;

	if (typeof visitorData !== "string") {
		throw new Error("visitorData missing from Innertube response");
	}

	return visitorData;
}

export async function fetchChallenge(): Promise<DescrambledChallenge> {
	const response = await fetch(`${WAA_BASE_URL}/Create`, {
		method: "POST",
		headers: WAA_HEADERS,
		body: JSON.stringify([REQUEST_KEY]),
	});

	if (!response.ok) {
		throw new Error(`WAA Create request failed: ${response.status}`);
	}

	const rawJson: unknown = await response.json();
	const challenge = BG.Challenge.parseChallengeData(rawJson as Record<string, unknown>);

	if (!challenge) {
		throw new Error("BotGuard challenge parsing returned undefined");
	}

	return challenge;
}

export type RawCaptionTrack = {
	baseUrl?: string;
	name?: { simpleText?: string; runs?: { text?: string }[] };
	languageCode?: string;
	kind?: string;
};

type PlayerResponse = {
	captions?: {
		playerCaptionsTracklistRenderer?: {
			captionTracks?: RawCaptionTrack[];
		};
	};
};

export async function fetchCaptionTracks(videoId: string): Promise<RawCaptionTrack[]> {
	const response = await fetch(
		`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-youtube-client-name": ANDROID_VR_CLIENT_NAME_ID,
				"x-youtube-client-version": ANDROID_VR_CLIENT_VERSION,
				origin: "https://www.youtube.com",
				"user-agent": ANDROID_VR_USER_AGENT,
			},
			body: JSON.stringify({
				context: {
					client: {
						hl: "en",
						gl: "US",
						clientName: "ANDROID_VR",
						clientVersion: ANDROID_VR_CLIENT_VERSION,
						androidSdkVersion: 32,
						deviceMake: "Oculus",
						deviceModel: "Quest 3",
						userAgent: ANDROID_VR_USER_AGENT,
						osName: "Android",
						osVersion: "12L",
					},
				},
				videoId,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(`Innertube player request failed: ${response.status}`);
	}

	const data = (await response.json()) as PlayerResponse;
	return data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

export async function fetchIntegrityToken(botguardResponse: string): Promise<IntegrityTokenData> {
	const response = await fetch(`${WAA_BASE_URL}/GenerateIT`, {
		method: "POST",
		headers: WAA_HEADERS,
		body: JSON.stringify([REQUEST_KEY, botguardResponse]),
	});

	if (!response.ok) {
		throw new Error(`WAA GenerateIT request failed: ${response.status}`);
	}

	const arr = (await response.json()) as [unknown, unknown, unknown, unknown];
	const data: IntegrityTokenData = {};

	if (typeof arr[0] === "string") data.integrityToken = arr[0];
	if (typeof arr[1] === "number") data.estimatedTtlSecs = arr[1];
	if (typeof arr[2] === "number") data.mintRefreshThreshold = arr[2];
	if (typeof arr[3] === "string") data.websafeFallbackToken = arr[3];

	return data;
}
