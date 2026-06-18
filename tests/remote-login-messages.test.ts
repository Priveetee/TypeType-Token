import { describe, expect, it } from "bun:test";
import { parseRemoteLoginInput, parseStartRequest } from "../src/remote-login-messages.ts";

describe("remote login messages", () => {
	it("parses the backend start request contract", () => {
		const body = parseStartRequest({
			serverSessionId: "server-session",
			userId: "user-1",
			callbackUrl: "http://typetype-server.local/callback",
			ttlMs: 480_000,
		});

		expect(body).toEqual({
			serverSessionId: "server-session",
			userId: "user-1",
			callbackUrl: "http://typetype-server.local/callback",
			ttlMs: 480_000,
		});
	});

	it("rejects incomplete start requests", () => {
		expect(parseStartRequest({ userId: "user-1", ttlMs: 480_000 })).toBeNull();
		expect(parseStartRequest({ serverSessionId: "s", userId: "u", callbackUrl: "x" })).toBeNull();
	});

	it("parses bounded input messages", () => {
		expect(
			parseRemoteLoginInput(JSON.stringify({ type: "resize", width: 9000, height: 10 })),
		).toEqual({ type: "resize", width: 1920, height: 240 });
		expect(
			parseRemoteLoginInput(JSON.stringify({ type: "pointer", event: "down", x: 10, y: 20 })),
		).toEqual({ type: "pointer", event: "down", x: 10, y: 20, button: "left" });
		expect(parseRemoteLoginInput(JSON.stringify({ type: "cancel" }))).toEqual({ type: "cancel" });
	});

	it("ignores invalid input messages", () => {
		expect(parseRemoteLoginInput("{")).toBeNull();
		expect(
			parseRemoteLoginInput(JSON.stringify({ type: "pointer", event: "drag", x: 1, y: 2 })),
		).toBeNull();
		expect(parseRemoteLoginInput(JSON.stringify({ type: "text", value: "" }))).toBeNull();
	});
});
