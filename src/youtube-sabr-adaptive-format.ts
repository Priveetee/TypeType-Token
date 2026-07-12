import type { YoutubeSabrAdaptiveFormat, YoutubeSabrByteRange } from "./youtube-sabr-types.ts";

type SourceAudioTrack = {
	id: string;
	display_name: string;
	audio_is_default: boolean;
};

type SourceFormat<Player> = {
	itag: number;
	last_modified_ms: string;
	xtags?: string;
	mime_type: string;
	audio_track?: SourceAudioTrack;
	quality_label?: string;
	audio_quality?: string;
	is_drc?: boolean;
	width?: number;
	height?: number;
	bitrate: number;
	content_length?: number;
	approx_duration_ms: number;
	init_range?: YoutubeSabrByteRange;
	index_range?: YoutubeSabrByteRange;
	decipher(player: Player): Promise<string>;
};

export async function toYoutubeSabrAdaptiveFormat<Player>(
	format: SourceFormat<Player>,
	player: Player,
): Promise<YoutubeSabrAdaptiveFormat> {
	const audioTrack = format.audio_track
		? {
				id: format.audio_track.id,
				displayName: format.audio_track.display_name,
				audioIsDefault: format.audio_track.audio_is_default,
			}
		: undefined;
	return {
		itag: format.itag,
		lastModified: format.last_modified_ms,
		xtags: format.xtags,
		mimeType: format.mime_type,
		audioTrack,
		qualityLabel: format.quality_label,
		audioQuality: format.audio_quality,
		isDrc: format.is_drc ?? false,
		width: format.width,
		height: format.height,
		bitrate: format.bitrate,
		contentLength: format.content_length,
		approxDurationMs: format.approx_duration_ms,
		url: await format.decipher(player),
		initRange: format.init_range,
		indexRange: format.index_range,
	};
}
