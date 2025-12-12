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
		if (typeof iconContextMenu !== 'undefined' && iconContextMenu && !iconContextMenu.contains(e.target)) {
			hideIconContextMenu();
		}
	});
	// Close on Escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeMenu();
			hideContextMenu();
			hideIconContextMenu();
		}
	});
	// Custom desktop context menu
	const contextMenu = document.getElementById('desktopContextMenu');
	// Icon-specific context menu
	const iconContextMenu = document.getElementById('iconContextMenu');
	let currentIconTarget = null;

	function hideIconContextMenu() {
		if (!iconContextMenu) return;
		iconContextMenu.setAttribute('aria-hidden', 'true');
		iconContextMenu.style.left = '-9999px';
		iconContextMenu.style.top = '-9999px';
	}

	function showIconContextMenu(x, y, targetEl) {
		if (!iconContextMenu) return;
		// hide desktop menu if open
		hideContextMenu();
		const desktopRect = desktop.getBoundingClientRect();
		let left = x - desktopRect.left;
		let top = y - desktopRect.top;
		iconContextMenu.style.left = left + 'px';
		iconContextMenu.style.top = top + 'px';
		iconContextMenu.setAttribute('aria-hidden', 'false');
		currentIconTarget = targetEl || null;
		const menuRect = iconContextMenu.getBoundingClientRect();
		const padding = 8;
		if (menuRect.right > desktopRect.right) {
			const shift = menuRect.right - desktopRect.right + padding;
			iconContextMenu.style.left = left - shift + 'px';
		}
		if (menuRect.bottom > desktopRect.bottom) {
			const shiftY = menuRect.bottom - desktopRect.bottom + padding;
			iconContextMenu.style.top = top - shiftY + 'px';
		}
	}
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

	// Only show desktop context menu when right-clicking on the desktop surface
	function isDesktopSurface(target) {
		if (!desktop || !target) return false;
		// If the click is inside any UI element that is not the desktop surface, ignore
		// Exclude taskbar, start menu, auth overlays, modals, existing context menus, desktop icons
		const forbidden = target.closest(
			'.taskbar, #startMenu, #authOverlay, #createShortcutModal, .context-menu, .desktop-icon, .shortcut-modal'
		);
		if (forbidden) return false;
		// Otherwise, ensure the clicked element is inside the desktop container
		return Boolean(target.closest('#desktop'));
	}

	desktop.addEventListener('contextmenu', (e) => {
		// If the event target is not part of the desktop surface (e.g., taskbar, start menu), do nothing
		if (!isDesktopSurface(e.target)) return;
		e.preventDefault();
		// do not show when auth overlay is visible
		if (authOverlay && authOverlay.getAttribute('aria-hidden') === 'false') return;
		showContextMenu(e.clientX, e.clientY);
	});

	// Prevent contextmenu events on known child UI elements from bubbling to `desktop`
	const taskbarEl = document.querySelector('.taskbar');
	if (taskbarEl)
		taskbarEl.addEventListener('contextmenu', (e) => {
			e.stopPropagation();
		});
	const startMenuEl = document.getElementById('startMenu');
	if (startMenuEl)
		startMenuEl.addEventListener('contextmenu', (e) => {
			e.stopPropagation();
		});
	const createShortcutModalEl = document.getElementById('createShortcutModal');
	if (createShortcutModalEl)
		createShortcutModalEl.addEventListener('contextmenu', (e) => {
			e.stopPropagation();
		});
	const authOverlayEl = document.getElementById('authOverlay');
	if (authOverlayEl)
		authOverlayEl.addEventListener('contextmenu', (e) => {
			e.stopPropagation();
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
	const DEFAULT_ICON = '/icons/webhint.png';

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

	// handler for icon-specific context menu: 打开
	const cmOpen = document.getElementById('cm-open');
	if (cmOpen) {
		cmOpen.addEventListener('click', (e) => {
			e.stopPropagation();
			hideIconContextMenu();
			if (!currentIconTarget) return;
			const url = currentIconTarget.dataset.url;
			if (!url) return;
			// simulate clicking the icon: open url in new tab/window
			window.open(url, '_blank');
		});
	}

	// handler for icon-specific context menu: 更换 图标
	const cmChange = document.getElementById('cm-change');
	if (cmChange) {
		cmChange.addEventListener('click', async (e) => {
			e.stopPropagation();
			hideIconContextMenu();
			if (!currentIconTarget) return;
			// create hidden file input
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.style.display = 'none';
			document.body.appendChild(input);
			input.addEventListener('change', async () => {
				const file = input.files && input.files[0];
				document.body.removeChild(input);
				if (!file) return;
				const maxBytes = 100 * 1024; // 100KB
				if (file.size > maxBytes) {
					alert('请选择小于100KB的图片');
					return;
				}
				// read as data URL
				const reader = new FileReader();
				reader.onload = async () => {
					const dataUrl = String(reader.result || '');
					if (!dataUrl) return;
					const id = currentIconTarget.dataset.id;
					if (!id) return;
					try {
						const r = await fetch(`/api/desktop-items/${encodeURIComponent(id)}`, {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ icon: dataUrl }),
							credentials: 'include',
						});
						if (r.status === 200) {
							// update DOM immediately
							const img = currentIconTarget.querySelector('img');
							if (img) img.src = dataUrl;
						} else {
							alert('上传失败');
							loadDesktopItems();
						}
					} catch (err) {
						alert('上传失败');
						loadDesktopItems();
					}
				};
				reader.readAsDataURL(file);
			});
			// open dialog
			input.click();
		});
	}

	// size submenu handlers
	const cmSizeLarge = document.getElementById('cm-size-large');
	const cmSizeMedium = document.getElementById('cm-size-medium');
	const cmSizeSmall = document.getElementById('cm-size-small');

	async function handleSizeChange(size) {
		hideIconContextMenu();
		if (!currentIconTarget) return;
		const el = currentIconTarget;
		// compute container and image sizes
		const imgSize = parseInt(size, 10);
		const containerWidth = imgSize;
		const containerHeight = imgSize + 22; // allow space for label
		el.style.width = containerWidth + 'px';
		el.style.height = containerHeight + 'px';
		const img = el.querySelector('img');
		const label = el.querySelector('.label');
		if (img) {
			img.style.width = imgSize + 'px';
			img.style.height = imgSize + 'px';
		}
		if (label) label.style.width = containerWidth + 'px';
		// persist to server (width/height fields will store image size)
		const id = el.dataset.id;
		try {
			await saveIconPosition(id, parseInt(el.style.left || '0', 10) || 0, parseInt(el.style.top || '0', 10) || 0, imgSize, imgSize);
		} catch (e) {
			// failed to save; reload to keep consistency
			loadDesktopItems();
		}
	}

	if (cmSizeLarge)
		cmSizeLarge.addEventListener('click', (e) => {
			e.stopPropagation();
			handleSizeChange(96);
		});
	if (cmSizeMedium)
		cmSizeMedium.addEventListener('click', (e) => {
			e.stopPropagation();
			handleSizeChange(72);
		});
	if (cmSizeSmall)
		cmSizeSmall.addEventListener('click', (e) => {
			e.stopPropagation();
			handleSizeChange(48);
		});

	// handler for icon-specific context menu (删除)
	const cmDelete = document.getElementById('cm-delete');
	if (cmDelete) {
		cmDelete.addEventListener('click', async (e) => {
			e.stopPropagation();
			hideIconContextMenu();
			if (!currentIconTarget) return;
			const id = currentIconTarget.dataset.id;
			if (!id) return;
			// Optimistically remove from DOM, then call API
			const elToRemove = currentIconTarget;
			elToRemove.remove();
			currentIconTarget = null;
			try {
				const r = await fetch(`/api/desktop-items/${encodeURIComponent(id)}`, {
					method: 'DELETE',
					credentials: 'include',
				});
				if (r.status === 200) {
					// success
					return;
				} else {
					// failed — reload items to restore state
					await loadDesktopItems();
				}
			} catch (err) {
				await loadDesktopItems();
			}
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
				// compute a default position based on current icons count (grid)
				const count = desktopIcons ? desktopIcons.children.length : 0;
				const cols = 6; // icons per column
				const col = count % cols;
				const row = Math.floor(count / cols);
				const gapX = 24; // horizontal gap
				const gapY = 12; // vertical gap
				const defaultWidth = 72;
				const defaultHeight = 92;
				const pos_x = 12 + col * (defaultWidth + gapX);
				const pos_y = 12 + row * (defaultHeight + gapY);
				const r = await fetch('/api/desktop-items', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name, url: urlv, icon: DEFAULT_ICON, width: defaultWidth, height: defaultHeight, pos_x, pos_y }),
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

	// Taskbar clock
	const taskbarClockEl = document.getElementById('taskbarClock');

	function formatTime(date) {
		// Return localized time without seconds for a cleaner look, include seconds when desired
		try {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch (e) {
			// fallback
			const h = String(date.getHours()).padStart(2, '0');
			const m = String(date.getMinutes()).padStart(2, '0');
			return `${h}:${m}`;
		}
	}

	function updateClock() {
		if (!taskbarClockEl) return;
		const now = new Date();
		taskbarClockEl.textContent = formatTime(now);
	}

	// update immediately and then every 30s (minute precision) but also update on focus
	updateClock();
	let clockInterval = setInterval(updateClock, 30 * 1000);

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			updateClock();
		}
	});

	// ensure interval cleared on unload (cleanup)
	window.addEventListener('beforeunload', () => {
		clearInterval(clockInterval);
	});

	function renderDesktopItems(items) {
		if (!desktopIcons) return;
		desktopIcons.innerHTML = '';
		items.forEach((it) => {
			const el = document.createElement('div');
			el.className = 'desktop-icon';
			el.dataset.id = it.id;
			el.dataset.url = it.url;
			el.innerHTML = `<img src="${it.icon || DEFAULT_ICON}" alt="icon"><div class="label">${escapeHtml(it.name)}</div>`;
			// apply saved size and position if present
			const storedWidth = parseInt(it.width || it.iconWidth || 0, 10) || 0;
			const storedHeight = parseInt(it.height || it.iconHeight || 0, 10) || 0;
			const posX = parseInt(it.pos_x || it.posX || 12, 10);
			const posY = parseInt(it.pos_y || it.posY || 12, 10);
			el.style.position = 'absolute';
			el.style.left = posX + 'px';
			el.style.top = posY + 'px';
			// Interpret stored width/height as image size when reasonable
			let imgSize = 48;
			if (storedWidth >= 24 && storedWidth <= 256) imgSize = storedWidth;
			else if (storedHeight >= 24 && storedHeight <= 256) imgSize = storedHeight;
			const containerWidth = Math.max(72, imgSize);
			const containerHeight = imgSize + 22; // room for label
			el.style.width = containerWidth + 'px';
			el.style.height = containerHeight + 'px';
			setTimeout(() => {
				const img = el.querySelector('img');
				const label = el.querySelector('.label');
				if (img) {
					img.style.width = imgSize + 'px';
					img.style.height = imgSize + 'px';
				}
				if (label) label.style.width = containerWidth + 'px';
			}, 0);
			// click opens unless the user just dragged the icon
			el.addEventListener('click', (ev) => {
				if (el._wasDragging) {
					el._wasDragging = false;
					return;
				}
				const url = el.dataset.url;
				if (url) window.open(url, '_blank');
			});

			// drag support: left-button drag to reposition icons
			let isPointerDown = false;
			let isDragging = false;
			let startX = 0,
				startY = 0;
			let startLeft = 0,
				startTop = 0;
			function onPointerMove(e) {
				if (!isPointerDown) return;
				const clientX = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
				const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
				if (clientX == null || clientY == null) return;
				const dx = clientX - startX;
				const dy = clientY - startY;
				if (!isDragging && Math.hypot(dx, dy) > 4) {
					isDragging = true;
					el.classList.add('dragging');
				}
				if (isDragging) {
					const newLeft = Math.max(0, startLeft + dx);
					const newTop = Math.max(0, startTop + dy);
					el.style.left = newLeft + 'px';
					el.style.top = newTop + 'px';
				}
			}

			async function onPointerUp(e) {
				document.removeEventListener('mousemove', onPointerMove);
				document.removeEventListener('mouseup', onPointerUp);
				document.removeEventListener('touchmove', onPointerMove);
				document.removeEventListener('touchend', onPointerUp);
				if (isDragging) {
					isDragging = false;
					el.classList.remove('dragging');
					el._wasDragging = true;
					// persist position to server
					const id = el.dataset.id;
					const left = parseInt(el.style.left || '0', 10) || 0;
					const top = parseInt(el.style.top || '0', 10) || 0;
					try {
						await saveIconPosition(id, left, top);
					} catch (err) {
						// on error, reload items to restore canonical positions
						loadDesktopItems();
					}
				}
				isPointerDown = false;
			}

			el.addEventListener('mousedown', (e) => {
				if (e.button !== 0) return; // only left button
				e.preventDefault();
				isPointerDown = true;
				startX = e.clientX;
				startY = e.clientY;
				startLeft = parseInt(el.style.left || '0', 10) || 0;
				startTop = parseInt(el.style.top || '0', 10) || 0;
				document.addEventListener('mousemove', onPointerMove);
				document.addEventListener('mouseup', onPointerUp);
			});
			// touch support
			el.addEventListener('touchstart', (e) => {
				if (!e.touches || e.touches.length !== 1) return;
				isPointerDown = true;
				startX = e.touches[0].clientX;
				startY = e.touches[0].clientY;
				startLeft = parseInt(el.style.left || '0', 10) || 0;
				startTop = parseInt(el.style.top || '0', 10) || 0;
				document.addEventListener('touchmove', onPointerMove, { passive: false });
				document.addEventListener('touchend', onPointerUp);
			});
			// right-click on an icon shows icon-specific context menu
			el.addEventListener('contextmenu', (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				// do not show when auth overlay is visible
				if (authOverlay && authOverlay.getAttribute('aria-hidden') === 'false') return;
				showIconContextMenu(ev.clientX, ev.clientY, el);
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

	// save icon position/size to backend
	async function saveIconPosition(id, pos_x, pos_y, width, height) {
		if (!id) return;
		const body = { pos_x: parseInt(pos_x, 10) || 0, pos_y: parseInt(pos_y, 10) || 0 };
		if (typeof width !== 'undefined') body.width = parseInt(width, 10) || 0;
		if (typeof height !== 'undefined') body.height = parseInt(height, 10) || 0;
		await fetch(`/api/desktop-items/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			credentials: 'include',
		});
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
