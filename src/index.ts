import { fetchPoToken } from "./token-service.ts";

const PORT = 8081;

Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);

		if (req.method === "GET" && url.pathname === "/potoken") {
			const videoId = url.searchParams.get("videoId");

			if (!videoId) {
				return Response.json({ error: "videoId query parameter is required" }, { status: 400 });
			}

			try {
				const result = await fetchPoToken(videoId);
				return Response.json(result);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Internal error";
				return Response.json({ error: message }, { status: 500 });
			}
		}

		return new Response("Not Found", { status: 404 });
	},
});
