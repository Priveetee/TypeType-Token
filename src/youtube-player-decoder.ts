import Innertube, { UniversalCache } from "youtubei.js";

type YoutubeInnertube = Awaited<ReturnType<typeof Innertube.create>>;

let innertubePromise: Promise<YoutubeInnertube> | undefined;
let loadedPlayerId: string | undefined;

export type YoutubePlayerDecodeRequest = {
	playerId?: string;
	signatures?: string[];
	throttlingParameters?: string[];
};

export type YoutubePlayerDecodeResponse = {
	playerId: string;
	signatureTimestamp: number;
	signatures: Record<string, string>;
	throttlingParameters: Record<string, string>;
};

function safeValues(values: string[] | undefined): string[] {
	return Array.isArray(values) ? values.filter((value) => typeof value === "string") : [];
}

async function getInnertube(playerId: string | undefined): Promise<YoutubeInnertube> {
	if (playerId && loadedPlayerId && playerId !== loadedPlayerId) {
		innertubePromise = undefined;
		loadedPlayerId = undefined;
	}
	const pending = innertubePromise ?? Innertube.create({ cache: new UniversalCache(true) });
	innertubePromise = pending;
	try {
		const innertube = await pending;
		loadedPlayerId = innertube.session.player?.player_id;
		return innertube;
	} catch (error) {
		if (innertubePromise === pending) innertubePromise = undefined;
		throw error;
	}
}

export async function decodeYoutubePlayerBatch(
	request: YoutubePlayerDecodeRequest,
): Promise<YoutubePlayerDecodeResponse> {
	const innertube = await getInnertube(request.playerId);
	const player = innertube.session.player;
	if (!player) throw new Error("YouTube player is unavailable");
	const signatures: Record<string, string> = {};
	const throttlingParameters: Record<string, string> = {};
	for (const signature of safeValues(request.signatures)) {
		const cipher = new URLSearchParams({
			url: "https://example.com/videoplayback",
			sp: "sig",
			s: signature,
		}).toString();
		const deciphered = new URL(await player.decipher(undefined, cipher, undefined, new Map()));
		const value = deciphered.searchParams.get("sig");
		if (value) signatures[signature] = value;
	}
	for (const throttlingParameter of safeValues(request.throttlingParameters)) {
		const url = `https://example.com/videoplayback?n=${encodeURIComponent(throttlingParameter)}`;
		const deciphered = new URL(await player.decipher(url, undefined, undefined, new Map()));
		const value = deciphered.searchParams.get("n");
		if (value) throttlingParameters[throttlingParameter] = value;
	}
	return {
		playerId: player.player_id,
		signatureTimestamp: player.signature_timestamp,
		signatures,
		throttlingParameters,
	};
}
