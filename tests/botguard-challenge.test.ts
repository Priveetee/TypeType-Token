import { afterEach, describe, expect, it, mock } from "bun:test";
import { Constants } from "youtubei.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("fetchChallenge", () => {
	it("binds att/get to the current visitor session", async () => {
		let request: Request | null = null;
		globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
			request = new Request(input, init);
			return Response.json({
				bgChallenge: {
					interpreterJavascript: {
						privateDoNotAccessOrElseSafeScriptWrappedValue: "interpreter",
					},
					program: "program",
					globalName: "trayride",
				},
			});
		}) as typeof fetch;

		const { fetchChallenge, WEB_CLIENT_VERSION } = await import(
			"../src/botguard-challenge.ts?contract-test"
		);
		const challenge = await fetchChallenge("visitor-session");
		const body = (await request?.json()) as {
			context: { client: { visitorData: string; clientVersion: string } };
		};

		expect(challenge).toEqual({
			interpreterScript: "interpreter",
			program: "program",
			globalName: "trayride",
		});
		expect(WEB_CLIENT_VERSION).toBe(Constants.CLIENTS.WEB.VERSION);
		expect(request?.headers.get("X-Goog-Visitor-Id")).toBe("visitor-session");
		expect(request?.headers.get("X-Youtube-Client-Name")).toBe("1");
		expect(body.context.client.visitorData).toBe("visitor-session");
		expect(body.context.client.clientVersion).toBe(Constants.CLIENTS.WEB.VERSION);
	});
});
