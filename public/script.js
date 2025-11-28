// 更新当前时间
function updateTime() {
	const now = new Date();
	const timeString = now.toLocaleTimeString('zh-CN', {
		hour: '2-digit',
		minute: '2-digit',
	});
	document.getElementById('time').textContent = timeString;
}

// 初始化时间并设置定时器
updateTime();
setInterval(updateTime, 1000);

// 切换开始菜单显示/隐藏
function toggleStartMenu() {
	const startMenu = document.getElementById('startMenu');
	if (!startMenu) return;
	const isVisible = window.getComputedStyle(startMenu).display !== 'none';
	startMenu.style.display = isVisible ? 'none' : 'flex';
}

// 暴露给内联 onclick（后向兼容）
window.toggleStartMenu = toggleStartMenu;

// 切换天气小部件显示/隐藏
function toggleWidget() {
	const widget = document.getElementById('weatherWidget');
	if (!widget) return;
	const isVisible = window.getComputedStyle(widget).display !== 'none';
	widget.style.display = isVisible ? 'none' : 'block';
}

// 打开应用
function openApp(appName) {
	// 关闭开始菜单
	const startMenu = document.getElementById('startMenu');
	if (startMenu) startMenu.style.display = 'none';

	// 显示对应的窗口
	const win = document.getElementById(appName + 'Window');
	if (!win) return;
	win.style.display = 'flex';
	win.classList.add('active');

	// 取消任务栏的最小化高亮（如果有）
	const taskbarApp = document.querySelector('.taskbar-app[onclick*="' + appName + '"]');
	if (taskbarApp) taskbarApp.classList.remove('minimized');
}

// 关闭应用
function closeApp(appName) {
	const win = document.getElementById(appName + 'Window');
	if (!win) return;
	win.style.display = 'none';
	win.classList.remove('active');

	// 取消任务栏的最小化高亮
	const taskbarApp = document.querySelector('.taskbar-app[onclick*="' + appName + '"]');
	if (taskbarApp) taskbarApp.classList.remove('minimized');
}

// 点击桌面时关闭开始菜单
document.querySelector('.desktop').addEventListener('click', function () {
	document.getElementById('startMenu').style.display = 'none';
});

// 窗口拖拽功能（简化版）
let activeWindow = null;
let offsetX, offsetY;

document.querySelectorAll('.window-header').forEach((header) => {
	header.addEventListener('mousedown', function (e) {
		const win = this.parentElement;
		// 禁止最大化状态下拖拽
		if (win.classList.contains('maximized')) {
			return;
		}
		activeWindow = win;
		offsetX = e.clientX - activeWindow.offsetLeft;
		offsetY = e.clientY - activeWindow.offsetTop;

		// 将活动窗口置于最前
		document.querySelectorAll('.window').forEach((w) => {
			w.style.zIndex = '100';
		});
		activeWindow.style.zIndex = '101';
	});
});

document.addEventListener('mousemove', function (e) {
	if (activeWindow) {
		activeWindow.style.left = e.clientX - offsetX + 'px';
		activeWindow.style.top = e.clientY - offsetY + 'px';
	}
});

document.addEventListener('mouseup', function () {
	activeWindow = null;
});

// 最小化/最大化按钮功能
function setupWindowControls() {
	// 最小化：隐藏窗口但保留状态
	document.querySelectorAll('.window-control.minimize').forEach((btn) => {
		btn.addEventListener('click', function (e) {
			e.stopPropagation();
			const win = this.closest('.window');
			if (!win) return;
			win.style.display = 'none';
			win.classList.remove('active');

			// 在任务栏高亮对应应用为已最小化
			const winId = win.id.replace('Window', '');
			const taskbarApp = document.querySelector('.taskbar-app[onclick*="' + winId + '"]');
			if (taskbarApp) taskbarApp.classList.add('minimized');
		});
	});

	// 最大化/还原：保存当前尺寸并切换到占满视口的样式，再次点击恢复
	document.querySelectorAll('.window-control.maximize').forEach((btn) => {
		btn.addEventListener('click', function (e) {
			e.stopPropagation();
			const win = this.closest('.window');
			if (!win) return;

			const isMax = win.classList.contains('maximized');

			if (!isMax) {
				// 保存当前内联样式以便还原
				win.dataset.prevLeft = win.style.left || win.offsetLeft + 'px';
				win.dataset.prevTop = win.style.top || win.offsetTop + 'px';
				win.dataset.prevWidth = win.style.width || win.offsetWidth + 'px';
				win.dataset.prevHeight = win.style.height || win.offsetHeight + 'px';
				win.dataset.prevBorderRadius = win.style.borderRadius || window.getComputedStyle(win).borderRadius;

				win.classList.add('maximized');
				// 让窗口覆盖大部分视口，保留任务栏高度
				win.style.left = '8px';
				win.style.top = '8px';
				win.style.width = 'calc(100% - 16px)';
				win.style.height = 'calc(100% - 64px)';
				win.style.borderRadius = '6px';
				win.style.zIndex = '999';
			} else {
				// 还原
				win.classList.remove('maximized');
				win.style.left = win.dataset.prevLeft || '';
				win.style.top = win.dataset.prevTop || '';
				win.style.width = win.dataset.prevWidth || '';
				win.style.height = win.dataset.prevHeight || '';
				win.style.borderRadius = win.dataset.prevBorderRadius || '';
				win.style.zIndex = '';

				// 清理保存的数据（非必需，但保持整洁）
				delete win.dataset.prevLeft;
				delete win.dataset.prevTop;
				delete win.dataset.prevWidth;
				delete win.dataset.prevHeight;
				delete win.dataset.prevBorderRadius;
			}
		});
	});
}

// 在 DOM 就绪后绑定控件
document.addEventListener('DOMContentLoaded', function () {
	try {
		setupWindowControls();

		// 任务栏点击恢复窗口（仅在最小化时恢复）
		document.querySelectorAll('.taskbar-app').forEach((app) => {
			app.addEventListener('click', function () {
				if (this.classList.contains('minimized')) {
					const m = this.getAttribute('onclick').match(/openApp\('([a-zA-Z0-9]+)'\)/);
					if (m) openApp(m[1]);
				}
			});
		});
	} catch (e) {
		console.error('绑定窗口控件失败', e);
	}
});

// 随机设置桌面壁纸（从 public/wallpaper 文件夹中的文件名列表中随机选择）
document.addEventListener('DOMContentLoaded', function () {
	try {
		const wallpapers = [
			'./wallpaper/【哲风壁纸】动漫插画-名侦探柯南.png',
			'./wallpaper/g4785.jpg',
			'./wallpaper/de912a0c547b78779fecb4c51753c381.jpg',
			'./wallpaper/bbceafb812b94b1dd4046a93a0c869a4.jpg',
			'./wallpaper/2c5c-18228565005cb0248cc3f9d21ccc14ca.jpg',
			'./wallpaper/240105002004.jpg',
			'./wallpaper/21ef8fa6b4aa23c5277681dae6f4352d.jpg',
			'./wallpaper/000738ds60I.jpg',
		];

		if (wallpapers.length === 0) return;

		const pick = wallpapers[Math.floor(Math.random() * wallpapers.length)];

		// 使用渐变叠加在图片上以保留原先配色效果
		document.body.style.background = `linear-gradient(135deg, rgba(0,103,192,0.45), rgba(125,185,232,0.25)), url("${pick}")`;
		document.body.style.backgroundSize = 'cover';
		document.body.style.backgroundPosition = 'center';
		document.body.style.backgroundRepeat = 'no-repeat';
	} catch (e) {
		// 如果发生错误，不影响页面其他行为
		console.error('设置壁纸失败', e);
	}
});
