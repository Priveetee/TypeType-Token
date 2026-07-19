import type { EvalResult } from "youtubei.js";
import { Platform } from "youtubei.js";

export function evaluateYoutubePlayerScript(output: string): EvalResult {
	return new Function(output)();
}

export function installYoutubePlayerEvaluator(): void {
	Platform.shim.eval = async (data) => evaluateYoutubePlayerScript(data.output);
}
