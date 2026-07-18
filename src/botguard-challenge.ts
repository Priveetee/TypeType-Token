import { Constants } from "youtubei.js";
import { youtubeFetch } from "./youtube-fetch.ts";

export const WEB_CLIENT_VERSION = Constants.CLIENTS.WEB.VERSION;
const ATT_GET_URL = "https://www.youtube.com/youtubei/v1/att/get?prettyPrint=false";
const WAA_API_KEY = "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw";
const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
	"Chrome/131.0.0.0 Safari/537.3";

type AttGetChallenge = {
	interpreterJavascript?: {
		privateDoNotAccessOrElseSafeScriptWrappedValue?: string;
	};
	interpreterUrl?: {
		privateDoNotAccessOrElseTrustedResourceUrlWrappedValue?: string;
	};
	program?: string;
	globalName?: string;
};

export type BotGuardChallenge = {
	interpreterScript: string;
	program: string;
	globalName: string;
};

async function resolveInterpreterScript(challenge: AttGetChallenge): Promise<string> {
	const embedded = challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
	if (typeof embedded === "string" && embedded.length > 0) {
		return embedded;
	}

	const rawUrl = challenge.interpreterUrl?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
	if (typeof rawUrl !== "string" || rawUrl.length === 0) {
		throw new Error("att/get challenge has no interpreter script or URL");
	}

	const url = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
	const response = await youtubeFetch(url);
	if (!response.ok) {
		throw new Error(`BotGuard interpreter fetch failed: ${response.status}`);
	}

	const script = await response.text();
	if (!script) {
		throw new Error("BotGuard interpreter fetch returned an empty body");
	}

	return script;
}

export async function fetchChallenge(visitorData: string): Promise<BotGuardChallenge> {
	const response = await youtubeFetch(ATT_GET_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"User-Agent": USER_AGENT,
			Accept: "application/json",
			"X-Goog-Visitor-Id": visitorData,
			"X-Youtube-Client-Name": "1",
			"X-Youtube-Client-Version": WEB_CLIENT_VERSION,
			"x-goog-api-key": WAA_API_KEY,
			"x-user-agent": "grpc-web-javascript/0.1",
		},
		body: JSON.stringify({
			engagementType: "ENGAGEMENT_TYPE_UNBOUND",
			context: {
				client: {
					clientName: "WEB",
					clientVersion: WEB_CLIENT_VERSION,
					hl: "en",
					gl: "US",
					utcOffsetMinutes: 0,
					visitorData,
				},
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`att/get request failed: ${response.status}`);
	}

	const data = (await response.json()) as { bgChallenge?: AttGetChallenge };
	const challenge = data.bgChallenge;

	if (
		!challenge ||
		typeof challenge.program !== "string" ||
		typeof challenge.globalName !== "string"
	) {
		throw new Error("att/get response missing a usable BotGuard challenge");
	}

	const interpreterScript = await resolveInterpreterScript(challenge);

	return {
		interpreterScript,
		program: challenge.program,
		globalName: challenge.globalName,
	};
}
