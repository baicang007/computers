// 记事本应用主逻辑
class NotepadApp {
	constructor() {
		this.textEditor = document.getElementById('text-editor');
		this.fileName = '无标题';
		this.filePath = null;
		this.isModified = false;
		this.wordWrap = true;
		this.zoomLevel = 100;
		this.fontFamily = 'Consolas';
		this.fontSize = 13;
		this.fontStyle = 'normal';
		this.history = [];
		this.historyIndex = -1;
		this.maxHistorySize = 33;
		this.showLineNumbers = false;
		this.findText = '';
		this.copyText = '';
		this.findCaseSensitive = false;
		this.findWrapAround = true;
		this.vimMode = 'insert'; // 默认插入模式
		this.stepTimes = '';
		this.lastKey = '';
		this.holdPos = 0;

		this.initializeElements();
		this.bindEvents();
		this.updateStatus();
		this.saveToHistory();
		this.loadSettings();
	}

	initializeElements() {
		// 菜单元素
		this.menuItems = document.querySelectorAll('.menu-item');
		this.menuOptions = document.querySelectorAll('.menu-option');

		// 对话框元素
		this.dialogs = {
			find: document.getElementById('find-dialog'),
			replace: document.getElementById('replace-dialog'),
			goto: document.getElementById('goto-dialog'),
			font: document.getElementById('font-dialog'),
			about: document.getElementById('about-dialog'),
		};

		this.overlay = document.createElement('div');
		this.overlay.className = 'overlay';
		document.body.appendChild(this.overlay);

		// 文件输入
		this.fileInput = document.getElementById('file-input');

		// 状态栏元素
		this.statusBar = {
			lineColumn: document.getElementById('line-column'),
			charCount: document.getElementById('char-count'),
			zoomLevel: document.getElementById('zoom-level'),
			showCmdStatus: document.getElementById('show-cmd-status'),
			vimModeStatus: document.getElementById('vim-mod-status'),
			wordWrapStatus: document.getElementById('word-wrap-status'),
		};
	}

	bindEvents() {
		// 菜单事件
		this.menuItems.forEach((item) => {
			item.addEventListener('click', (e) => this.toggleMenu(e));
		});

		this.menuOptions.forEach((option) => {
			option.addEventListener('click', (e) => this.handleMenuAction(e));
			// 添加快捷键提示
			this.addShortcutHints(option);
		});

		// 文本编辑器事件
		this.textEditor.addEventListener('input', () => this.handleTextChange());
		this.textEditor.addEventListener('keydown', (e) => this.handleKeyDown(e));
		this.textEditor.addEventListener('keyup', () => this.updateStatus());
		this.textEditor.addEventListener('click', () => this.updateStatus());
		this.textEditor.addEventListener('scroll', () => this.updateStatus());

		// 对话框事件
		document.querySelectorAll('.dialog-close').forEach((btn) => {
			btn.addEventListener('click', () => this.closeAllDialogs());
		});

		this.overlay.addEventListener('click', () => this.closeAllDialogs());

		// 查找对话框
		document.getElementById('find-next').addEventListener('click', () => this.finding());
		document.getElementById('find-cancel').addEventListener('click', () => this.closeDialog('find'));

		// 替换对话框
		document.getElementById('replace-find').addEventListener('click', () => this.replaceFinding());
		document.getElementById('replace-replace').addEventListener('click', () => this.replace());
		document.getElementById('replace-all').addEventListener('click', () => this.replaceAll());
		document.getElementById('replace-cancel').addEventListener('click', () => this.closeDialog('replace'));

		// 转到对话框
		document.getElementById('goto-ok').addEventListener('click', () => this.gotoLine());
		document.getElementById('goto-cancel').addEventListener('click', () => this.closeDialog('goto'));

		// 字体对话框
		document.getElementById('font-ok').addEventListener('click', () => this.applyFont());
		document.getElementById('font-cancel').addEventListener('click', () => this.closeDialog('font'));

		// 字体预览
		document.getElementById('font-family').addEventListener('change', () => this.updateFontPreview());
		document.getElementById('font-style').addEventListener('change', () => this.updateFontPreview());
		document.getElementById('font-size').addEventListener('change', () => this.updateFontPreview());

		// 关于对话框
		document.getElementById('about-ok').addEventListener('click', () => this.closeDialog('about'));

		// 文件输入事件
		this.fileInput.addEventListener('change', (e) => this.openFile(e));

		// 拖拽事件
		document.addEventListener('dragover', (e) => this.handleDragOver(e));
		document.addEventListener('drop', (e) => this.handleDrop(e));
		document.addEventListener('dragleave', (e) => this.handleDragLeave(e));

		// 标题栏按钮事件
		document.querySelector('.title-bar-button.minimize').addEventListener('click', () => this.minimize());
		document.querySelector('.title-bar-button.maximize').addEventListener('click', () => this.maximize());
		document.querySelector('.title-bar-button.close').addEventListener('click', () => this.exit());

		// 窗口大小改变事件
		window.addEventListener('resize', () => this.updateStatus());

		// 防止页面刷新时丢失数据
		window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
	}

	toggleMenu(e) {
		e.preventDefault();
		e.stopPropagation();

		const menuItem = e.currentTarget;
		const wasActive = menuItem.classList.contains('active');

		// 关闭所有菜单
		this.menuItems.forEach((item) => item.classList.remove('active'));

		// 如果之前不是激活状态，则激活当前菜单
		if (!wasActive) {
			menuItem.classList.add('active');
		}
	}

	handleMenuAction(e) {
		e.preventDefault();
		e.stopPropagation();

		const action = e.currentTarget.dataset.action;
		if (!action) return;

		// 关闭所有菜单
		this.menuItems.forEach((item) => item.classList.remove('active'));

		// 执行相应的操作
		switch (action) {
			case 'new':
				this.newFile();
				break;
			case 'open':
				this.openFileDialog();
				break;
			case 'save':
				this.saveFile();
				break;
			case 'saveas':
				this.saveAsFile();
				break;
			case 'page-setup':
				this.pageSetup();
				break;
			case 'print':
				this.printFile();
				break;
			case 'exit':
				this.exit();
				break;
			case 'undo':
				this.undo();
				break;
			case 'redo':
				this.redo();
				break;
			case 'cut':
				this.cut();
				break;
			case 'copy':
				this.copy();
				break;
			case 'paste':
				this.paste();
				break;
			case 'find':
				this.showFindDialog();
				break;
			case 'find-next':
				this.findNext();
				break;
			case 'replace':
				this.showReplaceDialog();
				break;
			case 'goto':
				this.showGotoDialog();
				break;
			case 'select-all':
				this.selectAll();
				break;
			case 'time-date':
				this.insertTimeDate();
				break;
			case 'word-wrap':
				this.toggleWordWrap();
				break;
			case 'font':
				this.showFontDialog();
				break;
			case 'zoom-in':
				this.zoomIn();
				break;
			case 'zoom-out':
				this.zoomOut();
				break;
			case 'zoom-default':
				this.zoomDefault();
				break;
			case 'status-bar':
				this.toggleStatusBar();
				break;
			case 'view-help':
				this.viewHelp();
				break;
			case 'about':
				this.showAboutDialog();
				break;
		}
	}

	// 文件操作
	newFile() {
		if (this.isModified) {
			if (!confirm('您想保存对 "无标题" 的更改吗？')) {
				return;
			}
		}

		this.textEditor.value = '';
		this.fileName = '无标题';
		this.filePath = null;
		this.isModified = false;
		this.historyIndex = -1;
		this.updateTitle();
		this.saveToHistory();
		this.updateStatus();
	}

	openFileDialog() {
		this.fileInput.click();
	}

	openFile(e) {
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			this.textEditor.value = e.target.result;
			this.fileName = file.name;
			this.filePath = file.name;
			this.isModified = false;
			this.historyIndex = -1;
			this.updateTitle();
			this.saveToHistory();
			this.updateStatus();
		};
		reader.readAsText(file);
	}

	saveFile() {
		if (!this.filePath) {
			this.saveAsFile();
			return;
		}

		this.downloadFile(this.fileName, this.textEditor.value);
		this.isModified = false;
		this.updateTitle();
		this.saveSettings();
	}

	saveAsFile() {
		const fileName = prompt('保存文件为:', this.fileName);
		if (!fileName) return;

		this.downloadFile(fileName, this.textEditor.value);
		this.fileName = fileName;
		this.filePath = fileName;
		this.isModified = false;
		this.updateTitle();
		this.saveSettings();
	}

	downloadFile(fileName, content) {
		const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	pageSetup() {
		alert('页面设置功能尚未实现');
	}

	printFile() {
		window.print();
	}

	exit() {
		if (this.isModified) {
			if (!confirm('您想保存对 "' + this.fileName + '" 的更改吗？')) {
				return;
			}
		}
		window.close();
	}

	// 编辑操作
	undo() {
		if (this.historyIndex > 0) {
			this.historyIndex--;
			//获取当前光标位置
			const cursorPosition = this.textEditor.selectionStart;
			this.textEditor.value = this.history[this.historyIndex];
			// 恢复光标位置
			this.textEditor.selectionStart = cursorPosition;
			this.textEditor.selectionEnd = cursorPosition;
		}
	}

	redo() {
		if (this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
			//获取当前光标位置
			const cursorPosition = this.textEditor.selectionStart;
			this.textEditor.value = this.history[this.historyIndex];
			// 恢复光标位置
			this.textEditor.selectionStart = cursorPosition;
			this.textEditor.selectionEnd = cursorPosition;
		}
	}

	cut() {
		// 获取选中的文本
		const start = this.textEditor.selectionStart;
		const end = this.textEditor.selectionEnd;
		const selectedText = this.textEditor.value.substring(start, end);

		if (selectedText) {
			// 存储到应用内的和系统剪贴板
			this.syncToClipboard(selectedText);
			// 从编辑器中删除选中文本
			const value = this.textEditor.value;
			this.textEditor.value = value.substring(0, start) + value.substring(end);
			this.textEditor.selectionStart = start;
			this.textEditor.selectionEnd = start;

			this.saveToHistory();
		}
	}

	// 将数据同步到系统剪贴板
	syncToClipboard(dateBase) {
		this.copyText = dateBase;
		navigator.clipboard.writeText(dateBase).catch((err) => {
			console.error('同步文本到系统剪贴板失败: ', err);
		});
	}

	copy() {
		const start = this.textEditor.selectionStart;
		const end = this.textEditor.selectionEnd;
		const selectedText = this.textEditor.value.substring(start, end);

		if (selectedText) {
			this.syncToClipboard(selectedText);
		}
	}

	// 将数据从系统剪贴板读取到应用内剪贴板
	syncFromClipboard() {
		navigator.clipboard
			.readText()
			.then((text) => {
				if (text) {
					this.copyText = text;
				}
			})
			.catch((err) => {
				console.error('读取系统剪贴板文本失败: ', err);
			});
	}

	paste() {
		if (this.copyText) {
			const start = this.textEditor.selectionStart;
			const end = this.textEditor.selectionEnd;
			const value = this.textEditor.value;

			// 在光标位置插入文本
			this.textEditor.value = value.substring(0, start) + this.copyText + value.substring(end);
			this.textEditor.selectionStart = start + this.copyText.length;
			this.textEditor.selectionEnd = start + this.copyText.length;

			this.saveToHistory();
		}
	}

	selectAll() {
		this.textEditor.select();
	}

	insertTimeDate() {
		const now = new Date();
		const timeString = now.toLocaleTimeString('zh-CN', {
			hour: '2-digit',
			minute: '2-digit',
		});
		const dateString = now.toLocaleDateString('zh-CN');

		const textToInsert = `${timeString} ${dateString}`;
		const start = this.textEditor.selectionStart;
		const end = this.textEditor.selectionEnd;
		const value = this.textEditor.value;

		this.textEditor.value = value.substring(0, start) + textToInsert + value.substring(end);
		this.textEditor.selectionStart = start + textToInsert.length;
		this.textEditor.selectionEnd = start + textToInsert.length;

		this.saveToHistory();
		this.updateStatus();
	}

	// 查找和替换
	showFindDialog() {
		this.openDialog('find');
		document.getElementById('find-input').focus();
	}

	showReplaceDialog() {
		this.openDialog('replace');
		document.getElementById('replace-find-input').focus();
	}

	finding() {
		this.findText = document.getElementById('find-input').value;
		this.findCaseSensitive = document.getElementById('match-case')?.checked || false;
		this.findWrapAround = document.getElementById('wrap-around')?.checked || false;
		this.findNext();
	}

	replaceFinding() {
		this.findText = document.getElementById('replace-find-input').value;
		this.findCaseSensitive = document.getElementById('replace-match-case')?.checked || false;
		this.findWrapAround = document.getElementById('replace-wrap-around')?.checked || false;
		this.findNext();
	}

	findNext() {
		if (!this.findText) {
			alert('请输入要查找的文本');
			return;
		}

		const text = this.textEditor.value;
		const searchText = this.findCaseSensitive ? this.findText : this.findText.toLowerCase();
		const searchContent = this.findCaseSensitive ? text : text.toLowerCase();

		let start = this.textEditor.selectionEnd;
		let index = searchContent.indexOf(searchText, start);

		if (index === -1 && this.findWrapAround) {
			index = searchContent.indexOf(searchText);
		}

		if (index !== -1) {
			this.textEditor.selectionStart = index;
			this.textEditor.selectionEnd = index + this.findText.length;
			this.textEditor.focus();
		} else {
			alert('找不到 "' + this.findText + '"');
		}
	}

	replace() {
		const findText = document.getElementById('replace-find-input').value;
		const replaceText = document.getElementById('replace-with-input').value;

		if (!findText) {
			alert('请输入要查找的文本');
			return;
		}

		const start = this.textEditor.selectionStart;
		const end = this.textEditor.selectionEnd;
		const selectedText = this.textEditor.value.substring(start, end);

		if (selectedText.toLowerCase() === findText.toLowerCase()) {
			const value = this.textEditor.value;
			this.textEditor.value = value.substring(0, start) + replaceText + value.substring(end);
			this.textEditor.selectionStart = start;
			this.textEditor.selectionEnd = start + replaceText.length;
			this.saveToHistory();
			this.updateStatus();
		} else {
			alert('！请先点击---查找下一个');
		}
	}

	replaceAll() {
		const findText = document.getElementById('replace-find-input').value;
		const replaceText = document.getElementById('replace-with-input').value;

		if (!findText) {
			alert('请输入要查找的文本');
			return;
		}

		const matchCase = document.getElementById('replace-match-case').checked || false;
		const text = this.textEditor.value;

		let newText;
		if (matchCase) {
			newText = text.split(findText).join(replaceText);
		} else {
			const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
			newText = text.replace(regex, replaceText);
		}

		if (newText !== text) {
			this.textEditor.value = newText;
			this.saveToHistory();
			this.updateStatus();
		}
	}

	// 转到行
	showGotoDialog() {
		this.openDialog('goto');
		document.getElementById('goto-line-input').focus();
	}

	gotoLine() {
		const lineInput = document.getElementById('goto-line-input');
		const lineNumber = parseInt(lineInput.value);

		if (isNaN(lineNumber) || lineNumber < 1) {
			alert('请输入有效的行号');
			return;
		}

		const lines = this.textEditor.value.split('\n');
		if (lineNumber > lines.length) {
			alert('行号超出范围');
			return;
		}

		let position = 0;
		for (let i = 0; i < lineNumber - 1; i++) {
			position += lines[i].length + 1; // +1 for newline
		}

		this.textEditor.selectionStart = position;
		this.textEditor.selectionEnd = position;
		this.textEditor.focus();

		this.closeDialog('goto');
	}

	// 格式操作
	toggleWordWrap() {
		this.wordWrap = !this.wordWrap;
		this.textEditor.classList.toggle('word-wrap', this.wordWrap);
		this.statusBar.wordWrapStatus.textContent = this.wordWrap ? '自动换行' : '';
		this.saveSettings();
		this.updateStatus();
	}

	showFontDialog() {
		this.openDialog('font');
		this.updateFontPreview();
	}

	updateFontPreview() {
		const fontFamily = document.getElementById('font-family').value;
		const fontStyle = document.getElementById('font-style').value;
		const fontSize = document.getElementById('font-size').value;

		const preview = document.getElementById('font-preview-text');
		preview.style.fontFamily = fontFamily;
		preview.style.fontStyle = fontStyle.includes('italic') ? 'italic' : 'normal';
		preview.style.fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
		preview.style.fontSize = fontSize + 'px';
	}

	applyFont() {
		this.fontFamily = document.getElementById('font-family').value;
		this.fontStyle = document.getElementById('font-style').value;
		this.fontSize = parseInt(document.getElementById('font-size').value);

		this.textEditor.style.fontFamily = this.fontFamily;
		this.textEditor.style.fontStyle = this.fontStyle.includes('italic') ? 'italic' : 'normal';
		this.textEditor.style.fontWeight = this.fontStyle.includes('bold') ? 'bold' : 'normal';
		this.textEditor.style.fontSize = this.fontSize + 'px';

		this.saveSettings();
		this.closeDialog('font');
	}

	// 视图操作
	zoomIn() {
		if (this.zoomLevel < 500) {
			this.zoomLevel += 25;
			this.applyZoom();
			this.saveSettings();
		}
	}

	zoomOut() {
		if (this.zoomLevel > 25) {
			this.zoomLevel -= 25;
			this.applyZoom();
			this.saveSettings();
		}
	}

	zoomDefault() {
		this.zoomLevel = 100;
		this.applyZoom();
		this.saveSettings();
	}

	applyZoom() {
		const zoomFactor = this.zoomLevel / 100; // 将百分比转换为缩放因子

		// 直接缩放整个编辑器
		this.textEditor.style.transform = `scale(${zoomFactor})`;
		this.textEditor.style.transformOrigin = '0 0'; // 左上角为缩放原点
		this.textEditor.style.width = `${100 / zoomFactor}%`; // 调整宽度以补偿缩放
		this.textEditor.style.height = `${100 / zoomFactor}%`; // 调整高度以补偿缩放

		// 同时保持文字换行设置
		if (this.wordWrap) {
			this.textEditor.classList.add('word-wrap');
		} else {
			this.textEditor.classList.remove('word-wrap');
		}

		this.statusBar.zoomLevel.textContent = this.zoomLevel + '%';
	}

	toggleStatusBar() {
		const statusBar = document.getElementById('status-bar');
		statusBar.style.display = statusBar.style.display === 'none' ? 'flex' : 'none';
	}

	// 帮助操作
	viewHelp() {
		alert('帮助功能尚未实现');
	}

	addLineNumbers() {
		// 这里可以实现行号显示功能
		// 由于复杂度较高，暂时不实现
	}

	removeLineNumbers() {
		// 移除行号显示
	}

	showAboutDialog() {
		this.openDialog('about');
	}

	// 对话框操作
	openDialog(dialogName) {
		this.closeAllDialogs();
		this.dialogs[dialogName].classList.add('active');
		this.overlay.classList.add('active');
	}

	closeDialog(dialogName) {
		this.dialogs[dialogName].classList.remove('active');
		this.overlay.classList.remove('active');
		this.textEditor.focus();
	}

	closeAllDialogs() {
		Object.values(this.dialogs).forEach((dialog) => {
			dialog.classList.remove('active');
		});
		this.overlay.classList.remove('active');
	}

	// 拖拽操作
	handleDragOver(e) {
		e.preventDefault();
		e.stopPropagation();

		if (e.dataTransfer.types.includes('Files')) {
			document.body.classList.add('drag-over');
		}
	}

	handleDrop(e) {
		e.preventDefault();
		e.stopPropagation();

		document.body.classList.remove('drag-over');

		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
				const reader = new FileReader();
				reader.onload = (e) => {
					this.textEditor.value = e.target.result;
					this.fileName = file.name;
					this.filePath = file.name;
					this.isModified = false;
					this.historyIndex = -1;
					this.updateTitle();
					this.saveToHistory();
					this.updateStatus();
				};
				reader.readAsText(file);
			} else {
				alert('只能打开文本文件');
			}
		}
	}

	handleDragLeave(e) {
		e.preventDefault();
		e.stopPropagation();
		document.body.classList.remove('drag-over');
	}

	// 窗口操作
	minimize() {
		alert('最小化功能尚未实现');
	}

	maximize() {
		alert('最大化功能尚未实现');
	}

	// 历史记录操作
	saveToHistory() {
		const content = this.textEditor.value;

		// 如果当前不是最新状态，删除后面的历史记录
		if (this.historyIndex < this.history.length - 1) {
			this.history = this.history.slice(0, this.historyIndex + 1);
		}

		// 添加新的历史记录
		this.history.push(content);
		this.historyIndex++;

		// 限制历史记录大小
		if (this.history.length > this.maxHistorySize) {
			this.history.shift();
			this.historyIndex--;
		}
	}

	// 文本变化处理
	handleTextChange() {
		this.isModified = true;
		this.saveToHistory();
		this.updateStatus();
	}

	// 添加快捷键提示
	addShortcutHints(option) {
		const action = option.dataset.action;
		const shortcuts = {
			new: 'Ctrl+N',
			open: 'Ctrl+O',
			save: 'Ctrl+S',
			saveas: 'Ctrl+Shift+S',
			print: 'Ctrl+P',
			exit: 'Alt+F4',
			undo: 'Ctrl+Z',
			redo: 'Ctrl+Y',
			cut: 'Ctrl+X',
			copy: 'Ctrl+C',
			paste: 'Ctrl+V',
			delete: 'Del',
			find: 'Ctrl+F',
			'find-next': 'F3',
			replace: 'Ctrl+H',
			goto: 'Ctrl+G',
			'select-all': 'Ctrl+A',
			'time-date': 'F7',
			'word-wrap': '',
			font: '',
			'zoom-in': 'Ctrl++',
			'zoom-out': 'Ctrl+-',
			'zoom-default': 'Ctrl+0',
			'status-bar': '',
		};

		if (shortcuts[action]) {
			const shortcut = document.createElement('span');
			shortcut.className = 'shortcut';
			shortcut.textContent = shortcuts[action];
			option.appendChild(shortcut);
		}
	}

	// 计算并返回给定位置的行号
	getLineNumber(pos) {
		const lines = this.textEditor.value.substring(0, pos).split('\n');
		return lines.length;
	}

	// 计算并返回给定位置的列号
	getCoumnNumber(pos) {
		const lines = this.textEditor.value.substring(0, pos).split('\n');
		let columnNumber = lines[lines.length - 1].length;
		return columnNumber + 1;
	}

	// 计算并返回给定行号和列号的光标位置
	getPositionFromLineColumn(lineNumber, columnNumber) {
		const lines = this.textEditor.value.split('\n');
		let targetPos = 0;
		for (let i = 0; i < lineNumber - 1; i++) {
			targetPos += lines[i].length + 1;
		}
		targetPos += columnNumber - 1;
		return targetPos;
	}

	// 计算并返回给定行号的行首位置
	getLineStartPos(lineNumber) {
		const lines = this.textEditor.value.split('\n');
		if (lineNumber < 1 || lineNumber > lines.length) {
			return -1;
		}
		let targetPos = 0;
		for (let i = 0; i < lineNumber - 1; i++) {
			targetPos += lines[i].length + 1;
		}
		return targetPos;
	}

	// 计算并返回给定行号的行尾位置
	getLineEndPos(lineNumber) {
		const lines = this.textEditor.value.split('\n');
		if (lineNumber < 1 || lineNumber > lines.length) {
			return -1;
		}
		let targetPos = 0;
		for (let i = 0; i < lineNumber - 1; i++) {
			targetPos += lines[i].length + 1;
		}
		return targetPos + lines[lineNumber - 1].length;
	}

	// 跳到开头
	goToStart() {
		this.textEditor.selectionStart = 0;
		this.textEditor.selectionEnd = 0;
	}
	// 跳到最后
	goToEnd() {
		this.textEditor.selectionStart = this.textEditor.value.length;
		this.textEditor.selectionEnd = this.textEditor.selectionStart;
	}

	// 判断是否有垂直滚动条
	hasVerticalScrollbar(textarea) {
		return textarea.scrollHeight > textarea.clientHeight;
	}

	// 复制行
	copyLines(times) {
		const lines = this.textEditor.value.split('\n');
		const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
		let copyedLines = '';
		for (let i = 0; i < times; i++) {
			const currentLine = lines[currentLineNumber - 1 + i] + '\n';
			copyedLines += currentLine;
		}
		this.syncToClipboard(copyedLines);
	}

	// 剪切行
	cutLines(times) {
		let cuttedLines = '';
		for (let i = 0; i < times; i++) {
			const lines = this.textEditor.value.split('\n');
			const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
			const currentColumnNumber = this.getCoumnNumber(this.textEditor.selectionStart);
			const currentLine = lines[currentLineNumber - 1] + '\n';
			cuttedLines += currentLine;
			// 删除当前行
			lines.splice(currentLineNumber - 1, 1);
			this.textEditor.value = lines.join('\n');
			// 把光标移动到原来行号和列号对应的位置
			const newPosition = this.getPositionFromLineColumn(currentLineNumber, currentColumnNumber);
			this.textEditor.selectionStart = newPosition;
			this.textEditor.selectionEnd = newPosition;
		}
		// 把当前行内容存到剪贴板
		this.syncToClipboard(cuttedLines);
		this.saveToHistory();
	}

	// 插入空行
	insertEmptyLine() {
		this.copyText = '\n';
		this.insertLineText();
	}

	// 把应用剪切板中的内容插入到当前行的下方
	insertLineText() {
		if (this.copyText) {
			// 计算插入位置
			let insertPos = this.textEditor.selectionStart;
			const value = this.textEditor.value;
			const currentLineNumber = this.getLineNumber(insertPos);
			insertPos = this.getLineEndPos(currentLineNumber) + 1;
			// 把应用剪切板中的内容插入到当前行的下方
			this.textEditor.value = value.slice(0, insertPos) + this.copyText + value.slice(insertPos);
			// 把光标移动到对应的位置
			this.textEditor.selectionStart = insertPos;
			this.textEditor.selectionEnd = insertPos;
			this.saveToHistory();
		}
	}

	// 返回光标移动后的位置函数
	moveCursorToLeft(times, pos) {
		return Math.max(0, pos - times);
	}

	moveCursorToRight(times, pos) {
		return Math.min(this.textEditor.value.length, pos + times);
	}

	moveCursorToUpLine(times, lineNumber, columnNumber) {
		if (lineNumber === 1) {
			return this.textEditor.value.length;
		}
		// 计算目标行号和列号
		let allLines = this.textEditor.value.split('\n');
		const targetLineNumber = Math.max(1, lineNumber - times);
		const targetColumnNumber = Math.min(allLines[targetLineNumber - 1].length + 1, columnNumber);
		// 计算目标位置
		if (targetLineNumber === 1) {
			return targetColumnNumber - 1;
		} else {
			let targetPos = this.getPositionFromLineColumn(targetLineNumber, targetColumnNumber);
			return targetPos;
		}
	}

	moveCursorToDownLine(times, lineNumber, columnNumber) {
		// 计算目标行号和列号
		let allLines = this.textEditor.value.split('\n');
		const targetLineNumber = Math.min(allLines.length, lineNumber + times);
		const targetColumnNumber = Math.min(allLines[targetLineNumber - 1].length + 1, columnNumber);
		// 计算目标位置
		if (targetLineNumber === lineNumber) {
			return 0;
		} else {
			let targetPos = this.getPositionFromLineColumn(targetLineNumber, targetColumnNumber);
			return targetPos;
		}
	}

	// 键盘事件处理
	handleKeyDown(e) {
		// 当vim模式为普通时
		if (this.vimMode === 'normal') {
			// 阻止默认行为
			e.preventDefault();

			// esc清空lastKey
			if (e.key === 'Escape') {
				this.lastKey = '';
				return;
			}

			// 如果上一个按键是f，则进行查找操作
			if (this.lastKey === 'f') {
				// 如果按下的是字符或数字键，记录字符
				if ((e.key >= 'a' && e.key <= 'z') || (e.key >= '0' && e.key <= '9')) {
					this.findText = e.key;
					this.findNext();
					this.lastKey = '';
					return;
				}
				let charlist = [
					',',
					'.',
					';',
					':',
					'/',
					'?',
					'!',
					'@',
					'#',
					'$',
					'%',
					'^',
					'&',
					'*',
					'(',
					')',
					'-',
					'_',
					'=',
					'+',
					'[',
					']',
					'{',
					'}',
					'\\',
					"'",
					'|',
					'`',
					'~',
					'<',
					'>',
					'"',
				];
				if (charlist.includes(e.key)) {
					this.findText = e.key;
					this.findNext();
					this.lastKey = '';
					return;
				}
				// console.log(e.key);
				// this.lastKey = '';
				return;
			}

			// i键切换到插入模式
			if (e.key === 'i') {
				this.vimMode = 'insert';
				this.statusBar.vimModeStatus.textContent = '插入模式';
				this.textEditor.classList.remove('normal-color-cursor');
				this.textEditor.selectionEnd = this.textEditor.selectionStart;
				return;
			}

			// v键切换到可视模式
			if (e.key === 'v') {
				this.vimMode = 'visual';
				this.statusBar.vimModeStatus.textContent = '可视模式';
				this.holdPos = this.textEditor.selectionStart;
				return;
			}

			// f键查找下一个字符
			if (e.key === 'f') {
				this.lastKey = 'f';
				return;
			}

			if (e.key === 'n') {
				this.findNext();
				return;
			}

			// w键跳到下一个单词开头
			if (e.key === 'w') {
				const textCursor = this.textEditor.value.slice(this.textEditor.selectionEnd);
				const words = textCursor.split(/[\s\u3000\u3001\u3002\uff0c\uff0e\uff1b\uff1a\uff1f\uff01\u201c\u201d\u2018\u2019]+/);
				if (words.length > 1) {
					this.findText = words[1];
					const nextWordPos = this.textEditor.selectionEnd + textCursor.indexOf(this.findText);
					this.textEditor.selectionStart = nextWordPos;
					this.textEditor.selectionEnd = nextWordPos;
				} else {
					// 如果没有下一个单词，跳到文件结尾
					this.goToEnd();
				}
				return;
			}

			// b键跳到上一个单词开头
			if (e.key === 'b') {
				const textCursor = this.textEditor.value.slice(0, this.textEditor.selectionStart);
				const words = textCursor.split(/[\s\u3000\u3001\u3002\uff0c\uff0e\uff1b\uff1a\uff1f\uff01\u201c\u201d\u2018\u2019]+/);
				if (words.length > 1) {
					this.findText = words[words.length - 2];
					const prevWordPos = textCursor.lastIndexOf(this.findText);
					this.textEditor.selectionStart = prevWordPos;
					this.textEditor.selectionEnd = prevWordPos;
				} else {
					// 如果没有上一个单词，跳到文件开头
					this.goToStart();
				}
				return;
			}

			// 按下数字键记录次数
			if (e.key >= '0' && e.key <= '9') {
				this.stepTimes += e.key;
				return;
			}

			// gg跳到文件开头
			if (e.key === 'g') {
				if (this.lastKey === 'g') {
					this.goToStart();
					this.lastKey = '';
					if (this.hasVerticalScrollbar(this.textEditor)) {
						this.textEditor.scrollTop = 0;
					}
					return;
				} else if (this.stepTimes) {
					let lineNumber = parseInt(this.stepTimes);
					// 判断lineNumber是否小于1或者大于总行数
					if (lineNumber < 1 || lineNumber > this.getLineNumber(this.textEditor.value.length)) {
						this.stepTimes = '';
						return;
					}
					this.textEditor.selectionStart = this.getLineStartPos(lineNumber);
					this.textEditor.selectionEnd = this.getLineStartPos(lineNumber);
					this.stepTimes = '';
					return;
				} else {
					this.lastKey = 'g';
					return;
				}
			}

			// ge跳到文件结尾
			if (e.key === 'e') {
				if (this.lastKey === 'g') {
					this.goToEnd();
					this.lastKey = '';
					if (this.hasVerticalScrollbar(this.textEditor)) {
						this.textEditor.scrollTop = this.textEditor.scrollHeight - this.textEditor.clientHeight;
					}
					return;
				}
			}

			// G跳到文件结尾
			if (e.key === 'G') {
				this.goToEnd();
				if (this.hasVerticalScrollbar(this.textEditor)) {
					this.textEditor.scrollTop = this.textEditor.scrollHeight - this.textEditor.clientHeight;
				}
				return;
			}

			// ga跳到行首
			if (e.key === 'a') {
				if (this.lastKey === 'g') {
					let lineStartPos = this.getLineStartPos(this.getLineNumber(this.textEditor.selectionStart));
					this.textEditor.selectionStart = lineStartPos;
					this.textEditor.selectionEnd = lineStartPos;
					this.lastKey = '';
					return;
				}
			}

			// gz跳到行尾
			if (e.key === 'z') {
				if (this.lastKey === 'g') {
					let lineEndPos = this.getLineEndPos(this.getLineNumber(this.textEditor.selectionStart));
					this.textEditor.selectionStart = lineEndPos;
					this.textEditor.selectionEnd = lineEndPos;
					this.lastKey = '';
					return;
				}
			}

			// y复制字符，yy复制行
			if (e.key === 'y') {
				if (this.lastKey === 'y') {
					let times = this.stepTimes ? parseInt(this.stepTimes) : 1;
					// 判断times是否大于剩余行数
					const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
					const lines = this.textEditor.value.split('\n');
					times = Math.min(times, lines.length - currentLineNumber + 1);
					this.copyLines(times);
					this.stepTimes = '';
					this.lastKey = '';
					return;
				} else {
					this.lastKey = 'y';
					return;
				}
			}

			// dd剪切当前行
			if (e.key === 'd') {
				if (this.lastKey === 'd') {
					let times = this.stepTimes ? parseInt(this.stepTimes) : 1;
					// 判断times是否大于剩余行数
					const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
					const lines = this.textEditor.value.split('\n');
					times = Math.min(times, lines.length - currentLineNumber + 1);
					this.cutLines(times);
					this.stepTimes = '';
					this.lastKey = '';
					return;
				} else {
					this.lastKey = 'd';
					return;
				}
			}

			// x键删除光标后的字符
			if (e.key === 'x') {
				if (this.stepTimes) {
					this.textEditor.selectionEnd = this.textEditor.selectionStart + parseInt(this.stepTimes);
				}
				this.cut();
				return;
			}

			// o键插入空行
			if (e.key === 'o') {
				this.insertEmptyLine();
				return;
			}

			// p键粘贴
			if (e.key === 'p') {
				if (this.copyText === '') {
					// 如果应用内剪贴板为空，尝试从系统剪贴板读取
					this.syncFromClipboard();
				}

				// 当copyText中的内容以换行符结尾时，插入新行
				if (this.copyText.endsWith('\n')) {
					this.insertLineText();
					return;
				}
				// 否则在光标位置粘贴
				this.textEditor.selectionEnd = this.textEditor.selectionStart;
				this.paste();
				return;
			}

			// u键撤销最近一次操作
			if (e.key === 'u') {
				this.undo();
			}
			// Ctrl+r重做最近一次撤销的操作
			if (e.ctrlKey && e.key === 'r') {
				this.redo();
			}

			// h键左移或左方向键
			if (e.key === 'h' || e.key === 'ArrowLeft') {
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				const newPos = this.moveCursorToLeft(times, this.textEditor.selectionStart);
				this.textEditor.selectionStart = newPos;
				this.textEditor.selectionEnd = newPos;
				this.stepTimes = '';
				return;
			}

			// l键右移或右方向键
			if (e.key === 'l' || e.key === 'ArrowRight') {
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				const newPos = this.moveCursorToRight(times, this.textEditor.selectionStart);
				this.textEditor.selectionStart = newPos;
				this.textEditor.selectionEnd = newPos;
				this.stepTimes = '';
				return;
			}

			// k键上移或上方向键
			if (e.key === 'k' || e.key === 'ArrowUp') {
				const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
				const currentColumnNumber = this.getCoumnNumber(this.textEditor.selectionStart);
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				const newPos = this.moveCursorToUpLine(times, currentLineNumber, currentColumnNumber);
				this.textEditor.selectionStart = newPos;
				this.textEditor.selectionEnd = newPos;
				this.stepTimes = '';
				return;
			}

			// j键下移或下方向键
			if (e.key === 'j' || e.key === 'ArrowDown') {
				const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
				const currentColumnNumber = this.getCoumnNumber(this.textEditor.selectionStart);
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				const newPos = this.moveCursorToDownLine(times, currentLineNumber, currentColumnNumber);
				this.textEditor.selectionStart = newPos;
				this.textEditor.selectionEnd = newPos;
				this.stepTimes = '';
				return;
			}
		}

		// 当vim模式为可视时
		if (this.vimMode === 'visual') {
			// 阻止默认行为
			e.preventDefault();

			// Esc键切换回普通模式
			if (e.key === 'Escape') {
				this.vimMode = 'normal';
				this.statusBar.vimModeStatus.textContent = '普通模式';
				return;
			}

			// 按下数字键记录次数
			if (e.key >= '0' && e.key <= '9') {
				this.stepTimes += e.key;
				return;
			}

			// h键左移或左方向键
			if (e.key === 'h' || e.key === 'ArrowLeft') {
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				if (this.textEditor.selectionEnd > this.holdPos) {
					const newPos = this.moveCursorToLeft(times, this.textEditor.selectionEnd);
					this.textEditor.selectionEnd = newPos < this.holdPos ? this.holdPos : newPos;
				} else {
					const newPos = this.moveCursorToLeft(times, this.textEditor.selectionStart);
					this.textEditor.selectionStart = newPos;
				}
				this.stepTimes = '';
				return;
			}

			// l键右移或右方向键
			if (e.key === 'l' || e.key === 'ArrowRight') {
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				if (this.textEditor.selectionStart < this.holdPos) {
					const newPos = this.moveCursorToRight(times, this.textEditor.selectionStart);
					this.textEditor.selectionStart = newPos > this.holdPos ? this.holdPos : newPos;
				} else {
					const newPos = this.moveCursorToRight(times, this.textEditor.selectionEnd);
					this.textEditor.selectionEnd = newPos;
				}
				this.stepTimes = '';
				return;
			}

			// k键上移或上方向键
			if (e.key === 'k' || e.key === 'ArrowUp') {
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				if (this.textEditor.selectionEnd > this.holdPos) {
					const currentLineNumber = this.getLineNumber(this.textEditor.selectionEnd);
					const currentColumnNumber = this.getCoumnNumber(this.textEditor.selectionEnd);
					const newPos = this.moveCursorToUpLine(times, currentLineNumber, currentColumnNumber);
					this.textEditor.selectionEnd = newPos < this.holdPos ? this.holdPos : newPos;
				} else {
					const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
					const currentColumnNumber = this.getCoumnNumber(this.textEditor.selectionStart);
					const newPos = this.moveCursorToUpLine(times, currentLineNumber, currentColumnNumber);
					this.textEditor.selectionStart = newPos;
				}
				this.stepTimes = '';
				return;
			}

			// j键下移或下方向键
			if (e.key === 'j' || e.key === 'ArrowDown') {
				const times = this.stepTimes ? parseInt(this.stepTimes) : 1;
				if (this.textEditor.selectionStart < this.holdPos) {
					const currentLineNumber = this.getLineNumber(this.textEditor.selectionStart);
					const currentColumnNumber = this.getCoumnNumber(this.textEditor.selectionStart);
					const newPos = this.moveCursorToDownLine(times, currentLineNumber, currentColumnNumber);
					this.textEditor.selectionStart = newPos > this.holdPos ? this.holdPos : newPos;
				} else {
					const currentLineNumber = this.getLineNumber(this.textEditor.selectionEnd);
					const currentColumnNumber = this.getCoumnNumber(this.textEditor.selectionEnd);
					const newPos = this.moveCursorToDownLine(times, currentLineNumber, currentColumnNumber);
					this.textEditor.selectionEnd = newPos;
				}
				this.stepTimes = '';
				return;
			}

			// d键剪切选中文本并切换回普通模式
			if (e.key === 'd') {
				this.cut();
				this.vimMode = 'normal';
				this.statusBar.vimModeStatus.textContent = '普通模式';
				return;
			}

			// y键复制选中文本并切换回普通模式
			if (e.key === 'y') {
				this.copy();
				this.vimMode = 'normal';
				this.statusBar.vimModeStatus.textContent = '普通模式';
				return;
			}

			// p键粘贴替换掉选中文本并切换回普通模式
			if (e.key === 'p') {
				this.paste();
				this.vimMode = 'normal';
				this.statusBar.vimModeStatus.textContent = '普通模式';
				return;
			}
		}

		// 当vim模式为插入时
		if (this.vimMode === 'insert') {
			// Esc键切换回普通模式
			if (e.key === 'Escape') {
				e.preventDefault();
				this.vimMode = 'normal';
				this.statusBar.vimModeStatus.textContent = '普通模式';
				this.textEditor.classList.add('normal-color-cursor');
				return;
			}

			// Ctrl+N: 新建
			if (e.ctrlKey && e.key === 'n') {
				e.preventDefault();
				this.newFile();
				return;
			}

			// Ctrl+O: 打开
			if (e.ctrlKey && e.key === 'o') {
				e.preventDefault();
				this.openFileDialog();
				return;
			}

			// Ctrl+S: 保存
			if (e.ctrlKey && e.key === 's') {
				e.preventDefault();
				this.saveFile();
				return;
			}

			// Ctrl+Shift+S: 另存为
			if (e.ctrlKey && e.shiftKey && e.key === 'S') {
				e.preventDefault();
				this.saveAsFile();
				return;
			}

			// Ctrl+G: 转到
			if (e.ctrlKey && e.key === 'g') {
				e.preventDefault();
				this.showGotoDialog();
				return;
			}

			// Ctrl+A: 全选
			if (e.ctrlKey && e.key === 'a') {
				e.preventDefault();
				this.selectAll();
				return;
			}

			// F7: 时间/日期
			if (e.key === 'F7') {
				e.preventDefault();
				this.insertTimeDate();
				return;
			}

			// Ctrl++: 放大
			if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
				e.preventDefault();
				this.zoomIn();
				return;
			}

			// Ctrl+-: 缩小
			if (e.ctrlKey && e.key === '-') {
				e.preventDefault();
				this.zoomOut();
				return;
			}

			// Ctrl+0: 恢复默认大小
			if (e.ctrlKey && e.key === '0') {
				e.preventDefault();
				this.zoomDefault();
				return;
			}

			// Alt+F4: 退出
			if (e.altKey && e.key === 'F4') {
				e.preventDefault();
				this.exit();
				return;
			}

			// Tab键处理
			if (e.key === 'Tab') {
				e.preventDefault();
				const start = this.textEditor.selectionStart;
				const end = this.textEditor.selectionEnd;
				const value = this.textEditor.value;

				if (e.shiftKey) {
					// Shift+Tab: 减少缩进
					const linesBefore = value.substring(0, start).split('\n');
					const currentLineIndex = linesBefore.length - 1;
					const currentLine = linesBefore[currentLineIndex];

					if (currentLine.startsWith('\t')) {
						this.textEditor.value = value.substring(0, start - 1) + value.substring(start);
						this.textEditor.selectionStart = start - 1;
						this.textEditor.selectionEnd = end - 1;
					} else if (currentLine.startsWith('    ')) {
						this.textEditor.value = value.substring(0, start - 4) + value.substring(start);
						this.textEditor.selectionStart = start - 4;
						this.textEditor.selectionEnd = end - 4;
					}
				} else {
					// Tab: 增加缩进
					this.textEditor.value = value.substring(0, start) + '\t' + value.substring(end);
					this.textEditor.selectionStart = start + 1;
					this.textEditor.selectionEnd = end + 1;
				}
			}
		}
	}

	// 更新状态
	updateStatus() {
		const text = this.textEditor.value;
		const cursorPos = this.textEditor.selectionStart;
		const cursorEnd = this.textEditor.selectionEnd;

		// 计算行号和列号
		const lines = text.substring(0, cursorPos).split('\n');
		const lineNumber = lines.length;
		const columnNumber = lines[lines.length - 1].length + 1;

		// 更新状态栏
		this.statusBar.lineColumn.textContent = `第 ${lineNumber} 行，第 ${columnNumber} 列`;
		this.statusBar.charCount.textContent = `第 ${cursorPos} / ${text.length} 个字符`;
		this.statusBar.showCmdStatus.textContent = `${this.stepTimes} ${this.lastKey}`;

		// 更新菜单状态
		this.updateMenuState();
		this.textEditor.focus();

		// 普通模式下，选中一个字符作为光标显示
		if (this.vimMode === 'normal') {
			this.textEditor.selectionStart = cursorPos;
			this.textEditor.selectionEnd = cursorPos + 1;
		}
		// 插入模式下，取消选中
		// if (this.vimMode === 'insert') {
		// 	this.textEditor.selectionStart = cursorPos;
		// 	this.textEditor.selectionEnd = cursorPos;
		// }
		// 可视模式下，保持选中状态不变
		if (this.vimMode === 'visual') {
			this.textEditor.selectionStart = cursorPos;
			this.textEditor.selectionEnd = cursorEnd;
		}
	}

	updateMenuState() {
		const hasSelection = this.textEditor.selectionStart !== this.textEditor.selectionEnd;
		const canUndo = this.historyIndex > 0;
		const canRedo = this.historyIndex < this.history.length - 1;

		// 更新撤销/重做状态
		const undoOption = document.querySelector('[data-action="undo"]');
		const redoOption = document.querySelector('[data-action="redo"]');

		if (undoOption) {
			undoOption.classList.toggle('disabled', !canUndo);
		}

		if (redoOption) {
			redoOption.classList.toggle('disabled', !canRedo);
		}

		// 更新剪切/复制/删除状态
		const cutOption = document.querySelector('[data-action="cut"]');
		const copyOption = document.querySelector('[data-action="copy"]');

		if (cutOption) {
			cutOption.classList.toggle('disabled', !hasSelection);
		}

		if (copyOption) {
			copyOption.classList.toggle('disabled', !hasSelection);
		}
	}

	// 更新标题
	updateTitle() {
		const titleElement = document.querySelector('.file-name');
		titleElement.textContent = this.fileName + (this.isModified ? '*' : '');
	}

	// 加载设置
	loadSettings() {
		try {
			const settings = JSON.parse(localStorage.getItem('notepadSettings') || '{}');

			if (settings.fontFamily) {
				this.fontFamily = settings.fontFamily;
				this.textEditor.style.fontFamily = this.fontFamily;
			}

			if (settings.fontSize) {
				this.fontSize = settings.fontSize;
				this.textEditor.style.fontSize = this.fontSize + 'px';
			}

			if (settings.fontStyle) {
				this.fontStyle = settings.fontStyle;
				this.textEditor.style.fontStyle = this.fontStyle.includes('italic') ? 'italic' : 'normal';
				this.textEditor.style.fontWeight = this.fontStyle.includes('bold') ? 'bold' : 'normal';
			}

			if (settings.wordWrap !== undefined) {
				this.wordWrap = settings.wordWrap;
				this.textEditor.classList.toggle('word-wrap', this.wordWrap);
				this.statusBar.wordWrapStatus.textContent = this.wordWrap ? '自动换行' : '';
			}
		} catch (e) {
			console.error('加载设置失败:', e);
		}
	}

	// 保存设置
	saveSettings() {
		try {
			const settings = {
				fontFamily: this.fontFamily,
				fontSize: this.fontSize,
				fontStyle: this.fontStyle,
				wordWrap: this.wordWrap,
				zoomLevel: this.zoomLevel,
			};

			localStorage.setItem('notepadSettings', JSON.stringify(settings));
		} catch (e) {
			console.error('保存设置失败:', e);
		}
	}

	// 页面卸载前处理
	handleBeforeUnload(e) {
		if (this.isModified) {
			const message = '您有未保存的更改，确定要离开吗？';
			e.returnValue = message;
			return message;
		}
	}
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
	const app = new NotepadApp();

	// 点击页面其他地方关闭菜单
	document.addEventListener('click', (e) => {
		if (!e.target.closest('.menu-bar')) {
			document.querySelectorAll('.menu-item').forEach((item) => {
				item.classList.remove('active');
			});
		}
	});
});
