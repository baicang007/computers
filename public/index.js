// index.js - 简单的 Start 菜单切换和关闭逻辑
(function () {
	// ========================================
	// 全局变量定义
	// ========================================

	// DOM 元素引用
	const startButton = document.getElementById('startButton');
	const startMenu = document.getElementById('startMenu');
	const desktop = document.getElementById('desktop');
	const desktopIcons = document.getElementById('desktopIcons');

	// 上下文菜单元素
	const contextMenu = document.getElementById('desktopContextMenu');
	const iconContextMenu = document.getElementById('iconContextMenu');
	let currentIconTarget = null;

	// 认证相关元素
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
	const startPlayerBtn = document.getElementById('startPlayerBtn');

	// 桌面快捷方式创建相关元素
	const createShortcutModal = document.getElementById('createShortcutModal');
	const scName = document.getElementById('scName');
	const scUrl = document.getElementById('scUrl');
	const scCreateBtn = document.getElementById('scCreateBtn');
	const scCancelBtn = document.getElementById('scCancelBtn');
	const scError = document.getElementById('scError');

	// 个性化设置相关元素
	const personalizationModal = document.getElementById('personalizationModal');
	const wallpaperPreviewContainer = document.getElementById('wallpaperPreviewContainer');
	const backgroundUrlInput = document.getElementById('backgroundUrl');
	const personalizationOkBtn = document.getElementById('personalizationOkBtn');
	const personalizationCancelBtn = document.getElementById('personalizationCancelBtn');
	let selectedWallpaper = null;

	// 任务栏音乐播放器元素
	const playBtn = document.getElementById('playBtn');
	const nextBtn = document.getElementById('nextBtn');
	const audioPlayer = document.getElementById('audioPlayer');

	// 任务栏时钟元素
	const taskbarClockEl = document.getElementById('taskbarClock');

	// 常量定义
	const DEFAULT_ICON = '/icons/website.png';

	// ========================================
	// Start 菜单功能
	// ========================================

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

	// 关闭菜单事件监听器
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

	// 键盘事件监听器
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeMenu();
			hideContextMenu();
			hideIconContextMenu();
			closeCreateShortcut();
			if (personalizationModal.getAttribute('aria-hidden') === 'false') {
				closePersonalizationModal();
			}
		}
		if (e.key === 'Enter') {
			e.preventDefault(); // 阻止默认回车行为
			if (personalizationModal.getAttribute('aria-hidden') === 'false') {
				document.getElementById('personalizationOkBtn').click(); // 触发按钮点击
			}
			if (createShortcutModal.getAttribute('aria-hidden') === 'false') {
				document.getElementById('scCreateBtn').click(); // 触发按钮点击
			}
		}
	});

	// ========================================
	// 上下文菜单功能
	// ========================================

	// 桌面上下文菜单显示/隐藏函数
	function hideContextMenu() {
		if (!contextMenu) return;
		contextMenu.setAttribute('aria-hidden', 'true');
		contextMenu.style.left = '-1983px';
		contextMenu.style.top = '-1983px';
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

	// 图标特定上下文菜单显示/隐藏函数
	function hideIconContextMenu() {
		if (!iconContextMenu) return;
		iconContextMenu.setAttribute('aria-hidden', 'true');
		// 添加这一行：移除sub-left类
		iconContextMenu.classList.remove('sub-left');
	}

	// 在showIconContextMenu函数中添加sub-left类的处理逻辑
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
			// 添加这几行：添加sub-left类
			iconContextMenu.classList.add('sub-left');
		} else {
			// 添加这几行：移除sub-left类
			iconContextMenu.classList.remove('sub-left');
		}
		if (menuRect.bottom > desktopRect.bottom) {
			const shiftY = menuRect.bottom - desktopRect.bottom + padding;
			iconContextMenu.style.top = top - shiftY + 'px';
		}
	}

	// 隐藏上下文菜单在调整大小/滚动时避免错位的菜单
	window.addEventListener('resize', hideContextMenu);
	window.addEventListener('scroll', hideContextMenu, true);

	// 判断是否为桌面表面的函数
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

	// 桌面右键菜单事件监听器
	desktop.addEventListener('contextmenu', (e) => {
		// If the event target is not part of the desktop surface (e.g., taskbar, start menu), do nothing
		if (!isDesktopSurface(e.target)) return;
		e.preventDefault();
		// do not show when auth overlay is visible
		if (authOverlay && authOverlay.getAttribute('aria-hidden') === 'false') return;
		showContextMenu(e.clientX, e.clientY);
	});

	// 阻止已知子UI元素上的上下文菜单事件冒泡到 `desktop`
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

	// ========================================
	// 认证流程
	// ========================================

	// 获取并应用用户背景图片
	async function fetchAndApplyBackground() {
		try {
			const r = await fetch('/api/background', { credentials: 'include' });
			if (r.status === 200) {
				const data = await r.json();
				const wallpaper = document.querySelector('.wallpaper');
				if (wallpaper && data?.background_url) {
					wallpaper.style.backgroundImage = `url('${data.background_url}')`;
				}
			}
		} catch (e) {
			console.error('获取背景图片失败:', e);
		}
	}

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
						localStorage.setItem('username', data.user.username);
					}
					// load desktop items for this user
					loadDesktopItems();
					// load user background
					fetchAndApplyBackground();
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

	// 登录按钮事件监听器
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
				checkSession();
			} else {
				const data = await r.json();
				loginError.textContent = data?.error || '登录失败';
			}
		} catch (e) {
			loginError.textContent = '网络错误';
		}
	});

	// 注册按钮事件监听器
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

	// 登出按钮事件监听器
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

	// 启动播放器按钮事件监听器
	if (startPlayerBtn) {
		startPlayerBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			closeMenu();
			window.open('/player/tvideo.html', '_blank');
		});
	}

	// 检查会话状态
	checkSession();

	// ========================================
	// 桌面图标功能
	// ========================================

	// 渲染桌面项目
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
				// const label = el.querySelector('.label');
				if (img) {
					img.style.width = imgSize + 'px';
					img.style.height = imgSize + 'px';
				}
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

	// 转义HTML函数
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

	// 加载桌面项目
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

	// 保存图标位置/大小到后端
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

	// 自动排列桌面图标
	async function autoArrangeIcons() {
		if (!desktopIcons) return;
		const icons = Array.from(desktopIcons.children);
		if (icons.length === 0) return;
		// 计算网格参数
		const gapX = 24; // 图标之间的水平间距
		const gapY = 12; // 图标之间的垂直间距
		const startX = 12; // 起始X坐标
		const startY = 12; // 起始Y坐标
		const defaultWidth = 96; // 默认图标宽度
		const defaultHeight = 120; // 默认图标高度
		// 解决：获取桌面容器的宽度（使用父容器宽度）
		const desktopWidth = desktopIcons.parentElement.offsetWidth;
		const availableWidth = desktopWidth - startX * 2;
		const iconWidthWithGap = defaultWidth + gapX;
		let cols = Math.max(1, Math.floor(availableWidth / iconWidthWithGap));
		// 遍历所有图标，重新计算位置
		for (let i = 0; i < icons.length; i++) {
			const icon = icons[i];
			const col = i % cols;
			const row = Math.floor(i / cols);
			// 计算新位置
			const newX = startX + col * (defaultWidth + gapX);
			const newY = startY + row * (defaultHeight + gapY);
			// 更新DOM位置
			icon.style.left = newX + 'px';
			icon.style.top = newY + 'px';
			// 保存新位置到服务器
			const id = icon.dataset.id;
			if (id) {
				try {
					await saveIconPosition(id, newX, newY);
				} catch (e) {
					console.error('保存图标位置失败:', e);
				}
			}
		}
	}

	// ========================================
	// 桌面快捷方式创建功能
	// ========================================

	// 打开/关闭创建快捷方式模态框
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

	// 创建快捷方式模态框事件监听器
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
				const gapX = 24; // horizontal gap
				const gapY = 12; // vertical gap
				const startX = 12; // starting X position
				const startY = 12; // starting Y position
				const defaultWidth = 96; // default icon width
				const defaultHeight = 116; // default icon height
				// 与autoArrangeIcons函数相同的动态计算逻辑
				const desktopWidth = desktopIcons.parentElement.offsetWidth;
				const availableWidth = desktopWidth - startX * 2;
				const iconWidthWithGap = defaultWidth + gapX;
				const cols = Math.max(1, Math.floor(availableWidth / iconWidthWithGap));
				const col = count % cols;
				const row = Math.floor(count / cols);
				const pos_x = startX + col * (defaultWidth + gapX);
				const pos_y = startY + row * (defaultHeight + gapY);
				const r = await fetch('/api/desktop-items', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name, url: urlv, icon: DEFAULT_ICON, width: 72, height: 92, pos_x, pos_y }),
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

	// ========================================
	// 上下文菜单项事件监听器
	// ========================================

	// 桌面上下文菜单项事件监听器
	const cmNewShortcut = document.getElementById('cm-new-shortcut');
	if (cmNewShortcut) {
		cmNewShortcut.addEventListener('click', (e) => {
			e.stopPropagation();
			hideContextMenu();
			openCreateShortcut();
		});
	}

	// 自动排列图标菜单项事件监听器
	const cmAutoArrange = document.getElementById('cm-auto-arrange');
	if (cmAutoArrange) {
		cmAutoArrange.addEventListener('click', async (e) => {
			e.stopPropagation();
			hideContextMenu();
			await autoArrangeIcons();
		});
	}

	// 处理上下文菜单: 隐藏桌面图标
	const cmHideIcons = document.getElementById('cm-hide-icons');
	if (cmHideIcons) {
		cmHideIcons.addEventListener('click', (e) => {
			e.stopPropagation();
			hideContextMenu();
			if (desktopIcons) {
				desktopIcons.style.display = 'none';
				desktopIcons.setAttribute('aria-hidden', 'true');
			}
		});
	}

	// 处理上下文菜单: 显示桌面图标
	const cmShowIcons = document.getElementById('cm-show-icons');
	if (cmShowIcons) {
		cmShowIcons.addEventListener('click', (e) => {
			e.stopPropagation();
			hideContextMenu();
			if (desktopIcons) {
				desktopIcons.style.display = 'block';
				desktopIcons.setAttribute('aria-hidden', 'false');
			}
		});
	}

	// 图标特定上下文菜单项事件监听器
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

	// 处理图标特定上下文菜单: 更换 图标
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
						}
					} catch (err) {
						console.error('Failed to update icon:', err);
					}
				};
				reader.readAsDataURL(file);
			});
			input.click();
		});
	}

	// 处理图标特定上下文菜单 (删除)
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

	// 大小子菜单处理器
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
		if (img) {
			img.style.width = imgSize + 'px';
			img.style.height = imgSize + 'px';
		}
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

	// ========================================
	// 任务音乐播放器功能
	// ========================================

	// 任务栏播放器按钮事件监听器
	playBtn.addEventListener('click', () => {
		if (audioPlayer.paused) {
			audioPlayer.play();
			playBtn.textContent = '⏸';
		} else {
			audioPlayer.pause();
			playBtn.textContent = '▶';
		}
	});

	nextBtn.addEventListener('click', () => {
		// Logic to play next track
		loadRandomTrack();
	});

	function loadRandomTrack() {
		randomIndex = Math.floor(Math.random() * 199 + 1);
		let url = `https://ting8.yymp3.com/new25/2013ndxgst11/${randomIndex}.mp3`;
		audioPlayer.src = url;
		audioPlayer.load();
		audioPlayer.play();
		playBtn.textContent = '⏸';
	}

	// ========================================
	// 任务栏时钟功能
	// ========================================

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

	// ========================================
	// 个性化设置功能
	// ========================================

	// 打开个性化模态框
	async function openPersonalizationModal() {
		// Show the modal
		personalizationModal.setAttribute('aria-hidden', 'false');
		// Load available wallpapers
		loadWallpapers();
	}

	// 关闭个性化模态框
	function closePersonalizationModal() {
		personalizationModal.setAttribute('aria-hidden', 'true');
		selectedWallpaper = null;
		backgroundUrlInput.value = '';
	}

	// 从壁纸文件夹加载壁纸
	function loadWallpapers() {
		// Clear existing previews
		wallpaperPreviewContainer.innerHTML = '';
		// List of available wallpapers
		const wallpapers = [
			'wallpaper/wallpaper1.jpg',
			'wallpaper/wallpaper2.jpg',
			'wallpaper/wallpaper3.jpg',
			'wallpaper/wallpaper5.jpg',
			'wallpaper/wallpaper6.jpg',
			'wallpaper/wallpaper7.jpg',
			'wallpaper/wallpaper8.jpg',
			'wallpaper/wallpaper9.jpg',
			'wallpaper/wallpaper10.jpg',
			'wallpaper/wallpaper11.jpg',
		];

		// Create preview for each wallpaper
		wallpapers.forEach((wallpaper) => {
			const preview = document.createElement('div');
			preview.style.cursor = 'pointer';
			preview.style.border = '2px solid transparent';
			preview.style.borderRadius = '4px';
			preview.style.overflow = 'hidden';
			preview.style.width = '100px';
			preview.style.height = '100px';
			preview.style.transition = 'border-color 0.2s';
			const img = document.createElement('img');
			img.src = wallpaper;
			img.style.width = '100%';
			img.style.height = '100%';
			img.style.objectFit = 'cover';
			preview.appendChild(img);
			wallpaperPreviewContainer.appendChild(preview);
			// Add click event
			preview.addEventListener('click', () => {
				// Remove selection from all previews
				document.querySelectorAll('#wallpaperPreviewContainer > div').forEach((el) => {
					el.style.borderColor = 'transparent';
				});
				// Add selection to this preview
				preview.style.borderColor = '#0078d4';
				// Update selected wallpaper and input field
				selectedWallpaper = wallpaper;
				backgroundUrlInput.value = wallpaper;
			});
			// If this is the currently selected wallpaper, highlight it
			if (wallpaper === selectedWallpaper) {
				preview.style.borderColor = '#0078d4';
			}
		});
	}

	// 应用选定的背景
	async function applyBackground() {
		const backgroundUrl = backgroundUrlInput.value.trim();
		if (!backgroundUrl) return;
		try {
			// Update background in database
			const r = await fetch('/api/background', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ background_url: backgroundUrl }),
				credentials: 'include',
			});
			if (r.status === 200) {
				// Apply background to desktop
				const wallpaper = document.querySelector('.wallpaper');
				if (wallpaper) {
					wallpaper.style.backgroundImage = `url('${backgroundUrl}')`;
				}
				// Close modal
				closePersonalizationModal();
			} else {
				console.error('更新背景失败');
			}
		} catch (e) {
			console.error('更新背景失败:', e);
		}
	}

	// 个性化菜单项事件监听器
	const personalizationMenuItem = document.getElementById('cm-personalization');
	if (personalizationMenuItem) {
		personalizationMenuItem.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			openPersonalizationModal();
			hideContextMenu();
		});
	}

	// 个性化模态框按钮事件监听器
	if (personalizationOkBtn) {
		personalizationOkBtn.addEventListener('click', applyBackground);
	}

	if (personalizationCancelBtn) {
		personalizationCancelBtn.addEventListener('click', closePersonalizationModal);
	}
})();
