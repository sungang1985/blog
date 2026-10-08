/* 记事本 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;
  var site = XP.site;

  var README = [
    '欢迎来到 ' + site.systemName + '！',
    '========================================',
    '',
    '这是 ' + site.owner.name + ' 的个人网站，整个网站被做成了一台 Windows XP 电脑。',
    '',
    '【怎么用】',
    '  * 双击桌面图标打开程序（手机上轻点一下就行）',
    '  * 拖动标题栏移动窗口，拖动窗口边缘调整大小',
    '  * 双击标题栏可以最大化 / 还原窗口',
    '  * 点击左下角的「开始」按钮，打开开始菜单',
    '  * 右键桌面 → 属性，可以更换壁纸',
    '',
    '【推荐去看看】',
    '  * 关于我 ........... 个人简介、技能、联系方式',
    '  * 我的文章 ......... 博客文章，双击即可阅读',
    '  * Internet Explorer  用“网页”的方式浏览博客',
    '  * 扫雷 / 画图 ...... 摸鱼专用',
    '  * 命令提示符 ....... 输入 help 查看可用命令',
    '',
    '这个记事本是可以编辑的，写完还能通过“文件 → 另存为”下载下来。',
    '',
    '祝你玩得开心！'
  ].join('\n');

  XP.registerApp('notepad', {
    title: '记事本',
    icon: 'notepad',
    type: '应用程序',
    open: function (args) {
      var name = args.title || '无标题';
      var wrap = XP.storage.get('notepad-wrap', true);
      var showStatus = XP.storage.get('notepad-status', true);

      var ta = h('textarea', { class: 'notepad-text', spellcheck: 'false', 'aria-label': '文本' });
      ta.value = args.text || '';
      var pos = h('span', { class: 'sb-cell' }, '第 1 行，第 1 列');
      var status = h('div', { class: 'statusbar' }, h('span', { class: 'sb-cell sb-grow' }), pos);

      function apply() {
        ta.wrap = wrap ? 'soft' : 'off';
        ta.classList.toggle('nowrap', !wrap);
        status.hidden = !showStatus;
      }

      function updatePos() {
        var before = ta.value.slice(0, ta.selectionStart).split('\n');
        pos.textContent = '第 ' + before.length + ' 行，第 ' + (before[before.length - 1].length + 1) + ' 列';
      }

      function insertDate() {
        var d = new Date();
        var text = XP.pad(d.getHours()) + ':' + XP.pad(d.getMinutes()) + ' ' + d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
        ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
        ta.focus();
        updatePos();
      }

      function edit(cmd) {
        ta.focus();
        try {
          document.execCommand(cmd);
        } catch (e) { /* 部分浏览器不支持 */ }
      }

      var root = h(
        'div', { class: 'notepad' },
        XP.menubar([
          { label: '文件(F)', items: [
            { label: '新建(N)', shortcut: 'Ctrl+N', action: function () { XP.launch('notepad'); } },
            { label: '另存为(A)...', action: function () {
              var fname = /\.txt$/.test(name) ? name : name + '.txt';
              XP.download(fname, new Blob([ta.value.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }));
            } },
            '-',
            { label: '打印(P)...', shortcut: 'Ctrl+P', action: function () { window.print(); } },
            '-',
            { label: '退出(X)', action: function () { win.close(); } }
          ] },
          { label: '编辑(E)', items: [
            { label: '撤销(U)', shortcut: 'Ctrl+Z', action: function () { edit('undo'); } },
            '-',
            { label: '剪切(T)', shortcut: 'Ctrl+X', action: function () { edit('cut'); } },
            { label: '复制(C)', shortcut: 'Ctrl+C', action: function () { edit('copy'); } },
            { label: '删除(L)', shortcut: 'Del', action: function () { edit('delete'); } },
            '-',
            { label: '全选(A)', shortcut: 'Ctrl+A', action: function () { ta.focus(); ta.select(); } },
            { label: '时间/日期(D)', shortcut: 'F5', action: insertDate }
          ] },
          { label: '格式(O)', items: function () {
            return [{ label: '自动换行(W)', checked: wrap, action: function () {
              wrap = !wrap;
              XP.storage.set('notepad-wrap', wrap);
              apply();
            } }];
          } },
          { label: '查看(V)', items: function () {
            return [{ label: '状态栏(S)', checked: showStatus, action: function () {
              showStatus = !showStatus;
              XP.storage.set('notepad-status', showStatus);
              apply();
            } }];
          } },
          { label: '帮助(H)', items: [
            { label: '关于记事本(A)', action: function () {
              XP.msgbox({ title: '关于记事本', icon: 'notepad', message: '记事本 · ' + site.systemName + '\n简单，可靠，永不崩溃（大概）。' });
            } }
          ] }
        ]),
        ta,
        status
      );

      ta.addEventListener('keydown', function (e) {
        if (e.key === 'F5') {
          e.preventDefault();
          insertDate();
        }
      });
      ['keyup', 'click', 'input', 'select'].forEach(function (ev) { ta.addEventListener(ev, updatePos); });

      var win = XP.wm.open({
        id: args.id,
        title: name + ' - 记事本',
        icon: XP.icon('notepad'),
        content: root,
        width: args.width || 560,
        height: args.height || 420,
        minWidth: 240
      });
      apply();
      setTimeout(function () { ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0; }, 0);
      return win;
    }
  });

  XP.registerApp('readme', {
    title: '说明.txt',
    icon: 'text',
    type: '文本文档',
    open: function () {
      return XP.launch('notepad', { id: 'readme', title: '说明.txt', text: README, width: 520, height: 460 });
    }
  });
})();
