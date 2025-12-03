// index.js - 简单的 Start 菜单切换和关闭逻辑
(function () {
	const startButton = document.getElementById('startButton');
	const startMenu = document.getElementById('startMenu');
	const desktop = document.getElementById('desktop');
	function openMenu() {
		startMenu.setAttribute('aria-hidden', 'false');
		startButton.setAttribute('aria-expanded', 'true');
	}
	function closeMenu() {
		startMenu.setAttribute('aria-hidden', 'true');
		startButton.setAttribute('aria-expanded', 'false');
	}
	function toggleMenu() {
		const isHidden = startMenu.getAttribute('aria-hidden') === 'true';
		if (isHidden) openMenu();
		else closeMenu();
	}
	startButton.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleMenu();
	});
	// Close when clicking outside (also hide context menu if open)
	document.addEventListener('click', (e) => {
		if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
			closeMenu();
		}
		if (contextMenu && !contextMenu.contains(e.target)) {
			hideContextMenu();
		}
	});
	// Close on Escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeMenu();
			hideContextMenu();
		}
	});
	// Custom desktop context menu
	const contextMenu = document.getElementById('desktopContextMenu');
	function hideContextMenu() {
		if (!contextMenu) return;
		contextMenu.setAttribute('aria-hidden', 'true');
		contextMenu.style.left = '-9999px';
		contextMenu.style.top = '-9999px';
		contextMenu.classList.remove('sub-left');
	}
	function showContextMenu(x, y) {
		if (!contextMenu) return;
		// position relative to desktop container
		const desktopRect = desktop.getBoundingClientRect();
		let left = x - desktopRect.left;
		let top = y - desktopRect.top;
		contextMenu.style.left = left + 'px';
		contextMenu.style.top = top + 'px';
		contextMenu.setAttribute('aria-hidden', 'false');
		// adjust if overflowing right/bottom
		const menuRect = contextMenu.getBoundingClientRect();
		const padding = 8;
		if (menuRect.right > desktopRect.right) {
			// move left
			const shift = menuRect.right - desktopRect.right + padding;
			contextMenu.style.left = left - shift + 'px';
			// mark to open submenus to left
			contextMenu.classList.add('sub-left');
		} else {
			contextMenu.classList.remove('sub-left');
		}
		if (menuRect.bottom > desktopRect.bottom) {
			const shiftY = menuRect.bottom - desktopRect.bottom + padding;
			contextMenu.style.top = top - shiftY + 'px';
		}
	}
	// hide context menu on resize/scroll to avoid misplaced menu
	window.addEventListener('resize', hideContextMenu);
	window.addEventListener('scroll', hideContextMenu, true);

	desktop.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		// do not show when auth overlay is visible
		if (authOverlay && authOverlay.getAttribute('aria-hidden') === 'false') return;
		showContextMenu(e.clientX, e.clientY);
	});

	// Auth flow
	const authOverlay = document.getElementById('authOverlay');
	const loginBox = document.getElementById('loginBox');
	const registerBox = document.getElementById('registerBox');
	const loginBtn = document.getElementById('loginBtn');
	const registerBtn = document.getElementById('registerBtn');
	const showRegisterBtn = document.getElementById('showRegisterBtn');
	const showLoginBtn = document.getElementById('showLoginBtn');
	const loginError = document.getElementById('loginError');
	const registerError = document.getElementById('registerError');
	const logoutBtn = document.getElementById('logoutBtn');

	async function checkSession() {
		try {
			const r = await fetch('/api/session', { credentials: 'include' });
			if (r.status === 200) {
				// logged in
				authOverlay.setAttribute('aria-hidden', 'true');
				try {
					const data = await r.json();
					const startUserBtn = document.getElementById('startUserBtn');
					if (startUserBtn && data?.user?.username) {
						startUserBtn.textContent = data.user.username;
					}
					// load desktop items for this user
					loadDesktopItems();
				} catch (_) {}
			} else {
				// not logged in
				authOverlay.setAttribute('aria-hidden', 'false');
				registerBox.setAttribute('aria-hidden', 'true');
				loginBox.style.display = 'block';
			}
		} catch (e) {
			authOverlay.setAttribute('aria-hidden', 'false');
		}
	}
	checkSession();

	function showRegister() {
		registerBox.setAttribute('aria-hidden', 'false');
		loginBox.style.display = 'none';
	}
	function showLogin() {
		registerBox.setAttribute('aria-hidden', 'true');
		loginBox.style.display = 'block';
	}

	showRegisterBtn.addEventListener('click', (e) => {
		e.preventDefault();
		showRegister();
	});
	showLoginBtn.addEventListener('click', (e) => {
		e.preventDefault();
		showLogin();
	});

	// Desktop shortcut creation
	const createShortcutModal = document.getElementById('createShortcutModal');
	const scName = document.getElementById('scName');
	const scUrl = document.getElementById('scUrl');
	const scCreateBtn = document.getElementById('scCreateBtn');
	const scCancelBtn = document.getElementById('scCancelBtn');
	const scError = document.getElementById('scError');
	const desktopIcons = document.getElementById('desktopIcons');
	const DEFAULT_ICON = '/icons/web.svg';

	function openCreateShortcut() {
		if (!createShortcutModal) return;
		scError.textContent = '';
		scName.value = '';
		scUrl.value = '';
		createShortcutModal.setAttribute('aria-hidden', 'false');
	}
	function closeCreateShortcut() {
		if (!createShortcutModal) return;
		createShortcutModal.setAttribute('aria-hidden', 'true');
	}

	// handler from context menu
	const cmNewShortcut = document.getElementById('cm-new-shortcut');
	if (cmNewShortcut) {
		cmNewShortcut.addEventListener('click', (e) => {
			e.stopPropagation();
			hideContextMenu();
			openCreateShortcut();
		});
	}

	// Create shortcut modal actions
	if (scCancelBtn) {
		scCancelBtn.addEventListener('click', (e) => {
			e.preventDefault();
			closeCreateShortcut();
		});
	}
	if (scCreateBtn) {
		scCreateBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			scError.textContent = '';
			const name = (scName.value || '').trim();
			let urlv = (scUrl.value || '').trim();
			if (!name || !urlv) {
				scError.textContent = '请填写名称和网址';
				return;
			}
			if (!/^https?:\/\//i.test(urlv)) urlv = 'https://' + urlv;
			try {
				const r = await fetch('/api/desktop-items', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name, url: urlv, icon: DEFAULT_ICON }),
					credentials: 'include',
				});
				if (r.status === 200) {
					closeCreateShortcut();
					await loadDesktopItems();
				} else {
					const data = await r.json();
					scError.textContent = data?.error || '创建失败';
				}
			} catch (e) {
				scError.textContent = '网络错误';
			}
		});
	}

	function renderDesktopItems(items) {
		if (!desktopIcons) return;
		desktopIcons.innerHTML = '';
		items.forEach((it) => {
			const el = document.createElement('div');
			el.className = 'desktop-icon';
			el.dataset.id = it.id;
			el.dataset.url = it.url;
			el.innerHTML = `<img src="${it.icon || DEFAULT_ICON}" alt="icon"><div class="label">${escapeHtml(it.name)}</div>`;
			el.addEventListener('click', (ev) => {
				const url = el.dataset.url;
				if (url) window.open(url, '_blank');
			});
			desktopIcons.appendChild(el);
		});
	}

	function escapeHtml(str) {
		return String(str).replace(
			/[&<>"']/g,
			(c) =>
				({
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#39;',
				}[c])
		);
	}

	async function loadDesktopItems() {
		try {
			const r = await fetch('/api/desktop-items', { credentials: 'include' });
			if (r.status === 200) {
				const data = await r.json();
				renderDesktopItems(data.items || []);
			}
		} catch (e) {
			/* ignore */
		}
	}

	// when logged in, load items
	// modify checkSession earlier to call loadDesktopItems when successful

	loginBtn.addEventListener('click', async (e) => {
		e.preventDefault();
		loginError.textContent = '';
		const username = document.getElementById('loginUsername').value.trim();
		const password = document.getElementById('loginPassword').value;
		if (!username || !password) {
			loginError.textContent = '请输入用户名和密码';
			return;
		}
		try {
			const r = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
				credentials: 'include',
			});
			if (r.status === 200) {
				authOverlay.setAttribute('aria-hidden', 'true');
				// load user desktop items after successful login
				loadDesktopItems();
			} else {
				const data = await r.json();
				loginError.textContent = data?.error || '登录失败';
			}
		} catch (e) {
			loginError.textContent = '网络错误';
		}
	});

	registerBtn.addEventListener('click', async (e) => {
		e.preventDefault();
		registerError.textContent = '';
		const username = document.getElementById('regUsername').value.trim();
		const password = document.getElementById('regPassword').value;
		const email = document.getElementById('regEmail').value.trim();
		if (!username || !password || !email) {
			registerError.textContent = '请填写所有字段';
			return;
		}
		try {
			const r = await fetch('/api/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, email }),
			});
			if (r.status === 200) {
				// registration successful, switch to login
				showLogin();
			} else {
				const data = await r.json();
				registerError.textContent = data?.error || '注册失败';
			}
		} catch (e) {
			registerError.textContent = '网络错误';
		}
	});

	if (logoutBtn) {
		logoutBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			try {
				const r = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
				if (r.status === 200) {
					authOverlay.setAttribute('aria-hidden', 'false');
					const startUserBtn = document.getElementById('startUserBtn');
					if (startUserBtn) startUserBtn.textContent = '你的用户';
				}
			} catch (e) {
				/* ignore */
			}
		});
	}
})();
