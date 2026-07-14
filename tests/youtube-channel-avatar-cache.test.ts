import { describe, expect, it } from "bun:test";
import {
	cacheYoutubeChannelAvatar,
	getCachedYoutubeChannelAvatar,
} from "../src/youtube-channel-avatar-cache.ts";

describe("youtube channel avatar cache", () => {
	it("stores non-empty avatar URLs by video", () => {
		cacheYoutubeChannelAvatar("video-one", "https://example.test/avatar.jpg");

		expect(getCachedYoutubeChannelAvatar("video-one")).toBe("https://example.test/avatar.jpg");
		expect(getCachedYoutubeChannelAvatar("video-two")).toBeNull();
	});

	it("does not cache empty URLs", () => {
		cacheYoutubeChannelAvatar("video-empty", "");

		expect(getCachedYoutubeChannelAvatar("video-empty")).toBeNull();
	});
});
