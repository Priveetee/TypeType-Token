import type { RemoteLoginPage } from "./remote-login-browser.ts";
import type { RemoteLoginCompletionTarget } from "./remote-login-callback.ts";
import type { RemoteLoginConfig } from "./remote-login-config.ts";

export type RemoteLoginConnection = {
	sendText: (value: string) => boolean;
	sendBinary: (value: Uint8Array) => boolean;
	bufferedAmount: () => number;
	close: (code: number, reason: string) => void;
};

export type RemoteLoginPageFactory = (
	config: RemoteLoginConfig,
	onPoToken: (poToken: string) => void,
) => Promise<RemoteLoginPage>;

export type RemoteLoginSessionOptions = {
	sessionId: string;
	userId: string;
	expiresAt: number;
	target: RemoteLoginCompletionTarget;
	config: RemoteLoginConfig;
	createPage: RemoteLoginPageFactory;
	onDone: (sessionId: string, userId: string) => void;
};
