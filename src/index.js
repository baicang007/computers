/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

async function hashPassword(password) {
	const enc = new TextEncoder();
	const data = enc.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ensureUserTable(db) {
	// Use quoted table name "user" as requested
	const sql = `CREATE TABLE IF NOT EXISTS "users" (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT UNIQUE,
				email TEXT UNIQUE,
				password_hash TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`;
	await db.prepare(sql).run();
}
// ensure table exists
//await ensureUserTable(db);

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// Serve static assets from the ASSETS binding when available
		if (request.method === 'GET') {
			try {
				// normalize root to /index.html
				const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
				const assetRequest = new Request(new URL(pathname, request.url).toString(), request);
				if (env.ASSETS) {
					const r = await env.ASSETS.fetch(assetRequest);
					// If asset found (200), return it
					if (r.status !== 404) return r;
				}
			} catch (e) {
				// Fall through to other handlers
			}
		}

		// Fallback for other routes
		return new Response('Not found', { status: 404 });
	},
};
