type CachedAvatar = {
	url: string;
	expiresAt: number;
};

const AVATAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const avatarCache = new Map<string, CachedAvatar>();

export function getCachedYoutubeChannelAvatar(videoId: string): string | null {
	const cached = avatarCache.get(videoId);
	if (!cached) return null;
	if (cached.expiresAt <= Date.now()) {
		avatarCache.delete(videoId);
		return null;
	}
	return cached.url;
}

export function cacheYoutubeChannelAvatar(videoId: string, url: string): void {
	if (!url) return;
	avatarCache.set(videoId, { url, expiresAt: Date.now() + AVATAR_CACHE_TTL_MS });
}
