import Innertube, { Platform, UniversalCache } from "youtubei.js";

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

function installPlatformShim(): void {
	Platform.shim.eval = async (data, env) => {
		const properties = [];
		if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
		if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
		return new Function(`${data.output}\nreturn { ${properties.join(", ")} }`)();
	};
}

function safeValues(values: string[] | undefined): string[] {
	return Array.isArray(values) ? values.filter((value) => typeof value === "string") : [];
}

export async function decodeYoutubePlayerBatch(
	request: YoutubePlayerDecodeRequest,
): Promise<YoutubePlayerDecodeResponse> {
	installPlatformShim();
	const innertube = await Innertube.create({ cache: new UniversalCache(true) });
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
