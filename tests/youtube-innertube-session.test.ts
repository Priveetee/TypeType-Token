import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
	isRejectedAnonymousSession,
	YoutubeInnertubeSessions,
} from "../src/youtube-innertube-session.ts";

const instances = [{ id: "first" }, { id: "second" }];
const create = mock(async () => instances[create.mock.calls.length - 1]);
let sessions = new YoutubeInnertubeSessions(create);

describe("YouTube Innertube sessions", () => {
	beforeEach(() => {
		create.mockClear();
		sessions = new YoutubeInnertubeSessions(create);
	});

	it("recreates a rejected anonymous session once invalidated", async () => {
		const first = await sessions.get("MWEB", "visitor-retry");
		expect(await sessions.get("MWEB", "visitor-retry")).toBe(first);
		expect(create).toHaveBeenCalledTimes(1);

		await sessions.invalidate("MWEB", "visitor-retry", first);
		const second = await sessions.get("MWEB", "visitor-retry");

		expect(second).not.toBe(first);
		expect(create).toHaveBeenCalledTimes(2);
	});

	it("keeps the active session when an older instance is invalidated", async () => {
		const active = await sessions.get("WEB", "visitor-active");
		await sessions.invalidate("WEB", "visitor-active", { id: "stale" });

		expect(await sessions.get("WEB", "visitor-active")).toBe(active);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it("only retries anonymous anti-bot rejections", () => {
		expect(
			isRejectedAnonymousSession("LOGIN_REQUIRED", "Sign in to confirm you are not a bot"),
		).toBe(true);
		expect(isRejectedAnonymousSession("LOGIN_REQUIRED", "Join this channel to get access")).toBe(
			false,
		);
		expect(isRejectedAnonymousSession("UNPLAYABLE", "Video unavailable")).toBe(false);
	});
});
