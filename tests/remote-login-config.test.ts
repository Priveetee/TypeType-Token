import { describe, expect, it } from "bun:test";
import {
	isRemoteLoginAuthorized,
	isRemoteLoginCallbackAllowed,
	REMOTE_LOGIN_INTERNAL_HEADER,
	readRemoteLoginConfig,
} from "../src/remote-login-config.ts";

describe("remote login config", () => {
	it("reads bounded values from env", () => {
		const config = readRemoteLoginConfig({
			YOUTUBE_REMOTE_LOGIN_ENABLED: "true",
			YOUTUBE_REMOTE_LOGIN_INTERNAL_TOKEN: " internal-secret ",
			YOUTUBE_REMOTE_LOGIN_TTL_MS: "900000",
			YOUTUBE_REMOTE_LOGIN_FRAME_FPS: "999",
			YOUTUBE_REMOTE_LOGIN_CALLBACK_ORIGIN: "http://localhost:8080/internal",
			YOUTUBE_REMOTE_LOGIN_HEADLESS: "false",
			YOUTUBE_REMOTE_LOGIN_BROWSER_CHANNEL: "chrome",
			YOUTUBE_REMOTE_LOGIN_LOCALE: "fr-FR",
		});

		expect(config.enabled).toBe(true);
		expect(config.internalToken).toBe("internal-secret");
		expect(config.ttlMs).toBe(600_000);
		expect(config.frameIntervalMs).toBe(50);
		expect(config.callbackOrigin).toBe("http://localhost:8080");
		expect(config.headless).toBe(false);
		expect(config.disableAutomationControlled).toBe(true);
		expect(config.browserChannel).toBe("chrome");
		expect(config.locale).toBe("fr-FR");
	});

	it("uses the YouTube Music probe by default", () => {
		const config = readRemoteLoginConfig({});

		expect(config.probeVideoUrl).toBe("https://music.youtube.com/watch?v=09839DpTctU");
	});

	it("authorizes only the configured internal token header", () => {
		const config = readRemoteLoginConfig({
			YOUTUBE_REMOTE_LOGIN_ENABLED: "true",
			YOUTUBE_REMOTE_LOGIN_INTERNAL_TOKEN: "internal-secret",
		});
		const req = new Request("http://localhost", {
			headers: { [REMOTE_LOGIN_INTERNAL_HEADER]: "internal-secret" },
		});

		expect(isRemoteLoginAuthorized(req, config)).toBe(true);
		expect(isRemoteLoginAuthorized(new Request("http://localhost"), config)).toBe(false);
	});

	it("allows callback URLs only on the configured origin", () => {
		const config = readRemoteLoginConfig({
			YOUTUBE_REMOTE_LOGIN_CALLBACK_ORIGIN: "https://server.example/internal",
		});

		expect(isRemoteLoginCallbackAllowed("https://server.example/callback", config)).toBe(true);
		expect(isRemoteLoginCallbackAllowed("https://other.example/callback", config)).toBe(false);
		expect(isRemoteLoginCallbackAllowed("file:///tmp/callback", config)).toBe(false);
	});
});
