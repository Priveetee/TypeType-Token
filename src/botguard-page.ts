import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

const ROUTE = "https://www.youtube.com/__bgp__";
const BLANK_HTML = "<!DOCTYPE html><html><body></body></html>";

let browser: Browser | null = null;
let page: Page | null = null;

async function ensurePage(): Promise<Page> {
	if (!browser) {
		browser = await chromium.launch({ headless: true });
	}
	if (!page || page.isClosed()) {
		page = await browser.newPage();
		await page.route(ROUTE, (route) =>
			route.fulfill({ contentType: "text/html", body: BLANK_HTML }),
		);
		await page.goto(ROUTE);
	}
	return page;
}

type BotGuardArgs = { script: string; prog: string; name: string };
type MintArgs = { token: string; id: string };

export async function executeBotGuard(
	interpreterScript: string,
	program: string,
	globalName: string,
): Promise<string> {
	const p = await ensurePage();
	return p.evaluate(
		async (args: BotGuardArgs): Promise<string> => {
			new Function(args.script)();
			const g = globalThis as Record<string, Record<string, (...a: unknown[]) => unknown>>;
			const vm = g[args.name];
			if (!vm?.a) throw new Error("BotGuard VM not found");

			let asyncSnapshotFn: ((...a: unknown[]) => void) | undefined;
			const wpo: unknown[] = [];

			vm.a(
				args.prog,
				(af: (...a: unknown[]) => void) => {
					asyncSnapshotFn = af;
				},
				true,
				undefined,
				() => undefined,
				[[], []],
			);

			const af = await new Promise<(...a: unknown[]) => void>((resolve, reject) => {
				let n = 0;
				const id = setInterval(() => {
					if (asyncSnapshotFn) {
						clearInterval(id);
						resolve(asyncSnapshotFn);
					} else if (++n > 10000) {
						clearInterval(id);
						reject(new Error("asyncSnapshotFunction timed out"));
					}
				}, 1);
			});

			(globalThis as Record<string, unknown>).__wpo = wpo;

			return new Promise<string>((resolve) => {
				af((r: unknown) => resolve(r as string), [undefined, undefined, wpo, undefined]);
			});
		},
		{ script: interpreterScript, prog: program, name: globalName },
	);
}

export async function mintPoToken(integrityToken: string, identifier: string): Promise<string> {
	const p = await ensurePage();
	return p.evaluate(
		async (args: MintArgs): Promise<string> => {
			const g = globalThis as Record<string, unknown>;
			const wpo = g.__wpo as unknown[];
			const getMinter = wpo[0] as
				| ((bytes: Uint8Array) => Promise<(id: Uint8Array) => Promise<Uint8Array>>)
				| undefined;
			if (!getMinter) throw new Error("PMD:Undefined");

			const b64 = args.token.replace(/-/g, "+").replace(/_/g, "/").replace(/\./g, "=");
			const tokenBytes = Uint8Array.from(
				atob(b64)
					.split("")
					.map((c) => c.charCodeAt(0)),
			);
			const mintFn = await getMinter(tokenBytes);
			if (!(mintFn instanceof Function)) throw new Error("APF:Failed");

			const result = await mintFn(new TextEncoder().encode(args.id));
			if (!(result instanceof Uint8Array)) throw new Error("ODM:Invalid");

			let bin = "";
			for (let i = 0; i < result.length; i++) bin += String.fromCharCode(result[i]);
			return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
		},
		{ token: integrityToken, id: identifier },
	);
}

export async function resetBotGuardPage(): Promise<void> {
	if (page && !page.isClosed()) await page.close();
	page = null;
}
