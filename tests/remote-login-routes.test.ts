import { describe, expect, it } from "bun:test";
import { REMOTE_LOGIN_INTERNAL_HEADER } from "../src/remote-login-config.ts";
import { RemoteLoginManager } from "../src/remote-login-manager.ts";
import { createRemoteLoginHandler } from "../src/remote-login-routes.ts";
import { fakeRemoteLoginPage, remoteLoginTestConfig } from "./remote-login-fixtures.ts";

function startRequest(body: object, token = "internal-secret"): Request {
	return new Request("http://localhost:8081/youtube-remote-login/start", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			[REMOTE_LOGIN_INTERNAL_HEADER]: token,
		},
		body: JSON.stringify(body),
	});
}

function startBody(userId: string): object {
	return {
		serverSessionId: `server-${userId}`,
		userId,
		callbackUrl: "http://typetype-server.local/internal/callback",
		ttlMs: 480_000,
	};
}

describe("remote login routes", () => {
	it("returns 404 when the feature is disabled", async () => {
		const config = remoteLoginTestConfig({ enabled: false });
		const manager = new RemoteLoginManager(config, async () => fakeRemoteLoginPage());
		const handler = createRemoteLoginHandler(manager, config);
		const res = await handler(
			startRequest(startBody("user-1")),
			new URL("http://localhost:8081/youtube-remote-login/start"),
		);

		expect(res?.status).toBe(404);
	});

	it("rejects missing or wrong internal tokens", async () => {
		const config = remoteLoginTestConfig();
		const manager = new RemoteLoginManager(config, async () => fakeRemoteLoginPage());
		const handler = createRemoteLoginHandler(manager, config);
		const res = await handler(
			startRequest(startBody("user-1"), "bad-token"),
			new URL("http://localhost:8081/youtube-remote-login/start"),
		);

		expect(res?.status).toBe(401);
	});

	it("rejects callback URLs outside the configured origin", async () => {
		const config = remoteLoginTestConfig();
		const manager = new RemoteLoginManager(config, async () => fakeRemoteLoginPage());
		const handler = createRemoteLoginHandler(manager, config);
		const res = await handler(
			startRequest({
				...startBody("user-1"),
				callbackUrl: "http://other.local/callback",
			}),
			new URL("http://localhost:8081/youtube-remote-login/start"),
		);

		expect(res?.status).toBe(400);
	});

	it("starts a remote login session", async () => {
		const config = remoteLoginTestConfig();
		const manager = new RemoteLoginManager(config, async () => fakeRemoteLoginPage());
		const handler = createRemoteLoginHandler(manager, config);
		const res = await handler(
			startRequest(startBody("user-1")),
			new URL("http://localhost:8081/youtube-remote-login/start"),
		);
		const body = (await res?.json()) as { sessionId: string; expiresAt: number };

		expect(res?.status).toBe(201);
		expect(manager.has(body.sessionId)).toBe(true);
		expect(body.expiresAt).toBeGreaterThan(Date.now());
		manager.cancel(body.sessionId);
	});

	it("returns 429 when global capacity is reached", async () => {
		const config = remoteLoginTestConfig({ maxSessions: 1 });
		const manager = new RemoteLoginManager(config, async () => fakeRemoteLoginPage());
		const handler = createRemoteLoginHandler(manager, config);
		const first = await handler(
			startRequest(startBody("user-1")),
			new URL("http://localhost:8081/youtube-remote-login/start"),
		);
		const firstBody = (await first?.json()) as { sessionId: string };
		const second = await handler(
			startRequest(startBody("user-2")),
			new URL("http://localhost:8081/youtube-remote-login/start"),
		);

		expect(first?.status).toBe(201);
		expect(second?.status).toBe(429);
		manager.cancel(firstBody.sessionId);
	});
});
