export const REMOTE_LOGIN_INTERNAL_HEADER = "x-internal-token";

export type RemoteLoginConfig = {
	enabled: boolean;
	internalToken: string | null;
	ttlMs: number;
	frameIntervalMs: number;
	jpegQuality: number;
	viewportWidth: number;
	viewportHeight: number;
	userAgent: string;
	probeVideoUrl: string;
	potTimeoutMs: number;
	maxFrameBytes: number;
	maxBufferedBytes: number;
	maxCookieBytes: number;
	maxSessions: number;
	callbackTimeoutMs: number;
	callbackOrigin: string | null;
};

type Env = Record<string, string | undefined>;

const DEFAULT_REMOTE_LOGIN_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function boolValue(value: string | undefined): boolean {
	return value === "1" || value?.toLowerCase() === "true";
}

function boundedNumber(
	value: string | undefined,
	fallback: number,
	min: number,
	max: number,
): number {
	const parsed = value ? Number(value) : Number.NaN;
	if (!Number.isFinite(parsed)) return fallback;
	return Math.trunc(Math.min(Math.max(parsed, min), max));
}

function originValue(value: string | undefined): string | null {
	if (!value?.trim()) return null;
	try {
		return new URL(value.trim()).origin;
	} catch {
		return null;
	}
}

function probeUrl(env: Env): string {
	const raw = env.YOUTUBE_REMOTE_LOGIN_PROBE_URL?.trim();
	if (raw) return raw;
	const id = env.YOUTUBE_REMOTE_LOGIN_PROBE_VIDEO_ID?.trim() || "dQw4w9WgXcQ";
	return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}

export function readRemoteLoginConfig(env: Env = Bun.env): RemoteLoginConfig {
	const fps = boundedNumber(env.YOUTUBE_REMOTE_LOGIN_FRAME_FPS, 10, 1, 20);
	return {
		enabled: boolValue(env.YOUTUBE_REMOTE_LOGIN_ENABLED),
		internalToken: env.YOUTUBE_REMOTE_LOGIN_INTERNAL_TOKEN?.trim() || null,
		ttlMs: boundedNumber(env.YOUTUBE_REMOTE_LOGIN_TTL_MS, 480_000, 300_000, 600_000),
		frameIntervalMs: Math.max(Math.trunc(1000 / fps), 50),
		jpegQuality: boundedNumber(env.YOUTUBE_REMOTE_LOGIN_JPEG_QUALITY, 60, 35, 80),
		viewportWidth: boundedNumber(env.YOUTUBE_REMOTE_LOGIN_VIEWPORT_WIDTH, 1280, 360, 1920),
		viewportHeight: boundedNumber(env.YOUTUBE_REMOTE_LOGIN_VIEWPORT_HEIGHT, 720, 240, 1080),
		userAgent: env.YOUTUBE_REMOTE_LOGIN_USER_AGENT?.trim() || DEFAULT_REMOTE_LOGIN_USER_AGENT,
		probeVideoUrl: probeUrl(env),
		potTimeoutMs: boundedNumber(env.YOUTUBE_REMOTE_LOGIN_POT_TIMEOUT_MS, 45_000, 10_000, 90_000),
		maxFrameBytes: boundedNumber(
			env.YOUTUBE_REMOTE_LOGIN_MAX_FRAME_BYTES,
			524_288,
			65_536,
			1_048_576,
		),
		maxBufferedBytes: boundedNumber(
			env.YOUTUBE_REMOTE_LOGIN_MAX_BUFFERED_BYTES,
			524_288,
			65_536,
			2_097_152,
		),
		maxCookieBytes: boundedNumber(
			env.YOUTUBE_REMOTE_LOGIN_MAX_COOKIE_BYTES,
			262_144,
			16_384,
			524_288,
		),
		maxSessions: boundedNumber(env.YOUTUBE_REMOTE_LOGIN_MAX_SESSIONS, 2, 1, 8),
		callbackTimeoutMs: boundedNumber(
			env.YOUTUBE_REMOTE_LOGIN_CALLBACK_TIMEOUT_MS,
			10_000,
			2_000,
			30_000,
		),
		callbackOrigin: originValue(env.YOUTUBE_REMOTE_LOGIN_CALLBACK_ORIGIN),
	};
}

export function isRemoteLoginAuthorized(req: Request, config: RemoteLoginConfig): boolean {
	const token = req.headers.get(REMOTE_LOGIN_INTERNAL_HEADER);
	return config.internalToken !== null && token === config.internalToken;
}

export function isRemoteLoginCallbackAllowed(url: string, config: RemoteLoginConfig): boolean {
	try {
		const callbackUrl = new URL(url);
		const isHttp = callbackUrl.protocol === "http:" || callbackUrl.protocol === "https:";
		return isHttp && (!config.callbackOrigin || callbackUrl.origin === config.callbackOrigin);
	} catch {
		return false;
	}
}
