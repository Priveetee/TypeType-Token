import type { Server } from "bun";
import { readRemoteLoginConfig } from "./remote-login-config.ts";
import { RemoteLoginManager } from "./remote-login-manager.ts";
import {
	createRemoteLoginConnection,
	createRemoteLoginHandler,
	type RemoteLoginWebSocketData,
} from "./remote-login-routes.ts";
import { fetchSubtitles } from "./subtitles.ts";
import { fetchPoToken } from "./token-service.ts";

const PORT = 8081;
const remoteLoginConfig = readRemoteLoginConfig();
const remoteLoginManager = new RemoteLoginManager(remoteLoginConfig);
const remoteLoginHandler = createRemoteLoginHandler(remoteLoginManager, remoteLoginConfig);

export async function handler(
	req: Request,
	server?: Server<RemoteLoginWebSocketData>,
): Promise<Response | undefined> {
	const url = new URL(req.url);
	const remoteLoginResponse = await remoteLoginHandler(req, url, server);
	if (remoteLoginResponse !== null) return remoteLoginResponse;

	if (req.method === "GET" && url.pathname === "/potoken") {
		const videoId = url.searchParams.get("videoId");

		if (!videoId) {
			return Response.json({ error: "videoId query parameter is required" }, { status: 400 });
		}

		try {
			const result = await fetchPoToken(videoId, url.searchParams.get("refresh") === "true");
			return Response.json(result);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Internal error";
			return Response.json({ error: message }, { status: 500 });
		}
	}

	if (req.method === "GET" && url.pathname === "/subtitles") {
		const videoId = url.searchParams.get("videoId");

		if (!videoId) {
			return Response.json({ error: "videoId query parameter is required" }, { status: 400 });
		}

		try {
			const tracks = await fetchSubtitles(videoId);
			return Response.json(tracks);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Internal error";
			return Response.json({ error: message }, { status: 500 });
		}
	}

	if (req.method === "GET" && url.pathname === "/health") {
		return Response.json({ status: "ok" });
	}

	return new Response("Not Found", { status: 404 });
}

if (import.meta.main) {
	Bun.serve<RemoteLoginWebSocketData>({
		port: PORT,
		fetch: handler,
		websocket: {
			open: (ws) => {
				remoteLoginManager.attach(ws.data.sessionId, createRemoteLoginConnection(ws));
			},
			message: (ws, message) => {
				if (typeof message === "string") remoteLoginManager.message(ws.data.sessionId, message);
			},
			close: (ws) => {
				remoteLoginManager.disconnect(ws.data.sessionId);
			},
		},
	});
}
