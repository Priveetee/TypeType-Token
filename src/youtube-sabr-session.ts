import { buildSabrFormat } from "googlevideo/utils";
import { fetchPoToken } from "./token-service.ts";
import type {
	YoutubeClientContext,
	YoutubePlayerResponse,
	YoutubeSabrClient,
	YoutubeSabrSession,
} from "./youtube-sabr-types.ts";

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const WEB_VERSION = "2.20260630.03.00";
const MWEB_VERSION = "2.20260205.04.01";
const WEB_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
	"Chrome/131.0.0.0 Safari/537.36";
const MWEB_USER_AGENT =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 " +
	"(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

function clientContext(client: YoutubeSabrClient, visitorData: string): YoutubeClientContext {
	if (client === "MWEB") {
		return {
			hl: "en",
			gl: "US",
			clientName: "MWEB",
			clientVersion: MWEB_VERSION,
			visitorData,
			userAgent: MWEB_USER_AGENT,
			clientFormFactor: "SMALL_FORM_FACTOR",
			platform: "MOBILE",
		};
	}
	return {
		hl: "en",
		gl: "US",
		clientName: "WEB",
		clientVersion: WEB_VERSION,
		visitorData,
		userAgent: WEB_USER_AGENT,
	};
}

function durationMs(lengthSeconds: string | undefined): number | null {
	const seconds = Number.parseInt(lengthSeconds ?? "", 10);
	return Number.isFinite(seconds) ? seconds * 1000 : null;
}

async function fetchPlayerResponse(
	videoId: string,
	context: YoutubeClientContext,
	poToken: string,
): Promise<YoutubePlayerResponse> {
	const clientName = context.clientName === "WEB" ? "1" : "2";
	const response = await fetch(
		`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-youtube-client-name": clientName,
				"x-youtube-client-version": context.clientVersion,
				"x-goog-visitor-id": context.visitorData,
				origin: "https://www.youtube.com",
				"user-agent": context.userAgent,
			},
			body: JSON.stringify({
				context: { client: context },
				videoId,
				contentCheckOk: true,
				racyCheckOk: true,
				playbackContext: {
					adPlaybackContext: { pyv: true },
					contentPlaybackContext: { signatureTimestamp: 20410 },
				},
				serviceIntegrityDimensions: { poToken },
			}),
		},
	);
	if (!response.ok) throw new Error(`YouTube player request failed: ${response.status}`);
	return (await response.json()) as YoutubePlayerResponse;
}

export async function fetchYoutubeSabrSession(
	videoId: string,
	client: YoutubeSabrClient = "MWEB",
): Promise<YoutubeSabrSession> {
	const tokens = await fetchPoToken(videoId);
	const context = clientContext(client, tokens.visitorData);
	const videoInfo = await fetchPlayerResponse(videoId, context, tokens.streamingPot);
	if (videoInfo.playabilityStatus?.status !== "OK") {
		throw new Error(
			`YouTube ${client} player response is ${videoInfo.playabilityStatus?.status ?? "missing"}: ${videoInfo.playabilityStatus?.reason ?? "no reason"}`,
		);
	}
	const serverAbrStreamingUrl = videoInfo.streamingData?.serverAbrStreamingUrl;
	const videoPlaybackUstreamerConfig =
		videoInfo.playerConfig?.mediaCommonConfig?.mediaUstreamerRequestConfig
			?.videoPlaybackUstreamerConfig;

	if (!serverAbrStreamingUrl) {
		throw new Error("serverAbrStreamingUrl missing from YouTube player response");
	}
	if (!videoPlaybackUstreamerConfig) {
		throw new Error("videoPlaybackUstreamerConfig missing from YouTube player response");
	}

	const formats = (videoInfo.streamingData?.adaptiveFormats ?? [])
		.map((format) => buildSabrFormat(format))
		.filter((format) => format.mimeType?.includes("audio") || format.mimeType?.includes("video"));

	return {
		videoId,
		client,
		visitorData: tokens.visitorData,
		poToken: tokens.visitorBoundPoToken,
		streamingPot: tokens.streamingPot,
		serverAbrStreamingUrl,
		videoPlaybackUstreamerConfig,
		durationMs: durationMs(videoInfo.videoDetails?.lengthSeconds),
		title: videoInfo.videoDetails?.title ?? null,
		formats,
	};
}
