import { buildSabrFormat } from "googlevideo/utils";
import Innertube, { ClientType, Platform, UniversalCache, YTNodes } from "youtubei.js";
import { fetchPoToken } from "./token-service.ts";
import { toYoutubeSabrAdaptiveFormat } from "./youtube-sabr-adaptive-format.ts";
import type { YoutubeSabrClient, YoutubeSabrSession } from "./youtube-sabr-types.ts";

function installPlatformShim(): void {
	Platform.shim.eval = async (data, env) => {
		const properties = [];
		if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
		if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
		return new Function(`${data.output}\nreturn { ${properties.join(", ")} }`)();
	};
}

export async function fetchYoutubeSabrSession(
	videoId: string,
	client: YoutubeSabrClient = "MWEB",
): Promise<YoutubeSabrSession> {
	const tokens = await fetchPoToken(videoId);
	installPlatformShim();
	const innertube = await Innertube.create({
		cache: new UniversalCache(true),
		client_type: client === "MWEB" ? ClientType.MWEB : ClientType.WEB,
	});
	const endpoint = new YTNodes.NavigationEndpoint({ watchEndpoint: { videoId } });
	const videoInfo = await endpoint.call(innertube.actions, {
		playbackContext: {
			adPlaybackContext: { pyv: true },
			contentPlaybackContext: {
				vis: 0,
				splay: false,
				lactMilliseconds: "-1",
				signatureTimestamp: innertube.session.player?.signature_timestamp,
			},
		},
		serviceIntegrityDimensions: { poToken: tokens.streamingPot },
		contentCheckOk: true,
		racyCheckOk: true,
		parse: true,
	});
	if (videoInfo.playability_status?.status !== "OK") {
		throw new Error(
			`YouTube ${client} player response is ${videoInfo.playability_status?.status ?? "missing"}: ${videoInfo.playability_status?.reason ?? "no reason"}`,
		);
	}
	const serverAbrStreamingUrl = await innertube.session.player?.decipher(
		videoInfo.streaming_data?.server_abr_streaming_url,
	);
	const videoPlaybackUstreamerConfig =
		videoInfo.player_config?.media_common_config.media_ustreamer_request_config
			?.video_playback_ustreamer_config;

	if (!serverAbrStreamingUrl) {
		throw new Error("serverAbrStreamingUrl missing from YouTube player response");
	}
	if (!videoPlaybackUstreamerConfig) {
		throw new Error("videoPlaybackUstreamerConfig missing from YouTube player response");
	}

	const formats = (videoInfo.streaming_data?.adaptive_formats ?? [])
		.map((format) => buildSabrFormat(format))
		.filter((format) => format.mimeType?.includes("audio") || format.mimeType?.includes("video"));
	const adaptiveFormats = (videoInfo.streaming_data?.adaptive_formats ?? []).map((format) =>
		toYoutubeSabrAdaptiveFormat(format),
	);
	const details = videoInfo.video_details;
	const metadata = {
		title: details?.title ?? "",
		author: details?.author ?? "",
		channelId: details?.channel_id ?? "",
		description: details?.short_description ?? "",
		durationMs: (details?.duration ?? 0) * 1000,
		viewCount: details?.view_count ?? 0,
		thumbnailUrl: details?.thumbnail.at(-1)?.url ?? "",
		tags: details?.keywords ?? [],
		isLive: details?.is_live ?? false,
		isLiveContent: details?.is_live_content ?? false,
	};

	return {
		videoId,
		client,
		visitorData: tokens.visitorData,
		poToken: tokens.visitorBoundPoToken,
		streamingPot: tokens.streamingPot,
		serverAbrStreamingUrl,
		rawServerAbrStreamingUrl: videoInfo.streaming_data.server_abr_streaming_url,
		hlsManifestUrl: videoInfo.streaming_data?.hls_manifest_url ?? null,
		videoPlaybackUstreamerConfig,
		durationMs: metadata.durationMs || null,
		title: metadata.title || null,
		metadata,
		formats,
		adaptiveFormats,
	};
}
