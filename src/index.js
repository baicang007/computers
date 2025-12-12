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
		width INTEGER DEFAULT 72,
		height INTEGER DEFAULT 72,
		pos_x INTEGER DEFAULT 12,
		pos_y INTEGER DEFAULT 12,
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

function arrayBufferToBase64(buffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
		binary += String.fromCharCode.apply(null, slice);
	}
	return btoa(binary);
}

async function fetchImageAsDataUri(urlOrPath, request, env) {
	if (!urlOrPath) return urlOrPath;
	// if it's already a data URI, return as-is
	if (String(urlOrPath).startsWith('data:')) return urlOrPath;
	try {
		const target = new URL(urlOrPath, request.url).toString();
		let res;
		if (env && env.ASSETS) {
			// try ASSETS first (static binding)
			try {
				res = await env.ASSETS.fetch(new Request(target, request));
				if (res && res.status === 404) {
					res = await fetch(target);
				}
			} catch (e) {
				res = await fetch(target);
			}
		} else {
			res = await fetch(target);
		}
		if (!res || !res.ok) return urlOrPath;
		const contentType = res.headers.get('Content-Type') || 'application/octet-stream';
		const buf = await res.arrayBuffer();
		const b64 = arrayBufferToBase64(buf);
		return `data:${contentType};base64,${b64}`;
	} catch (e) {
		return urlOrPath;
	}
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

		// helper to build JSON responses with required security headers
		function jsonResponse(obj, status = 200, extraHeaders = {}) {
			const headers = new Headers(Object.assign({ 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' }, extraHeaders));
			return new Response(JSON.stringify(obj), { status, headers });
		}

		// Serve static assets from the ASSETS binding when available
		if (request.method === 'GET') {
			try {
				// normalize root to /index.html
				const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
				const assetRequest = new Request(new URL(pathname, request.url).toString(), request);
				if (env.ASSETS) {
					const r = await env.ASSETS.fetch(assetRequest);
					// If asset found (200), return it with security header
					if (r.status !== 404) {
						const headers = new Headers(r.headers);
						headers.set('X-Content-Type-Options', 'nosniff');
						return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
					}
				}
			} catch (e) {
				// Fall through to other handlers
			}
		}

		// API handlers
		if (url.pathname.startsWith('/api')) {
			await ensureTables(env.computers);
			// Desktop items endpoints
			if (url.pathname === '/api/desktop-items' && request.method === 'GET') {
				const user = await getUserFromRequest(request, env);
				if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
				const rows = await env.computers
					.prepare(
						`SELECT id, name, url, icon, width, height, pos_x, pos_y, created_at FROM desktop_items WHERE user_id = ? ORDER BY created_at ASC`
					)
					.bind(user.id)
					.all();
				return jsonResponse({ items: rows.results || [] }, 200);
			}
			if (url.pathname === '/api/desktop-items' && request.method === 'POST') {
				const user = await getUserFromRequest(request, env);
				if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
				try {
					const body = await request.json();
					const name = String(body.name || '').trim();
					const urlv = String(body.url || '').trim();
					let icon = String(body.icon || '/icons/web.svg');
					// convert icon URL to base64 data URI before storing (if not already data:)
					try {
						icon = await fetchImageAsDataUri(icon, request, env);
					} catch (_) {
						// fallback: keep original icon value
					}
					const width = Number.isFinite(Number(body.width)) ? parseInt(body.width, 10) : 72;
					const height = Number.isFinite(Number(body.height)) ? parseInt(body.height, 10) : 92;
					const pos_x = Number.isFinite(Number(body.pos_x)) ? parseInt(body.pos_x, 10) : 12;
					const pos_y = Number.isFinite(Number(body.pos_y)) ? parseInt(body.pos_y, 10) : 12;
					if (!name || !urlv) return jsonResponse({ error: 'Missing fields' }, 400);
					const res = await env.computers
						.prepare(`INSERT INTO desktop_items (user_id,name,url,icon,width,height,pos_x,pos_y) VALUES (?,?,?,?,?,?,?,?)`)
						.bind(user.id, name, urlv, icon, width, height, pos_x, pos_y)
						.run();
					// return the created item id
					return jsonResponse({ success: true, id: res.lastRowId || null }, 200);
				} catch (e) {
					return jsonResponse({ error: 'invalid body' }, 400);
				}
			}
			// PATCH /api/desktop-items/:id - update position/size (owner only)
			if (request.method === 'PATCH' && url.pathname.startsWith('/api/desktop-items/')) {
				const user = await getUserFromRequest(request, env);
				if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
				const parts = url.pathname.split('/').filter(Boolean);
				const id = parts[parts.length - 1];
				if (!id) return jsonResponse({ error: 'missing id' }, 400);
				try {
					const body = await request.json();
					const fields = [];
					const params = [];
					// allow updating icon (data URI) as well
					if (Object.prototype.hasOwnProperty.call(body, 'icon')) {
						const v = String(body.icon || '').trim();
						if (v) {
							fields.push('icon = ?');
							params.push(v);
						}
					}
					if (Object.prototype.hasOwnProperty.call(body, 'pos_x')) {
						const v = parseInt(body.pos_x, 10);
						if (!Number.isNaN(v)) {
							fields.push('pos_x = ?');
							params.push(v);
						}
					}
					if (Object.prototype.hasOwnProperty.call(body, 'pos_y')) {
						const v = parseInt(body.pos_y, 10);
						if (!Number.isNaN(v)) {
							fields.push('pos_y = ?');
							params.push(v);
						}
					}
					if (Object.prototype.hasOwnProperty.call(body, 'width')) {
						const v = parseInt(body.width, 10);
						if (!Number.isNaN(v)) {
							fields.push('width = ?');
							params.push(v);
						}
					}
					if (Object.prototype.hasOwnProperty.call(body, 'height')) {
						const v = parseInt(body.height, 10);
						if (!Number.isNaN(v)) {
							fields.push('height = ?');
							params.push(v);
						}
					}
					if (fields.length === 0) return jsonResponse({ error: 'no fields' }, 400);
					params.push(id);
					params.push(user.id);
					const sql = `UPDATE desktop_items SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
					const res = await env.computers
						.prepare(sql)
						.bind(...params)
						.run();
					return jsonResponse({ success: true, changes: res.changes || 0 }, 200);
				} catch (e) {
					return jsonResponse({ error: 'invalid body' }, 400);
				}
			}
			// DELETE /api/desktop-items/:id - 删除某个桌面项（仅限拥有者）
			if (request.method === 'DELETE' && url.pathname.startsWith('/api/desktop-items/')) {
				await ensureTables(env.computers);
				const user = await getUserFromRequest(request, env);
				if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
				const parts = url.pathname.split('/').filter(Boolean);
				const id = parts[parts.length - 1];
				if (!id) {
					return jsonResponse({ error: 'missing id' }, 400);
				}
				try {
					const res = await env.computers.prepare(`DELETE FROM desktop_items WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
					// res.changes may be 0 if no row deleted
					return jsonResponse({ success: true, deleted: res.changes || 0 }, 200);
				} catch (e) {
					return jsonResponse({ error: 'delete failed' }, 500);
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
					if (!username || !email || !password) return jsonResponse({ error: 'Missing fields' }, 400);
					const password_hash = await hashPassword(password);
					// insert into users
					try {
						const res = await env.computers
							.prepare(`INSERT INTO users (username,email,password_hash) VALUES (?,?,?)`)
							.bind(username, email, password_hash)
							.run();
						return jsonResponse({ success: true }, 200);
					} catch (e) {
						return jsonResponse({ error: '用户名或邮箱已存在' }, 400);
					}
				} catch (e) {
					return jsonResponse({ error: 'invalid body' }, 400);
				}
			}
			if (url.pathname === '/api/login' && request.method === 'POST') {
				try {
					const body = await request.json();
					const username = String(body.username || '').trim();
					const password = String(body.password || '');
					if (!username || !password) return jsonResponse({ error: 'Missing fields' }, 400);
					const rows = await env.computers.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).all();
					const user = rows.results && rows.results[0];
					if (!user) return jsonResponse({ error: '用户名或密码错误' }, 401);
					const hash = await hashPassword(password);
					if (hash !== user.password_hash) return jsonResponse({ error: '用户名或密码错误' }, 401);
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
					headers.set('X-Content-Type-Options', 'nosniff');
					return new Response(JSON.stringify({ success: true }), { status: 200, headers });
				} catch (e) {
					return jsonResponse({ error: 'invalid body' }, 400);
				}
			}
			if (url.pathname === '/api/session' && request.method === 'GET') {
				const cookie = request.headers.get('Cookie') || '';
				const match = cookie
					.split(';')
					.map((s) => s.trim())
					.find((s) => s.startsWith('session='));
				if (!match) return jsonResponse({ authenticated: false }, 401);
				const token = match.split('=')[1];
				if (!token) return jsonResponse({ authenticated: false }, 401);
				const rows = await env.computers
					.prepare(
						`SELECT users.id, users.username, users.email FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.token = ? AND sessions.expires_at > datetime('now')`
					)
					.bind(token)
					.all();
				const user = rows.results && rows.results[0];
				if (!user) return jsonResponse({ authenticated: false }, 401);
				return jsonResponse({ authenticated: true, user: { id: user.id, username: user.username, email: user.email } }, 200);
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
				headers.set('X-Content-Type-Options', 'nosniff');
				return new Response(JSON.stringify({ success: true }), { status: 200, headers });
			}
			return jsonResponse({ error: 'Not found' }, 404);
		}

		// Fallback for other routes
		const fallbackHeaders = new Headers({ 'Content-Type': 'text/plain', 'X-Content-Type-Options': 'nosniff' });
		return new Response('Not found', { status: 404, headers: fallbackHeaders });
	},
};
