/* 系统程序：显示属性（壁纸、屏幕保护程序）、运行对话框 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;
  var site = XP.site;

  /* ---------- 壁纸 ---------- */
  var WALLPAPERS = [
    { id: 'bliss', name: 'Bliss（蓝天绿地）', css: 'url("assets/wallpapers/bliss.svg") center / cover no-repeat #4f8fdc' },
    { id: 'azul', name: 'Azul（蔚蓝）', css: 'url("assets/wallpapers/azul.svg") center / cover no-repeat #0c3a8a' },
    { id: 'sunset', name: '晚霞', css: 'linear-gradient(180deg, #2b1d5c 0%, #7a3b8f 35%, #e0705a 70%, #f7c06b 100%)' },
    { id: 'classic', name: 'Windows 经典', css: '#3a6ea5' },
    { id: 'none', name: '（无）', css: null }
  ];

  function settings() {
    return {
      wallpaper: XP.storage.get('wallpaper', 'bliss'),
      color: XP.storage.get('bgcolor', '#004e98'),
      saver: XP.storage.get('saver', 'none'),
      wait: XP.storage.get('saver-wait', 5)
    };
  }

  function wallpaperCss(id, color) {
    var wp = WALLPAPERS.filter(function (w) { return w.id === id; })[0] || WALLPAPERS[0];
    return wp.css || color;
  }

  XP.applyWallpaper = function () {
    var s = settings();
    document.getElementById('desktop').style.background = wallpaperCss(s.wallpaper, s.color);
  };

  /* ---------- 屏幕保护程序 ---------- */
  var SAVERS = {
    none: { name: '（无）' },
    starfield: {
      name: '飞越星空',
      run: function (canvas) {
        var c = canvas.getContext('2d');
        var stars = [];
        for (var i = 0; i < 300; i++) stars.push(newStar(true));
        function newStar(any) {
          return { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: any ? Math.random() : 1 };
        }
        return loop(function () {
          var w = canvas.width, ht = canvas.height;
          c.fillStyle = '#000';
          c.fillRect(0, 0, w, ht);
          stars.forEach(function (s, i) {
            s.z -= 0.006;
            if (s.z <= 0.01) { stars[i] = newStar(false); return; }
            var x = w / 2 + (s.x / s.z) * w / 2;
            var y = ht / 2 + (s.y / s.z) * ht / 2;
            if (x < 0 || y < 0 || x > w || y > ht) { stars[i] = newStar(false); return; }
            var r = Math.max(0.5, (1 - s.z) * 2.5 * (w / 800));
            var b = Math.floor((1 - s.z) * 255);
            c.fillStyle = 'rgb(' + b + ',' + b + ',' + b + ')';
            c.fillRect(x, y, r, r);
          });
        });
      }
    },
    mystify: {
      name: '变幻线',
      run: function (canvas) {
        var c = canvas.getContext('2d');
        var shapes = [makeShape('#3cf'), makeShape('#f6c')];
        function makeShape(color) {
          var pts = [];
          for (var i = 0; i < 4; i++) {
            pts.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.012, vy: (Math.random() - 0.5) * 0.012 });
          }
          return { color: color, pts: pts, trail: [] };
        }
        return loop(function () {
          var w = canvas.width, ht = canvas.height;
          c.fillStyle = '#000';
          c.fillRect(0, 0, w, ht);
          c.lineWidth = Math.max(1, w / 600);
          shapes.forEach(function (s) {
            s.pts.forEach(function (p) {
              p.x += p.vx; p.y += p.vy;
              if (p.x < 0 || p.x > 1) p.vx *= -1;
              if (p.y < 0 || p.y > 1) p.vy *= -1;
            });
            s.trail.unshift(s.pts.map(function (p) { return { x: p.x, y: p.y }; }));
            if (s.trail.length > 6) s.trail.pop();
            s.trail.forEach(function (t, k) {
              c.globalAlpha = 1 - k / 6;
              c.strokeStyle = s.color;
              c.beginPath();
              t.forEach(function (p, i) {
                if (i) c.lineTo(p.x * w, p.y * ht); else c.moveTo(p.x * w, p.y * ht);
              });
              c.closePath();
              c.stroke();
            });
            c.globalAlpha = 1;
          });
        });
      }
    },
    marquee: {
      name: '字幕',
      run: function (canvas) {
        var c = canvas.getContext('2d');
        var x = null;
        var y = 0.5;
        var text = site.systemName + ' · 欢迎回来';
        return loop(function () {
          var w = canvas.width, ht = canvas.height;
          var size = Math.max(10, Math.round(ht / 9));
          c.fillStyle = '#000';
          c.fillRect(0, 0, w, ht);
          c.font = 'bold ' + size + 'px Tahoma, "Microsoft YaHei", sans-serif';
          c.fillStyle = '#ffde59';
          var tw = c.measureText(text).width;
          if (x === null || x < -tw) {
            x = w;
            y = 0.2 + Math.random() * 0.6;
          }
          x -= w / 400;
          c.fillText(text, x, ht * y);
        });
      }
    }
  };

  function loop(draw) {
    var id;
    var stopped = false;
    function frame() {
      if (stopped) return;
      draw();
      id = requestAnimationFrame(frame);
    }
    frame();
    return function () {
      stopped = true;
      cancelAnimationFrame(id);
    };
  }

  var saverActive = null;

  XP.startScreensaver = function (kind) {
    kind = kind || settings().saver;
    if (saverActive || !SAVERS[kind] || !SAVERS[kind].run) return;
    var canvas = h('canvas', { class: 'screensaver' });
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var stop = SAVERS[kind].run(canvas);
    var started = Date.now();
    var origin = null;
    function end(e) {
      if (Date.now() - started < 400) return;
      if (e && e.type === 'pointermove') {
        if (!origin) { origin = { x: e.clientX, y: e.clientY }; return; }
        if (Math.abs(e.clientX - origin.x) + Math.abs(e.clientY - origin.y) < 10) return;
      }
      stop();
      canvas.remove();
      saverActive = null;
      ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(function (t) { window.removeEventListener(t, end, true); });
    }
    ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(function (t) { window.addEventListener(t, end, true); });
    saverActive = end;
  };

  var lastInput = Date.now();
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
    window.addEventListener(t, function () { lastInput = Date.now(); }, { passive: true, capture: true });
  });
  setInterval(function () {
    var s = settings();
    if (s.saver === 'none' || saverActive || document.hidden) return;
    if (document.getElementById('screen').hidden) return;
    if (Date.now() - lastInput >= s.wait * 60000) XP.startScreensaver(s.saver);
  }, 5000);

  /* ---------- 显示 属性 ---------- */
  XP.registerApp('display', {
    title: '显示 属性',
    icon: 'display',
    type: '控制面板',
    open: function () {
      var s = settings();
      var draft = { wallpaper: s.wallpaper, color: s.color, saver: s.saver, wait: s.wait };
      var stopPreview = null;

      var screenEl = h('div', { class: 'mon-screen' });
      var previewCanvas = h('canvas', { width: 160, height: 120 });
      var monitor = h('div', { class: 'monitor' }, screenEl, h('div', { class: 'mon-stand' }));

      // 桌面页
      var list = h('div', { class: 'xp-listbox', role: 'listbox', tabindex: '0' });
      WALLPAPERS.forEach(function (w) {
        var item = h('div', { class: 'xp-option', role: 'option', 'data-id': w.id },
          h('img', { src: XP.icon(w.id === 'none' ? 'none' : 'image'), alt: '' }), w.name);
        item.addEventListener('click', function () {
          draft.wallpaper = w.id;
          refresh();
        });
        list.appendChild(item);
      });
      list.addEventListener('keydown', function (e) {
        var i = WALLPAPERS.findIndex(function (w) { return w.id === draft.wallpaper; });
        if (e.key === 'ArrowDown' && i < WALLPAPERS.length - 1) i++;
        else if (e.key === 'ArrowUp' && i > 0) i--;
        else return;
        e.preventDefault();
        draft.wallpaper = WALLPAPERS[i].id;
        refresh();
      });
      var colorInput = h('input', { type: 'color', class: 'xp-color', value: draft.color, 'aria-label': '颜色' });
      colorInput.addEventListener('input', function () {
        draft.color = colorInput.value;
        refresh();
      });

      var desktopTab = h('div', { class: 'tab-panel' },
        h('div', { class: 'disp-preview' }, monitor),
        h('div', { class: 'disp-row' },
          h('div', { class: 'disp-col' }, h('label', null, '背景(K):'), list),
          h('div', { class: 'disp-col disp-side' },
            h('label', null, '颜色(C):'), colorInput,
            h('p', { class: 'disp-hint' }, '选择“（无）”时使用纯色背景。'))));

      // 屏幕保护页
      var saverSel = h('select', { class: 'xp-select', 'aria-label': '屏幕保护程序' },
        Object.keys(SAVERS).map(function (k) { return h('option', { value: k, selected: k === draft.saver }, SAVERS[k].name); }));
      saverSel.addEventListener('change', function () {
        draft.saver = saverSel.value;
        refresh();
      });
      var waitSel = h('select', { class: 'xp-select', 'aria-label': '等待时间' },
        [1, 3, 5, 10, 15].map(function (m) { return h('option', { value: m, selected: m === draft.wait }, m); }));
      waitSel.addEventListener('change', function () { draft.wait = +waitSel.value; });
      var previewBtn = h('button', { class: 'xp-btn', onclick: function () {
        if (draft.saver !== 'none') XP.startScreensaver(draft.saver);
      } }, '预览(V)');

      var saverTab = h('div', { class: 'tab-panel', hidden: true },
        h('div', { class: 'disp-preview' }),
        h('fieldset', { class: 'xp-fieldset' },
          h('legend', null, '屏幕保护程序(S)'),
          h('div', { class: 'disp-saver-row' }, saverSel, previewBtn),
          h('div', { class: 'disp-saver-row' }, '等待(W): ', waitSel, ' 分钟')));

      var tabs = [
        { label: '桌面', panel: desktopTab },
        { label: '屏幕保护程序', panel: saverTab }
      ];
      var tabBar = h('div', { class: 'tabs', role: 'tablist' });
      tabs.forEach(function (t, i) {
        t.btn = h('button', { class: 'tab' + (i === 0 ? ' active' : ''), role: 'tab', onclick: function () { selectTab(i); } }, t.label);
        tabBar.appendChild(t.btn);
      });

      function selectTab(i) {
        tabs.forEach(function (t, k) {
          t.btn.classList.toggle('active', k === i);
          t.panel.hidden = k !== i;
        });
        // 两个页面共用同一个显示器预览
        tabs[i].panel.querySelector('.disp-preview').appendChild(monitor);
        refresh();
      }

      function refresh() {
        list.querySelectorAll('.xp-option').forEach(function (o) {
          o.classList.toggle('selected', o.getAttribute('data-id') === draft.wallpaper);
        });
        if (stopPreview) { stopPreview(); stopPreview = null; }
        screenEl.innerHTML = '';
        if (!saverTab.hidden && draft.saver !== 'none') {
          screenEl.style.background = '#000';
          screenEl.appendChild(previewCanvas);
          stopPreview = SAVERS[draft.saver].run(previewCanvas);
        } else {
          screenEl.style.background = wallpaperCss(draft.wallpaper, draft.color);
          screenEl.appendChild(h('div', { class: 'mon-taskbar' }));
        }
      }

      function apply() {
        XP.storage.set('wallpaper', draft.wallpaper);
        XP.storage.set('bgcolor', draft.color);
        XP.storage.set('saver', draft.saver);
        XP.storage.set('saver-wait', draft.wait);
        XP.applyWallpaper();
      }

      var root = h('div', { class: 'display-props' },
        tabBar,
        desktopTab,
        saverTab,
        h('div', { class: 'dialog-buttons' },
          h('button', { class: 'xp-btn', onclick: function () { apply(); win.close(); } }, '确定'),
          h('button', { class: 'xp-btn', onclick: function () { win.close(); } }, '取消'),
          h('button', { class: 'xp-btn', onclick: apply }, '应用(A)')));

      var win = XP.wm.open({
        id: 'display',
        title: '显示 属性',
        icon: XP.icon('display'),
        content: root,
        width: 'auto',
        height: 'auto',
        resizable: false,
        maximizable: false,
        className: 'dialog-window',
        onClose: function () { if (stopPreview) stopPreview(); }
      });
      refresh();
      return win;
    }
  });

  /* ---------- 运行 ---------- */
  var RUN = {
    notepad: 'notepad', mspaint: 'paint', winmine: 'minesweeper', cmd: 'cmd', command: 'cmd',
    iexplore: 'ie', explorer: 'computer', control: 'display', 'desk.cpl': 'display',
    about: 'about', blog: 'documents', readme: 'readme'
  };

  XP.registerApp('run', {
    title: '运行',
    icon: 'run',
    type: '系统',
    open: function () {
      var input = h('input', { class: 'xp-input', type: 'text', list: 'run-list', value: XP.storage.get('run-last', ''), 'aria-label': '打开' });
      var dl = h('datalist', { id: 'run-list' }, Object.keys(RUN).map(function (k) { return h('option', { value: k }); }));

      function exec() {
        var v = input.value.trim();
        if (!v) return;
        XP.storage.set('run-last', v);
        var key = RUN[v.toLowerCase().replace(/\.exe$/, '')];
        if (key) {
          win.close();
          XP.launch(key);
        } else if (/^https?:\/\//i.test(v)) {
          win.close();
          XP.openUrl(v);
        } else if (/^xp:\/\//i.test(v)) {
          win.close();
          XP.launch('ie', { url: v });
        } else {
          XP.msgbox({
            title: v,
            icon: 'error',
            message: '找不到文件“' + v + '”(或它的组件之一)。请确定路径和文件名是否正确，而且所需的库文件均可用。\n\n试试：notepad、mspaint、winmine、cmd、iexplore'
          });
        }
      }

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          exec();
        }
        if (e.key === 'Escape') win.close();
      });

      var root = h('div', { class: 'run-dialog' },
        h('div', { class: 'run-top' },
          h('img', { src: XP.icon('run'), alt: '' }),
          h('p', null, '请键入程序、文件夹、文档或 Internet 资源的名称，' + site.systemName + ' 将为您打开它。')),
        h('label', { class: 'run-open' }, h('span', null, '打开(O):'), input, dl),
        h('div', { class: 'dialog-buttons' },
          h('button', { class: 'xp-btn', onclick: exec }, '确定'),
          h('button', { class: 'xp-btn', onclick: function () { win.close(); } }, '取消'),
          h('button', { class: 'xp-btn', disabled: true }, '浏览(B)...')));

      var a = document.getElementById('desktop');
      var win = XP.wm.open({
        id: 'run',
        title: '运行',
        icon: XP.icon('run'),
        content: root,
        width: 'auto',
        height: 'auto',
        resizable: false,
        maximizable: false,
        minimizable: false,
        className: 'dialog-window',
        x: 8,
        y: Math.max(8, a.clientHeight - 200)
      });
      setTimeout(function () { input.focus(); input.select(); }, 0);
      return win;
    }
  });
})();
