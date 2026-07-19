import { describe, expect, it } from "bun:test";
import { evaluateYoutubePlayerScript } from "../src/youtube-player-evaluator.ts";

describe("YouTube player evaluator", () => {
	it("returns the result produced by the generated player program", () => {
		const result = evaluateYoutubePlayerScript(`
const exportedVars = { nsigFunction: (value) => value.toUpperCase() };
return { n: exportedVars.nsigFunction("current") };
`);

		expect(result).toEqual({ n: "CURRENT" });
	});
});
