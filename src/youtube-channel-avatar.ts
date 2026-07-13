type JsonObject = Record<string, unknown>;

const OWNER_RENDERER_KEYS = ["slimOwnerRenderer", "videoOwnerRenderer"];
const MAX_SEARCH_DEPTH = 20;

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findOwnerRenderer(value: unknown, depth: number): JsonObject | null {
	if (depth > MAX_SEARCH_DEPTH) return null;
	if (Array.isArray(value)) {
		for (const item of value) {
			const renderer = findOwnerRenderer(item, depth + 1);
			if (renderer) return renderer;
		}
		return null;
	}
	if (!isJsonObject(value)) return null;
	for (const key of OWNER_RENDERER_KEYS) {
		const renderer = value[key];
		if (isJsonObject(renderer)) return renderer;
	}
	for (const child of Object.values(value)) {
		const renderer = findOwnerRenderer(child, depth + 1);
		if (renderer) return renderer;
	}
	return null;
}

function thumbnailWidth(value: JsonObject): number {
	return typeof value.width === "number" ? value.width : 0;
}

export function findYoutubeChannelAvatarUrl(response: unknown): string {
	const renderer = findOwnerRenderer(response, 0);
	if (!renderer) return "";
	const thumbnail = renderer.thumbnail;
	if (!isJsonObject(thumbnail) || !Array.isArray(thumbnail.thumbnails)) return "";
	let bestUrl = "";
	let bestWidth = -1;
	for (const candidate of thumbnail.thumbnails) {
		if (!isJsonObject(candidate) || typeof candidate.url !== "string") continue;
		const width = thumbnailWidth(candidate);
		if (width >= bestWidth) {
			bestUrl = candidate.url;
			bestWidth = width;
		}
	}
	return bestUrl;
}
