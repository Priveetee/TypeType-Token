import { describe, expect, it } from "bun:test";
import type { RemoteLoginPage } from "../src/remote-login-browser.ts";
import { RemoteLoginManager } from "../src/remote-login-manager.ts";
import type { RemoteLoginPageFactory } from "../src/remote-login-session-types.ts";
import {
	fakeRemoteLoginPage,
	remoteLoginTarget,
	remoteLoginTestConfig,
} from "./remote-login-fixtures.ts";

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("RemoteLoginManager", () => {
	it("enforces the global session limit", async () => {
		const manager = new RemoteLoginManager(remoteLoginTestConfig({ maxSessions: 1 }), async () =>
			fakeRemoteLoginPage(),
		);
		const first = await manager.start({
			userId: "user-1",
			ttlMs: 300_000,
			target: remoteLoginTarget(),
		});
		const second = await manager.start({
			userId: "user-2",
			ttlMs: 300_000,
			target: remoteLoginTarget(),
		});

		expect(first).not.toBeNull();
		expect(second).toBeNull();
		expect(manager.activeCount()).toBe(1);
		if (first) manager.cancel(first.sessionId);
	});

	it("replaces an existing session for the same user", async () => {
		let closeCalls = 0;
		const manager = new RemoteLoginManager(remoteLoginTestConfig(), async () =>
			fakeRemoteLoginPage({
				close: async () => {
					closeCalls += 1;
				},
			}),
		);
		const first = await manager.start({
			userId: "user-1",
			ttlMs: 300_000,
			target: remoteLoginTarget(),
		});
		await tick();
		const second = await manager.start({
			userId: "user-1",
			ttlMs: 300_000,
			target: remoteLoginTarget(),
		});
		await tick();

		expect(first).not.toBeNull();
		expect(second).not.toBeNull();
		expect(manager.activeCount()).toBe(1);
		expect(closeCalls).toBe(1);
		if (second) manager.cancel(second.sessionId);
	});

	it("closes a page created after cancellation during startup", async () => {
		let resolvePage: ((page: RemoteLoginPage) => void) | null = null;
		let closeCalls = 0;
		const createPage: RemoteLoginPageFactory = async () =>
			new Promise((resolve) => {
				resolvePage = resolve;
			});
		const manager = new RemoteLoginManager(remoteLoginTestConfig(), createPage);
		const started = await manager.start({
			userId: "user-1",
			ttlMs: 300_000,
			target: remoteLoginTarget(),
		});

		expect(started).not.toBeNull();
		if (!started || !resolvePage) throw new Error("session did not start");
		manager.cancel(started.sessionId);
		resolvePage(
			fakeRemoteLoginPage({
				close: async () => {
					closeCalls += 1;
				},
			}),
		);
		await tick();

		expect(manager.activeCount()).toBe(0);
		expect(closeCalls).toBe(1);
	});
});
