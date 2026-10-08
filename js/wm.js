/* 窗口管理器：创建、拖动、缩放、最小化/最大化、层叠顺序和任务栏按钮 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;
  var TITLE_H = 30;

  var wm = (XP.wm = {
    list: [],
    active: null,
    z: 10,
    cascade: 0
  });

  function layer() {
    return document.getElementById('windows');
  }

  function area() {
    var d = document.getElementById('desktop');
    return { w: d.clientWidth, h: d.clientHeight };
  }

  wm.find = function (id) {
    return wm.list.filter(function (w) { return w.id === id; })[0] || null;
  };

  wm.open = function (opts) {
    if (opts.id) {
      var existing = wm.find(opts.id);
      if (existing) {
        if (existing.minimized) existing.restore();
        existing.focus();
        if (opts.onReuse) opts.onReuse(existing);
        return existing;
      }
    }

    var resizable = opts.resizable !== false;
    var maximizable = opts.maximizable != null ? opts.maximizable : resizable;
    var minimizable = opts.minimizable !== false;

    var win = {
      id: opts.id || null,
      opts: opts,
      minimized: false,
      maximized: false,
      handlers: {}
    };

    var titleText = h('div', { class: 'title-text' }, opts.title || '');
    var controls = h('div', { class: 'title-controls' });
    if (minimizable) {
      controls.appendChild(h('button', {
        class: 'tb-btn tb-min', 'aria-label': '最小化', title: '最小化',
        onclick: function (e) { e.stopPropagation(); win.minimize(); }
      }));
    }
    if (maximizable) {
      win.maxBtn = h('button', {
        class: 'tb-btn tb-max', 'aria-label': '最大化', title: '最大化',
        onclick: function (e) { e.stopPropagation(); win.toggleMaximize(); }
      });
      controls.appendChild(win.maxBtn);
    }
    controls.appendChild(h('button', {
      class: 'tb-btn tb-close', 'aria-label': '关闭', title: '关闭',
      onclick: function (e) { e.stopPropagation(); win.close(); }
    }));

    var titleBar = h(
      'div',
      { class: 'title-bar' },
      opts.icon ? h('img', { class: 'title-icon', src: opts.icon, alt: '' }) : null,
      titleText,
      controls
    );
    var body = h('div', { class: 'window-body' });
    if (opts.content) body.appendChild(opts.content);

    var el = h('div', {
      class: 'window' + (opts.className ? ' ' + opts.className : '') + (resizable ? ' resizable' : ''),
      role: 'dialog',
      'aria-label': opts.title || ''
    }, titleBar, body);

    win.el = el;
    win.body = body;
    win.titleBar = titleBar;

    win.setTitle = function (t) {
      titleText.textContent = t;
      el.setAttribute('aria-label', t);
      if (win.taskBtn) {
        win.taskBtn.querySelector('.task-label').textContent = t;
        win.taskBtn.title = t;
      }
    };

    win.setIcon = function (src) {
      var img = titleBar.querySelector('.title-icon');
      if (img) img.src = src;
      if (win.taskBtn && win.taskBtn.querySelector('img')) win.taskBtn.querySelector('img').src = src;
    };

    win.focus = function () {
      if (wm.active && wm.active !== win) wm.active.el.classList.add('inactive');
      wm.active = win;
      el.classList.remove('inactive');
      el.style.zIndex = (opts.modal ? 100000 : 0) + ++wm.z;
      updateTaskbar();
    };

    win.minimize = function () {
      if (win.minimized) return;
      win.minimized = true;
      animateToTaskbar(win, true, function () {
        if (win.minimized) el.classList.add('minimized');
      });
      if (wm.active === win) {
        wm.active = null;
        focusTopmost();
      }
      updateTaskbar();
    };

    win.restore = function () {
      if (!win.minimized) return;
      win.minimized = false;
      el.classList.remove('minimized');
      animateToTaskbar(win, false);
      win.focus();
    };

    win.toggleMaximize = function () {
      if (!maximizable) return;
      win.maximized = !win.maximized;
      el.classList.toggle('maximized', win.maximized);
      if (win.maxBtn) {
        win.maxBtn.classList.toggle('tb-restore', win.maximized);
        win.maxBtn.title = win.maximized ? '向下还原' : '最大化';
      }
      emit('resize');
    };

    win.close = function (force) {
      if (opts.onClose && opts.onClose(win) === false && force !== true) return;
      emit('close');
      el.remove();
      if (win.taskBtn) win.taskBtn.remove();
      wm.list = wm.list.filter(function (w) { return w !== win; });
      if (wm.active === win) {
        wm.active = null;
        focusTopmost();
      }
      updateTaskbar();
    };

    win.on = function (name, fn) {
      (win.handlers[name] = win.handlers[name] || []).push(fn);
    };

    function emit(name) {
      (win.handlers[name] || []).forEach(function (fn) { fn(win); });
    }

    // 点击窗口任意位置都会激活窗口（捕获阶段，确保内容区阻止冒泡也有效）
    el.addEventListener('pointerdown', function () {
      if (wm.active !== win) win.focus();
    }, true);

    titleBar.addEventListener('dblclick', function (e) {
      if (e.target.closest('.tb-btn')) return;
      if (maximizable) win.toggleMaximize();
    });

    titleBar.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      XP.popupMenu(windowMenu(win, minimizable, maximizable), e.clientX, e.clientY);
    });

    makeDraggable(win, titleBar);
    if (resizable) makeResizable(win);

    layer().appendChild(el);
    wm.list.push(win);

    // 尺寸与位置
    var a = area();
    var w = opts.width === 'auto' ? null : Math.min(opts.width || 520, a.w - 8);
    var ht = opts.height === 'auto' ? null : Math.min(opts.height || 380, a.h - 8);
    if (w) el.style.width = w + 'px';
    if (ht) el.style.height = ht + 'px';
    var rw = el.offsetWidth;
    var rh = el.offsetHeight;
    var x;
    var y;
    if (opts.x != null && opts.y != null) {
      x = opts.x;
      y = opts.y;
    } else if (opts.center) {
      x = (a.w - rw) / 2;
      y = (a.h - rh) / 2.4;
    } else {
      var step = wm.cascade++ % 8;
      x = Math.max(8, (a.w - rw) / 2 - 120 + step * 26);
      y = Math.max(8, (a.h - rh) / 2 - 80 + step * 26);
    }
    setPos(win, x, y);

    if (opts.taskbar !== false) createTaskButton(win);

    if (opts.maximized || (resizable && maximizable && XP.isMobile())) win.toggleMaximize();

    win.focus();
    return win;
  };

  function windowMenu(win, minimizable, maximizable) {
    return [
      { label: '还原(R)', disabled: !win.maximized && !win.minimized, action: function () {
        if (win.minimized) win.restore(); else if (win.maximized) win.toggleMaximize();
      } },
      { label: '最小化(N)', disabled: !minimizable || win.minimized, action: win.minimize },
      { label: '最大化(X)', disabled: !maximizable || win.maximized, action: function () {
        if (win.minimized) win.restore();
        win.toggleMaximize();
      } },
      '-',
      { label: '关闭(C)', bold: true, shortcut: 'Alt+F4', action: win.close }
    ];
  }

  function setPos(win, x, y) {
    var a = area();
    var w = win.el.offsetWidth;
    x = Math.min(Math.max(x, 80 - w), a.w - 80);
    y = Math.min(Math.max(y, 0), a.h - TITLE_H);
    win.el.style.left = Math.round(x) + 'px';
    win.el.style.top = Math.round(y) + 'px';
  }

  function focusTopmost() {
    var best = null;
    wm.list.forEach(function (w) {
      if (w.minimized) return;
      if (!best || +w.el.style.zIndex > +best.el.style.zIndex) best = w;
    });
    if (best) best.focus();
    else updateTaskbar();
  }

  function makeDraggable(win, handle) {
    var start = null;
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('.tb-btn') || win.maximized) return;
      start = { x: e.clientX, y: e.clientY, left: win.el.offsetLeft, top: win.el.offsetTop };
      handle.setPointerCapture(e.pointerId);
      document.body.classList.add('dragging');
    });
    handle.addEventListener('pointermove', function (e) {
      if (!start) return;
      setPos(win, start.left + e.clientX - start.x, start.top + e.clientY - start.y);
    });
    function end() {
      if (!start) return;
      start = null;
      document.body.classList.remove('dragging');
    }
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function makeResizable(win) {
    var minW = win.opts.minWidth || 240;
    var minH = win.opts.minHeight || 140;
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (dir) {
      var grip = h('div', { class: 'resize-handle rh-' + dir });
      var s = null;
      grip.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || win.maximized) return;
        e.stopPropagation();
        s = {
          x: e.clientX, y: e.clientY,
          l: win.el.offsetLeft, t: win.el.offsetTop,
          w: win.el.offsetWidth, h: win.el.offsetHeight
        };
        grip.setPointerCapture(e.pointerId);
        document.body.classList.add('dragging');
      });
      grip.addEventListener('pointermove', function (e) {
        if (!s) return;
        var dx = e.clientX - s.x;
        var dy = e.clientY - s.y;
        var l = s.l, t = s.t, w = s.w, ht = s.h;
        if (dir.indexOf('e') >= 0) w = Math.max(minW, s.w + dx);
        if (dir.indexOf('s') >= 0) ht = Math.max(minH, s.h + dy);
        if (dir.indexOf('w') >= 0) {
          w = Math.max(minW, s.w - dx);
          l = s.l + s.w - w;
        }
        if (dir.indexOf('n') >= 0) {
          ht = Math.max(minH, s.h - dy);
          t = s.t + s.h - ht;
          if (t < 0) { ht += t; t = 0; }
        }
        win.el.style.left = l + 'px';
        win.el.style.top = t + 'px';
        win.el.style.width = w + 'px';
        win.el.style.height = ht + 'px';
      });
      function end() {
        if (!s) return;
        s = null;
        document.body.classList.remove('dragging');
        (win.handlers.resize || []).forEach(function (fn) { fn(win); });
      }
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
      win.el.appendChild(grip);
    });
  }

  /* 最小化 / 还原时窗口“飞向”任务栏按钮的动画 */
  function animateToTaskbar(win, toBar, done) {
    var btn = win.taskBtn;
    if (!btn || !win.el.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (done) done();
      return;
    }
    var r = win.el.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    if (!r.width || !b.width) {
      if (done) done();
      return;
    }
    var to = 'translate(' + (b.left - r.left) + 'px,' + (b.top - r.top) + 'px) scale(' +
      b.width / r.width + ',' + b.height / r.height + ')';
    var frames = [
      { transform: 'none', opacity: 1 },
      { transform: to, opacity: 0.2 }
    ];
    if (!toBar) frames.reverse();
    win.el.style.transformOrigin = '0 0';
    var anim = win.el.animate(frames, { duration: 180, easing: 'ease-in-out' });
    anim.onfinish = function () {
      win.el.style.transformOrigin = '';
      if (done) done();
    };
  }

  /* ---------- 任务栏 ---------- */
  function createTaskButton(win) {
    var btn = h(
      'button',
      { class: 'task-btn', title: win.opts.title || '' },
      win.opts.icon ? h('img', { src: win.opts.icon, alt: '' }) : null,
      h('span', { class: 'task-label' }, win.opts.title || '')
    );
    btn.addEventListener('click', function () {
      if (win.minimized) win.restore();
      else if (wm.active === win) win.minimize();
      else win.focus();
    });
    btn.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var r = btn.getBoundingClientRect();
      var menu = windowMenu(win, win.opts.minimizable !== false, win.maxBtn != null);
      var m = XP.popupMenu(menu, r.left, 0);
      m.style.top = Math.max(0, r.top - m.offsetHeight) + 'px';
    });
    win.taskBtn = btn;
    document.getElementById('taskbar-buttons').appendChild(btn);
  }

  function updateTaskbar() {
    wm.list.forEach(function (w) {
      if (w.taskBtn) w.taskBtn.classList.toggle('active', w === wm.active && !w.minimized);
    });
  }

  wm.minimizeAll = function () {
    wm.list.forEach(function (w) {
      if (w.taskBtn) w.minimize();
    });
  };

  wm.closeAll = function () {
    wm.list.slice().forEach(function (w) { w.close(true); });
    wm.cascade = 0;
  };

  window.addEventListener('resize', function () {
    wm.list.forEach(function (w) {
      if (!w.maximized) setPos(w, w.el.offsetLeft, w.el.offsetTop);
    });
  });
})();
