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
		this.findWrapAround = false;
		this.vimMode = 'normal';
		this.textEditor.classList.add('blue-cursor');

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
			encoding: document.getElementById('encoding'),
			lineEnding: document.getElementById('line-ending'),
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
			case 'delete':
				this.delete();
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
			this.textEditor.value = this.history[this.historyIndex];
			this.updateStatus();
			this.textEditor.focus();
		}
	}

	redo() {
		if (this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
			this.textEditor.value = this.history[this.historyIndex];
			this.updateStatus();
			this.textEditor.focus();
		}
	}

	cut() {
		// 获取选中的文本
		const start = this.textEditor.selectionStart;
		const end = this.textEditor.selectionEnd;
		const selectedText = this.textEditor.value.substring(start, end);

		if (selectedText) {
			// 存储到应用内的剪贴板
			this.copyText = selectedText;

			// 将选中文本写入系统剪贴板
			navigator.clipboard.writeText(selectedText).catch((err) => {
				console.error('剪切文本失败: ', err);
			});
			// 从编辑器中删除选中文本
			const value = this.textEditor.value;
			this.textEditor.value = value.substring(0, start) + value.substring(end);
			this.textEditor.selectionStart = start;
			this.textEditor.selectionEnd = start;

			this.saveToHistory();
			this.updateStatus();
			this.textEditor.focus();
		}
	}

	copy() {
		const start = this.textEditor.selectionStart;
		const end = this.textEditor.selectionEnd;
		const selectedText = this.textEditor.value.substring(start, end);

		if (selectedText) {
			// 复制选中文本到应用内剪贴板
			this.copyText = selectedText;

			// 将选中文本写入系统剪贴板
			navigator.clipboard
				.writeText(selectedText)
				.then(() => {
					// 成功 - 文本已复制到剪贴板
				})
				.catch((err) => {
					console.error('复制文本失败: ', err);
					// 如果剪贴板API失败，则回退到execCommand（为了兼容性）
					document.execCommand('copy');
				});
		}
	}

	paste() {
		if (this.copyText === '') {
			// 如果应用内剪贴板为空，尝试从系统剪贴板读取
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

		if (this.copyText) {
			const start = this.textEditor.selectionStart;
			const end = this.textEditor.selectionEnd;
			const value = this.textEditor.value;

			// 在光标位置插入文本
			this.textEditor.value = value.substring(0, start) + this.copyText + value.substring(end);
			this.textEditor.selectionStart = start + this.copyText.length;
			this.textEditor.selectionEnd = start + this.copyText.length;

			this.saveToHistory();
			this.updateStatus();
			this.textEditor.focus();
		}
	}

	delete() {
		const start = this.textEditor.selectionStart;
		const end = this.textEditor.selectionEnd;

		if (start === end) {
			// 删除光标后的一个字符
			const value = this.textEditor.value;
			this.textEditor.value = value.substring(0, start) + value.substring(start + 1);
			this.textEditor.selectionStart = start;
			this.textEditor.selectionEnd = start;
		} else {
			// 删除选中文本
			const value = this.textEditor.value;
			this.textEditor.value = value.substring(0, start) + value.substring(end);
			this.textEditor.selectionStart = start;
			this.textEditor.selectionEnd = start;
		}

		this.saveToHistory();
		this.updateStatus();
		this.textEditor.focus();
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
			this.textEditor.focus();
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
		this.textEditor.focus();
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
		this.updateTitle();
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
			'find-next': 'F6',
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

	// 键盘事件处理
	handleKeyDown(e) {
		// 当vim模式为普通时
		if (this.vimMode === 'normal') {
			e.preventDefault();

			// i键切换到插入模式
			if (e.key === 'i') {
				this.vimMode = 'insert';
				this.textEditor.classList.remove('blue-cursor');
				return;
			}
		}

		//当vim模式为插入时
		if (this.vimMode === 'insert') {
			// Esc键切换回普通模式
			if (e.key === 'Escape') {
				e.preventDefault();
				this.vimMode = 'normal';
				this.textEditor.classList.add('blue-cursor');
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

			// Ctrl+P: 打印
			if (e.ctrlKey && e.key === 'p') {
				e.preventDefault();
				this.printFile();
				return;
			}

			// Ctrl+F: 查找
			if (e.ctrlKey && e.key === 'f') {
				e.preventDefault();
				this.showFindDialog();
				return;
			}

			// F6: 查找下一个
			if (e.key === 'F6') {
				e.preventDefault();
				this.findNext();
				return;
			}

			// Ctrl+H: 替换
			if (e.ctrlKey && e.key === 'h') {
				e.preventDefault();
				this.showReplaceDialog();
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

		// 计算行号和列号
		const lines = text.substring(0, cursorPos).split('\n');
		const lineNumber = lines.length;
		const columnNumber = lines[lines.length - 1].length + 1;

		// 更新状态栏
		this.statusBar.lineColumn.textContent = `第 ${lineNumber} 行，第 ${columnNumber} 列`;
		this.statusBar.charCount.textContent = `第 ${cursorPos} / ${text.length} 个字符`;

		// 更新菜单状态
		this.updateMenuState();
	}

	updateMenuState() {
		const hasText = this.textEditor.value.length > 0;
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
		const deleteOption = document.querySelector('[data-action="delete"]');

		if (cutOption) {
			cutOption.classList.toggle('disabled', !hasSelection);
		}

		if (copyOption) {
			copyOption.classList.toggle('disabled', !hasSelection);
		}

		if (deleteOption) {
			deleteOption.classList.toggle('disabled', !hasSelection);
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
