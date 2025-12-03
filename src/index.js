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
async function ensureSessionTable(db) {
	const sql = `CREATE TABLE IF NOT EXISTS sessions(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		token TEXT UNIQUE,
		expires_at DATETIME,
		FOREIGN KEY(user_id) REFERENCES users(id)
	)`;
	await db.prepare(sql).run();
}

async function ensureDesktopItemsTable(db) {
	const sql = `CREATE TABLE IF NOT EXISTS desktop_items(
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		name TEXT,
		url TEXT,
		icon TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(user_id) REFERENCES users(id)
	)`;
	await db.prepare(sql).run();
}

async function ensureTables(db) {
	await ensureUserTable(db);
	await ensureSessionTable(db);
	await ensureDesktopItemsTable(db);
}

// helper: resolve user from request via session cookie
async function getUserFromRequest(request, env) {
	const cookie = request.headers.get('Cookie') || '';
	const match = cookie
		.split(';')
		.map((s) => s.trim())
		.find((s) => s.startsWith('session='));
	if (!match) return null;
	const token = match.split('=')[1];
	if (!token) return null;
	const rows = await env.computers
		.prepare(
			`SELECT users.id, users.username, users.email FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.token = ? AND sessions.expires_at > datetime('now')`
		)
		.bind(token)
		.all();
	const user = rows.results && rows.results[0];
	return user || null;
}

function generateToken() {
	const arr = new Uint8Array(32);
	crypto.getRandomValues(arr);
	return Array.from(arr)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// helper to set cookie string (simple helper)
function cookieString(name, value, opts = {}) {
	let parts = [`${name}=${value}`];
	if (opts['Max-Age']) parts.push(`Max-Age=${opts['Max-Age']}`);
	if (opts.Path) parts.push(`Path=${opts.Path}`);
	if (opts.HttpOnly) parts.push('HttpOnly');
	if (opts.Secure) parts.push('Secure');
	if (opts.SameSite) parts.push(`SameSite=${opts.SameSite}`);
	return parts.join('; ');
}

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

		// API handlers
		if (url.pathname.startsWith('/api')) {
			// Desktop items endpoints
			if (url.pathname === '/api/desktop-items' && request.method === 'GET') {
				const user = await getUserFromRequest(request, env);
				if (!user)
					return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
				const rows = await env.computers
					.prepare(`SELECT id, name, url, icon, created_at FROM desktop_items WHERE user_id = ? ORDER BY created_at ASC`)
					.bind(user.id)
					.all();
				return new Response(JSON.stringify({ items: rows.results || [] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (url.pathname === '/api/desktop-items' && request.method === 'POST') {
				const user = await getUserFromRequest(request, env);
				if (!user)
					return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
				try {
					const body = await request.json();
					const name = String(body.name || '').trim();
					const urlv = String(body.url || '').trim();
					const icon = String(body.icon || '/icons/web.svg');
					if (!name || !urlv)
						return new Response(JSON.stringify({ error: 'Missing fields' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					const res = await env.computers
						.prepare(`INSERT INTO desktop_items (user_id,name,url,icon) VALUES (?,?,?,?)`)
						.bind(user.id, name, urlv, icon)
						.run();
					// return the created item id
					return new Response(JSON.stringify({ success: true, id: res.lastRowId || null }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					});
				} catch (e) {
					return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
				}
			}

			// API: must check method
			await ensureTables(env.computers);
			if (url.pathname === '/api/register' && request.method === 'POST') {
				try {
					const body = await request.json();
					const username = String(body.username || '').trim();
					const email = String(body.email || '').trim();
					const password = String(body.password || '');
					if (!username || !email || !password)
						return new Response(JSON.stringify({ error: 'Missing fields' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					const password_hash = await hashPassword(password);
					// insert into users
					try {
						const res = await env.computers
							.prepare(`INSERT INTO users (username,email,password_hash) VALUES (?,?,?)`)
							.bind(username, email, password_hash)
							.run();
						return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
					} catch (e) {
						return new Response(JSON.stringify({ error: '用户名或邮箱已存在' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					}
				} catch (e) {
					return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
				}
			}
			if (url.pathname === '/api/login' && request.method === 'POST') {
				try {
					const body = await request.json();
					const username = String(body.username || '').trim();
					const password = String(body.password || '');
					if (!username || !password)
						return new Response(JSON.stringify({ error: 'Missing fields' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					const rows = await env.computers.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).all();
					const user = rows.results && rows.results[0];
					if (!user)
						return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
							status: 401,
							headers: { 'Content-Type': 'application/json' },
						});
					const hash = await hashPassword(password);
					if (hash !== user.password_hash)
						return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
							status: 401,
							headers: { 'Content-Type': 'application/json' },
						});
					// create session
					const token = generateToken();
					await env.computers
						.prepare(`INSERT INTO sessions (user_id, token, expires_at) VALUES (?,?, datetime('now', '+7 days'))`)
						.bind(user.id, token)
						.run();
					const headers = new Headers({ 'Content-Type': 'application/json' });
					// For local dev (http) we omit Secure, but set HttpOnly; Cookies are set cross-origin with credentials: include
					headers.append(
						'Set-Cookie',
						cookieString('session', token, { Path: '/', HttpOnly: true, Secure: false, SameSite: 'Lax', 'Max-Age': 7 * 24 * 3600 })
					);
					return new Response(JSON.stringify({ success: true }), { status: 200, headers });
				} catch (e) {
					return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
				}
			}
			if (url.pathname === '/api/session' && request.method === 'GET') {
				const cookie = request.headers.get('Cookie') || '';
				const match = cookie
					.split(';')
					.map((s) => s.trim())
					.find((s) => s.startsWith('session='));
				if (!match)
					return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
				const token = match.split('=')[1];
				if (!token)
					return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
				const rows = await env.computers
					.prepare(
						`SELECT users.id, users.username, users.email FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.token = ? AND sessions.expires_at > datetime('now')`
					)
					.bind(token)
					.all();
				const user = rows.results && rows.results[0];
				if (!user)
					return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
				return new Response(JSON.stringify({ authenticated: true, user: { id: user.id, username: user.username, email: user.email } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (url.pathname === '/api/logout' && request.method === 'POST') {
				// invalidate session cookie
				const cookie = request.headers.get('Cookie') || '';
				const match = cookie
					.split(';')
					.map((s) => s.trim())
					.find((s) => s.startsWith('session='));
				if (match) {
					const token = match.split('=')[1];
					if (token) {
						await env.computers.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
					}
				}
				const headers = new Headers({ 'Content-Type': 'application/json' });
				headers.append(
					'Set-Cookie',
					cookieString('session', '', { Path: '/', HttpOnly: true, Secure: false, SameSite: 'Lax', 'Max-Age': 0 })
				);
				return new Response(JSON.stringify({ success: true }), { status: 200, headers });
			}
			return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
		}

		// Fallback for other routes
		return new Response('Not found', { status: 404 });
	},
};
