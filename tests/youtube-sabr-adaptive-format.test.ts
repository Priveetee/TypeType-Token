import { describe, expect, it } from "bun:test";
import { toYoutubeSabrAdaptiveFormat } from "../src/youtube-sabr-adaptive-format.ts";

describe("toYoutubeSabrAdaptiveFormat", () => {
	it("preserves the PipePipe player-response fields", async () => {
		const result = toYoutubeSabrAdaptiveFormat({
			itag: 140,
			last_modified_ms: "1783775626105235",
			xtags: "track-tags",
			mime_type: 'audio/mp4; codecs="mp4a.40.2"',
			audio_track: {
				id: "fr-FR.4",
				display_name: "French (original)",
				audio_is_default: true,
			},
			audio_quality: "AUDIO_QUALITY_MEDIUM",
			is_drc: false,
			bitrate: 136689,
			content_length: 57528535,
			approx_duration_ms: 3554626,
			url: "https://example.test/audio?n=encrypted",
			init_range: { start: 0, end: 745 },
			index_range: { start: 746, end: 1201 },
		});

		expect(result).toEqual({
			itag: 140,
			lastModified: "1783775626105235",
			xtags: "track-tags",
			mimeType: 'audio/mp4; codecs="mp4a.40.2"',
			audioTrack: {
				id: "fr-FR.4",
				displayName: "French (original)",
				audioIsDefault: true,
			},
			qualityLabel: undefined,
			audioQuality: "AUDIO_QUALITY_MEDIUM",
			isDrc: false,
			width: undefined,
			height: undefined,
			bitrate: 136689,
			contentLength: 57528535,
			approxDurationMs: 3554626,
			url: "https://example.test/audio?n=encrypted",
			signatureCipher: undefined,
			initRange: { start: 0, end: 745 },
			indexRange: { start: 746, end: 1201 },
		});
	});
});
