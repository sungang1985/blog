/* 外壳：开机/登录/关机流程、桌面图标、开始菜单、右键菜单、通知区域 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;
  var site = XP.site;
  var $ = function (id) { return document.getElementById(id); };

  var DESKTOP = [
    { app: 'computer', label: '我的电脑' },
    { app: 'about', label: '关于我' },
    { app: 'documents', label: '我的文章' },
    { app: 'projects', label: '我的项目' },
    { app: 'ie', label: 'Internet Explorer' },
    { app: 'readme', label: '说明.txt' },
    { app: 'minesweeper', label: '扫雷' },
    { app: 'paint', label: '画图' },
    { app: 'cmd', label: '命令提示符' },
    { app: 'recycle', label: '回收站' }
  ];

  function appIcon(key) {
    var app = XP.apps[key];
    if (!app) return XP.icon('help');
    return XP.icon(typeof app.icon === 'function' ? app.icon() : app.icon);
  }

  /* ---------- 开机 / 登录 / 关机 ---------- */
  function show(id) {
    ['boot', 'login', 'screen', 'off'].forEach(function (k) {
      $(k).hidden = k !== id;
    });
  }

  function session(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem('xp:' + key);
      sessionStorage.setItem('xp:' + key, value);
    } catch (e) { return null; }
  }

  var bootTimer;
  function boot() {
    show('boot');
    clearTimeout(bootTimer);
    bootTimer = setTimeout(showLogin, 3200);
  }

  function showLogin() {
    clearTimeout(bootTimer);
    loginMode(null);
    show('login');
    var user = document.querySelector('.login-user');
    if (user) user.focus();
  }

  function loginMode(message) {
    var login = $('login');
    login.classList.toggle('message-mode', !!message);
    login.querySelector('.login-message').textContent = message || '';
  }

  function logIn() {
    loginMode('欢迎');
    setTimeout(function () {
      session('booted', '1');
      showDesktop(true);
    }, 1200);
  }

  function showDesktop(welcome) {
    show('screen');
    $('screen').classList.remove('grayscale');
    if (welcome) {
      setTimeout(function () {
        XP.balloon({
          title: '欢迎访问 ' + site.systemName,
          text: '双击桌面图标打开程序，点击「开始」按钮探索更多内容。'
        });
      }, 800);
    }
  }

  function powerOff(message, then) {
    closeDialog();
    XP.closeMenus();
    hideStartMenu();
    XP.wm.closeAll();
    loginMode(message);
    show('login');
    setTimeout(then, 1600);
  }

  XP.shutdown = function () {
    powerOff('正在关机...', function () {
      session('booted', '');
      show('off');
      $('power-on').focus();
    });
  };

  XP.restart = function () {
    powerOff('正在重新启动...', boot);
  };

  XP.logoff = function () {
    powerOff('正在注销...', showLogin);
  };

  function standby() {
    closeDialog();
    var cover = h('div', { class: 'standby', title: '单击任意位置唤醒' });
    function wake() {
      cover.remove();
      document.removeEventListener('keydown', wake);
    }
    cover.addEventListener('click', wake);
    document.addEventListener('keydown', wake);
    document.body.appendChild(cover);
  }

  /* 关机 / 注销对话框（背景变灰的那种） */
  var dialog = null;
  function closeDialog() {
    if (dialog) {
      dialog.remove();
      dialog = null;
    }
    $('screen').classList.remove('grayscale');
  }

  function powerDialog(title, buttons) {
    hideStartMenu();
    closeDialog();
    $('screen').classList.add('grayscale');
    var row = h('div', { class: 'pd-buttons' });
    buttons.forEach(function (b) {
      row.appendChild(h(
        'button',
        { class: 'pd-btn', onclick: b.action },
        h('span', { class: 'pd-icon pd-' + b.kind }),
        h('span', { class: 'pd-label' }, b.label)
      ));
    });
    dialog = h(
      'div',
      { class: 'power-overlay', onkeydown: function (e) { if (e.key === 'Escape') closeDialog(); } },
      h(
        'div',
        { class: 'power-dialog', role: 'dialog', 'aria-label': title },
        h('div', { class: 'pd-head' }, h('span', null, title), h('img', { src: XP.icon('flag'), alt: '' })),
        h('div', { class: 'pd-body' }, row),
        h('div', { class: 'pd-foot' }, h('button', { class: 'xp-btn', onclick: closeDialog }, '取消'))
      )
    );
    document.body.appendChild(dialog);
    row.querySelector('button').focus();
  }

  XP.shutdownDialog = function () {
    powerDialog('关闭计算机', [
      { kind: 'standby', label: '待机(S)', action: standby },
      { kind: 'off', label: '关闭(U)', action: XP.shutdown },
      { kind: 'restart', label: '重新启动(R)', action: XP.restart }
    ]);
  };

  XP.logoffDialog = function () {
    powerDialog('注销 ' + site.systemName, [
      { kind: 'switch', label: '切换用户(S)', action: function () { closeDialog(); showLogin(); } },
      { kind: 'logoff', label: '注销(L)', action: XP.logoff }
    ]);
  };

  /* ---------- 桌面图标 ---------- */
  var iconsEl;
  var lastPointer = 'mouse';

  function renderDesktop() {
    iconsEl.innerHTML = '';
    DESKTOP.forEach(function (d) {
      var icon = h(
        'div',
        {
          class: 'desktop-icon',
          tabindex: '0',
          role: 'button',
          'data-app': d.app,
          'aria-label': d.label,
          style: { '--icon': 'url("' + appIcon(d.app) + '")' }
        },
        h('div', { class: 'di-img' }, h('img', { src: appIcon(d.app), alt: '', draggable: 'false' })),
        h('span', { class: 'di-label' }, d.label)
      );
      icon.addEventListener('pointerdown', function (e) {
        lastPointer = e.pointerType;
        if (e.ctrlKey) icon.classList.toggle('selected');
        else if (!icon.classList.contains('selected') || e.button === 0) selectOnly(icon);
      });
      icon.addEventListener('click', function () {
        if (lastPointer === 'touch' || lastPointer === 'pen') openIcon(icon);
      });
      icon.addEventListener('dblclick', function () { openIcon(icon); });
      icon.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') openIcon(icon);
      });
      icon.addEventListener('focus', function () {
        if (!icon.classList.contains('selected')) selectOnly(icon);
      });
      icon.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
        selectOnly(icon);
        XP.popupMenu(iconMenu(d), e.clientX, e.clientY);
      });
      iconsEl.appendChild(icon);
    });
  }

  XP.refreshDesktop = renderDesktop;

  function openIcon(icon) {
    icon.classList.add('opening');
    setTimeout(function () { icon.classList.remove('opening'); }, 300);
    XP.launch(icon.getAttribute('data-app'));
  }

  function selectOnly(icon) {
    iconsEl.querySelectorAll('.desktop-icon.selected').forEach(function (i) {
      if (i !== icon) i.classList.remove('selected');
    });
    if (icon) icon.classList.add('selected');
  }

  function iconMenu(d) {
    var items = [
      { label: '打开(O)', bold: true, action: function () { XP.launch(d.app); } }
    ];
    if (d.app === 'recycle') {
      items.push({
        label: '清空回收站(B)',
        disabled: !XP.apps.recycle.hasItems(),
        action: function () { XP.apps.recycle.empty(); }
      });
    }
    items.push('-', {
      label: '属性(R)',
      action: function () {
        XP.msgbox({
          title: d.label + ' 属性',
          icon: 'info',
          message: '名称：' + d.label + '\n类型：' + (XP.apps[d.app] ? XP.apps[d.app].type || '应用程序' : '快捷方式') +
            '\n位置：桌面'
        });
      }
    });
    return items;
  }

  function desktopMenu() {
    return [
      {
        label: '排列图标(I)',
        items: [
          { label: '名称', action: function () {
            DESKTOP.sort(function (a, b) { return a.label.localeCompare(b.label, 'zh'); });
            renderDesktop();
          } },
          { label: '默认顺序', action: function () {
            DESKTOP.sort(function (a, b) { return defaultOrder.indexOf(a.app) - defaultOrder.indexOf(b.app); });
            renderDesktop();
          } }
        ]
      },
      { label: '刷新(E)', action: function () {
        iconsEl.style.visibility = 'hidden';
        setTimeout(function () {
          renderDesktop();
          iconsEl.style.visibility = '';
        }, 120);
      } },
      '-',
      { label: '显示桌面', action: XP.wm.minimizeAll },
      '-',
      { label: '属性(R)', action: function () { XP.launch('display'); } }
    ];
  }

  var defaultOrder = DESKTOP.map(function (d) { return d.app; });

  function setupDesktop() {
    var desktop = $('desktop');
    iconsEl = $('desktop-icons');
    renderDesktop();

    // 框选
    var sel = null;
    var box = h('div', { class: 'select-box' });
    desktop.addEventListener('pointerdown', function (e) {
      if (e.target !== desktop && e.target !== iconsEl) return;
      hideStartMenu();
      selectOnly(null);
      if (e.button !== 0 || e.pointerType === 'touch') return;
      var r = desktop.getBoundingClientRect();
      sel = { x: e.clientX - r.left, y: e.clientY - r.top, r: r };
      desktop.setPointerCapture(e.pointerId);
    });
    desktop.addEventListener('pointermove', function (e) {
      if (!sel) return;
      var x = e.clientX - sel.r.left;
      var y = e.clientY - sel.r.top;
      var l = Math.min(x, sel.x), t = Math.min(y, sel.y);
      var w = Math.abs(x - sel.x), ht = Math.abs(y - sel.y);
      if (!box.parentNode && w + ht > 4) desktop.insertBefore(box, $('windows'));
      Object.assign(box.style, { left: l + 'px', top: t + 'px', width: w + 'px', height: ht + 'px' });
      iconsEl.querySelectorAll('.desktop-icon').forEach(function (icon) {
        var ir = icon.getBoundingClientRect();
        var il = ir.left - sel.r.left, it = ir.top - sel.r.top;
        var hit = il < l + w && il + ir.width > l && it < t + ht && it + ir.height > t;
        icon.classList.toggle('selected', hit);
      });
    });
    function endSel() {
      sel = null;
      box.remove();
    }
    desktop.addEventListener('pointerup', endSel);
    desktop.addEventListener('pointercancel', endSel);

    desktop.addEventListener('contextmenu', function (e) {
      if (e.target !== desktop && e.target !== iconsEl) return;
      e.preventDefault();
      XP.popupMenu(desktopMenu(), e.clientX, e.clientY);
    });
  }

  /* ---------- 开始菜单 ---------- */
  var startMenu;

  function smItem(def) {
    var app = XP.apps[def.app];
    var label = def.label || (app && app.title) || def.app;
    var el = h(
      'button',
      { class: 'sm-item' + (def.bold ? ' bold' : '') + (def.big ? ' big' : '') },
      h('img', { src: def.icon ? XP.icon(def.icon) : appIcon(def.app), alt: '' }),
      h(
        'span',
        { class: 'sm-text' },
        h('span', { class: 'sm-label' }, label),
        def.sub ? h('span', { class: 'sm-sub' }, def.sub) : null
      )
    );
    el.addEventListener('click', function () {
      hideStartMenu();
      if (def.action) def.action();
      else XP.launch(def.app, def.args);
    });
    return el;
  }

  function buildStartMenu() {
    startMenu = $('start-menu');
    var left = h(
      'div',
      { class: 'sm-left' },
      smItem({ app: 'ie', label: 'Internet', sub: 'Internet Explorer', bold: true, big: true }),
      smItem({ app: 'documents', label: '我的博客', sub: site.posts.length + ' 篇文章', bold: true, big: true }),
      h('div', { class: 'sm-sep' }),
      smItem({ app: 'about', big: true }),
      smItem({ app: 'minesweeper', big: true }),
      smItem({ app: 'paint', big: true }),
      smItem({ app: 'cmd', big: true }),
      smItem({ app: 'notepad', big: true }),
      h('div', { class: 'sm-spacer' }),
      h('div', { class: 'sm-sep' })
    );
    var all = h('button', { class: 'sm-all' }, h('span', null, '所有程序(P)'), h('span', { class: 'sm-all-arrow' }));
    function openAll() {
      var r = all.getBoundingClientRect();
      var list = ['computer', 'about', 'documents', 'projects', 'ie', 'notepad', 'paint', 'minesweeper', 'cmd', 'recycle', 'display', 'run']
        .map(function (k) {
          return { label: XP.apps[k].title, icon: appIcon(k), action: function () { hideStartMenu(); XP.launch(k); } };
        });
      XP.popupMenu(list, r.right - 2, 0, { parent: startMenu, className: 'sm-flyout', bottom: r.bottom });
    }
    all.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') openAll();
    });
    all.addEventListener('click', openAll);
    all.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    left.appendChild(all);

    var right = h(
      'div',
      { class: 'sm-right' },
      smItem({ app: 'documents', label: '我的文章', bold: true }),
      smItem({ app: 'projects', label: '我的项目', bold: true }),
      smItem({ app: 'about', label: '关于我', bold: true }),
      smItem({ app: 'recycle', label: '回收站' }),
      h('div', { class: 'sm-sep' }),
      smItem({ app: 'display', label: '控制面板' }),
      smItem({ app: 'readme', label: '说明.txt', icon: 'notepad' }),
      h('div', { class: 'sm-sep' }),
      smItem({ app: 'ie', label: '帮助和支持(H)', icon: 'help', args: { url: 'xp://help' } }),
      smItem({ app: 'run', label: '运行(R)...' })
    );

    startMenu.appendChild(h(
      'div',
      { class: 'sm-header' },
      h('img', { class: 'sm-avatar', src: site.owner.avatar, alt: '' }),
      h('span', null, site.owner.name)
    ));
    startMenu.appendChild(h('div', { class: 'sm-body' }, left, right));
    startMenu.appendChild(h(
      'div',
      { class: 'sm-footer' },
      h('button', { class: 'sm-foot-btn', onclick: function () { XP.logoffDialog(); } },
        h('img', { src: XP.icon('logoff'), alt: '' }), '注销(L)'),
      h('button', { class: 'sm-foot-btn', onclick: function () { XP.shutdownDialog(); } },
        h('img', { src: XP.icon('shutdown'), alt: '' }), '关闭计算机(U)')
    ));
    startMenu.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      if (!e.target.closest('.sm-all')) XP.closeMenus();
    });
    startMenu.addEventListener('pointerover', function (e) {
      if (e.target.closest('.sm-item') && document.querySelector('.sm-flyout')) XP.closeMenus();
    });
    startMenu.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var btn = $('start-button');
    btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    btn.addEventListener('click', function () {
      if (startMenu.hidden) showStartMenu();
      else hideStartMenu();
    });
    document.addEventListener('pointerdown', hideStartMenu);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideStartMenu();
    });
  }

  function showStartMenu() {
    XP.closeMenus();
    startMenu.hidden = false;
    $('start-button').classList.add('pressed');
  }

  function hideStartMenu() {
    if (!startMenu || startMenu.hidden) return;
    startMenu.hidden = true;
    $('start-button').classList.remove('pressed');
    XP.closeMenus();
  }

  XP.hideStartMenu = hideStartMenu;

  /* ---------- 通知区域：时钟与气球提示 ---------- */
  function tickClock() {
    var now = new Date();
    var clock = $('clock');
    clock.textContent = XP.pad(now.getHours()) + ':' + XP.pad(now.getMinutes());
    clock.title = XP.formatDate(now);
    setTimeout(tickClock, (60 - now.getSeconds()) * 1000 + 50);
  }

  var balloonEl = null;
  var balloonTimer;
  XP.balloon = function (opts) {
    if (balloonEl) balloonEl.remove();
    clearTimeout(balloonTimer);
    balloonEl = h(
      'div',
      { class: 'balloon', role: 'status' },
      h('button', { class: 'balloon-close', 'aria-label': '关闭', onclick: function () { balloonEl.remove(); } }),
      h('div', { class: 'balloon-title' }, h('img', { src: XP.icon('info'), alt: '' }), opts.title),
      h('div', { class: 'balloon-text' }, opts.text)
    );
    balloonEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    document.getElementById('screen').appendChild(balloonEl);
    var el = balloonEl;
    balloonTimer = setTimeout(function () {
      el.classList.add('fade');
      setTimeout(function () { el.remove(); }, 600);
    }, opts.timeout || 9000);
  };

  function setupTaskbar() {
    $('taskbar').addEventListener('contextmenu', function (e) {
      if (e.target.closest('.task-btn')) return;
      e.preventDefault();
      XP.popupMenu([
        { label: '显示桌面(S)', action: XP.wm.minimizeAll },
        { label: '任务管理器(K)', disabled: true },
        '-',
        { label: '属性(R)', action: function () { XP.launch('display'); } }
      ], e.clientX, e.clientY - 120);
    });
    $('ql-desktop').addEventListener('click', XP.wm.minimizeAll);
    $('ql-ie').addEventListener('click', function () { XP.launch('ie'); });
    $('ql-docs').addEventListener('click', function () { XP.launch('documents'); });
    $('tray-volume').addEventListener('click', function () {
      XP.balloon({ title: '音量', text: '本站没有背景音乐，可以放心摸鱼。', timeout: 4000 });
    });
    $('tray-network').addEventListener('click', function () {
      XP.balloon({ title: '本地连接 现在已连接', text: '速度：100.0 Mbps\n信号强度：非常好', timeout: 4000 });
    });
    tickClock();
  }

  /* ---------- 初始化 ---------- */
  function fillStatic() {
    document.title = site.systemName + ' · ' + site.owner.name + ' 的个人网站';
    document.querySelectorAll('[data-site="name"]').forEach(function (el) { el.textContent = site.owner.name; });
    document.querySelectorAll('[data-site="title"]').forEach(function (el) { el.textContent = site.owner.title; });
    document.querySelectorAll('[data-site="system"]').forEach(function (el) { el.textContent = site.systemName; });
    document.querySelectorAll('[data-site="edition"]').forEach(function (el) { el.textContent = site.edition; });
    document.querySelectorAll('[data-site="avatar"]').forEach(function (el) { el.src = site.owner.avatar; });
    document.querySelectorAll('[data-site="year"]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  function init() {
    fillStatic();
    if (XP.applyWallpaper) XP.applyWallpaper();
    setupDesktop();
    buildStartMenu();
    setupTaskbar();

    $('boot').addEventListener('click', showLogin);
    document.querySelector('.login-user').addEventListener('click', logIn);
    document.querySelector('.login-power').addEventListener('click', XP.shutdown);
    $('power-on').addEventListener('click', boot);

    // 屏蔽桌面外壳上的浏览器默认右键菜单
    ['screen', 'boot', 'login', 'off'].forEach(function (id) {
      $(id).addEventListener('contextmenu', function (e) {
        if (!e.target.closest('input, textarea, .selectable')) e.preventDefault();
      });
    });

    if (/[?&]skip\b/.test(location.search) || session('booted')) showDesktop(false);
    else boot();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
