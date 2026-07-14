import { describe, expect, it } from "bun:test";
import { findYoutubeChannelAvatarUrl } from "../src/youtube-channel-avatar.ts";

describe("findYoutubeChannelAvatarUrl", () => {
	it("reads the largest MWEB slim owner thumbnail", () => {
		const response = {
			contents: {
				singleColumnWatchNextResults: {
					results: {
						results: {
							contents: [
								{
									slimVideoMetadataSectionRenderer: {
										contents: [
											{
												slimOwnerRenderer: {
													thumbnail: {
														thumbnails: [
															{ url: "small", width: 48 },
															{ url: "large", width: 176 },
														],
													},
												},
											},
										],
									},
								},
							],
						},
					},
				},
			},
		};

		expect(findYoutubeChannelAvatarUrl(response)).toBe("large");
	});

	it("reads a WEB video owner thumbnail", () => {
		const response = {
			contents: {
				twoColumnWatchNextResults: {
					results: {
						results: {
							contents: [
								{
									videoSecondaryInfoRenderer: {
										owner: {
											videoOwnerRenderer: {
												thumbnail: {
													thumbnails: [{ url: "web-avatar", width: 88 }],
												},
											},
										},
									},
								},
							],
						},
					},
				},
			},
		};

		expect(findYoutubeChannelAvatarUrl(response)).toBe("web-avatar");
	});

	it("returns an empty URL for malformed responses", () => {
		expect(findYoutubeChannelAvatarUrl(null)).toBe("");
		expect(findYoutubeChannelAvatarUrl({ slimOwnerRenderer: { thumbnail: {} } })).toBe("");
	});
});
