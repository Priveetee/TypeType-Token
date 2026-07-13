import { describe, expect, it } from "bun:test";
import { KeyedSingleFlight } from "../src/keyed-single-flight.ts";

describe("KeyedSingleFlight", () => {
	it("shares concurrent work for the same key", async () => {
		const singleFlight = new KeyedSingleFlight<string, number>();
		let calls = 0;
		const load = async () => {
			calls += 1;
			await Bun.sleep(10);
			return calls;
		};

		const results = await Promise.all([
			singleFlight.run("video", load),
			singleFlight.run("video", load),
			singleFlight.run("video", load),
		]);

		expect(results).toEqual([1, 1, 1]);
		expect(calls).toBe(1);
	});

	it("starts fresh work after completion", async () => {
		const singleFlight = new KeyedSingleFlight<string, number>();
		let calls = 0;
		const load = async () => ++calls;

		expect(await singleFlight.run("video", load)).toBe(1);
		expect(await singleFlight.run("video", load)).toBe(2);
	});
});
