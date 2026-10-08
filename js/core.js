/* 核心工具：DOM 帮助函数、存储、Markdown、菜单、消息框、程序注册表 */
(function () {
  'use strict';

  var XP = (window.XP = window.XP || {});

  XP.site = window.SITE;
  XP.apps = {};

  XP.icon = function (name) {
    return 'assets/icons/' + name + '.svg';
  };

  /* 创建元素：XP.h('div', {class: 'a', onclick: fn}, child1, 'text', ...) */
  XP.h = function (tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };

  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) child.forEach(function (c) { append(el, c); });
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }

  XP.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  XP.isMobile = function () {
    return window.matchMedia('(max-width: 640px)').matches;
  };

  XP.storage = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem('xp:' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem('xp:' + key, JSON.stringify(value));
      } catch (e) { /* 隐私模式等情况下忽略 */ }
    }
  };

  XP.download = function (filename, blob) {
    var a = XP.h('a', { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  };

  XP.formatDate = function (d) {
    var week = ['日', '一', '二', '三', '四', '五', '六'];
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + week[d.getDay()];
  };

  XP.pad = function (n) {
    return (n < 10 ? '0' : '') + n;
  };

  /* ---------- 文章 ---------- */
  XP.posts = function () {
    return XP.site.posts.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    });
  };

  XP.post = function (id) {
    return XP.site.posts.filter(function (p) { return p.id === id; })[0];
  };

  XP.wordCount = function (text) {
    var cjk = (text.match(/[一-鿿]/g) || []).length;
    var words = (text.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
    return cjk + words;
  };

  /* ---------- 迷你 Markdown 渲染器 ---------- */
  function inline(s) {
    var codes = [];
    s = XP.esc(s).replace(/`([^`]+)`/g, function (_, c) {
      codes.push('<code>' + c + '</code>');
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    s = s
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, url) {
        var external = /^https?:/.test(url);
        return '<a href="' + url + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return codes[i]; });
  }

  function splitRow(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
  }

  XP.md = function (src) {
    var lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var m;
      if (/^\s*$/.test(line)) { i++; continue; }

      if ((m = line.match(/^```\s*(\S*)/))) {
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push('<pre><code' + (m[1] ? ' data-lang="' + XP.esc(m[1]) + '"' : '') + '>' + XP.esc(code.join('\n')) + '</code></pre>');
        continue;
      }
      if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
        out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>');
        i++;
        continue;
      }
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
        out.push('<hr>');
        i++;
        continue;
      }
      if (/^>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
        out.push('<blockquote>' + XP.md(quote.join('\n')) + '</blockquote>');
        continue;
      }
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-+/.test(lines[i + 1])) {
        var head = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
        out.push(
          '<table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>' + rows.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table>'
        );
        continue;
      }
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        var ordered = /^\s*\d+\./.test(line);
        var items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          items.push('<li>' + inline(lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, '')) + '</li>');
        }
        out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      var para = [];
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^(#{1,6}\s|```|>|\||\s*([-*+]|\d+\.)\s+)/.test(lines[i])
      ) {
        para.push(lines[i++]);
      }
      out.push('<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
    }
    return out.join('\n');
  };

  /* ---------- 弹出菜单（右键菜单、菜单栏下拉、开始菜单子菜单共用） ---------- */
  var openMenus = [];

  XP.closeMenus = function () {
    openMenus.forEach(function (m) { m.remove(); });
    openMenus = [];
    document.querySelectorAll('.menubar-item.open').forEach(function (b) { b.classList.remove('open'); });
  };

  /*
   * items: [{label, action, disabled, checked, bold, icon, items(子菜单)}, '-']
   * opts: {x, y, parent(子菜单时), onClose}
   */
  XP.popupMenu = function (items, x, y, opts) {
    opts = opts || {};
    if (!opts.parent) XP.closeMenus();
    var menu = XP.h('div', { class: 'popup-menu' + (opts.className ? ' ' + opts.className : ''), role: 'menu' });
    items.forEach(function (it) {
      if (it === '-') {
        menu.appendChild(XP.h('div', { class: 'menu-sep' }));
        return;
      }
      var row = XP.h(
        'div',
        {
          class: 'menu-item' + (it.disabled ? ' disabled' : '') + (it.bold ? ' bold' : '') + (it.items ? ' has-sub' : ''),
          role: 'menuitem',
          'aria-disabled': it.disabled ? 'true' : null
        },
        XP.h('span', { class: 'menu-check' }, it.checked ? '✓' : it.radio ? '●' : ''),
        it.icon ? XP.h('img', { class: 'menu-icon', src: it.icon, alt: '' }) : null,
        XP.h('span', { class: 'menu-label' }, it.label),
        it.shortcut ? XP.h('span', { class: 'menu-shortcut' }, it.shortcut) : null,
        it.items ? XP.h('span', { class: 'menu-arrow' }, '▶') : null
      );
      var sub = null;
      row.addEventListener('pointerenter', function () {
        menu.querySelectorAll('.menu-item.sub-open').forEach(function (r) {
          if (r !== row) {
            r.classList.remove('sub-open');
            if (r._sub) { r._sub.remove(); r._sub = null; }
          }
        });
        if (it.items && !it.disabled && !row._sub) {
          var r = row.getBoundingClientRect();
          sub = XP.popupMenu(it.items, r.right - 3, r.top - 3, { parent: menu });
          row._sub = sub;
          row.classList.add('sub-open');
        }
      });
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        if (it.disabled || it.items) return;
        XP.closeMenus();
        if (it.action) it.action();
      });
      menu.appendChild(row);
    });
    menu.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    menu.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.body.appendChild(menu);
    openMenus.push(menu);

    // 保证菜单留在屏幕内
    var w = menu.offsetWidth;
    var hgt = menu.offsetHeight;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (opts.bottom != null) y = opts.bottom - hgt;
    if (x + w > vw) x = opts.parent ? x - w - opts.parent.offsetWidth + 6 : vw - w - 2;
    if (opts.parent && x < 0) x = Math.max(0, vw - w);
    if (y + hgt > vh) y = Math.max(0, vh - hgt - 2);
    menu.style.left = Math.max(0, x) + 'px';
    menu.style.top = y + 'px';
    return menu;
  };

  document.addEventListener('pointerdown', function () { XP.closeMenus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') XP.closeMenus();
  });
  window.addEventListener('blur', function () { XP.closeMenus(); });

  /* 窗口菜单栏：[{label:'文件(F)', items:[...]}] */
  XP.menubar = function (menus) {
    var bar = XP.h('div', { class: 'menubar', role: 'menubar' });
    var active = false;
    menus.forEach(function (m) {
      var btn = XP.h('div', { class: 'menubar-item', role: 'menuitem' }, m.label);
      function open() {
        var r = btn.getBoundingClientRect();
        var items = typeof m.items === 'function' ? m.items() : m.items;
        XP.popupMenu(items, r.left, r.bottom);
        btn.classList.add('open');
        active = true;
      }
      btn.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        if (XP.hideStartMenu) XP.hideStartMenu();
        if (btn.classList.contains('open')) {
          XP.closeMenus();
          active = false;
        } else open();
      });
      btn.addEventListener('pointerenter', function () {
        if (active && document.querySelector('.popup-menu') && !btn.classList.contains('open')) open();
      });
      bar.appendChild(btn);
    });
    return bar;
  };

  /* ---------- 消息框 ---------- */
  XP.msgbox = function (opts) {
    return new Promise(function (resolve) {
      var buttons = opts.buttons || ['确定'];
      var win;
      var done = false;
      function finish(i) {
        if (done) return;
        done = true;
        resolve(i);
        win.close();
      }
      var btnRow = XP.h('div', { class: 'msgbox-buttons' });
      buttons.forEach(function (label, i) {
        btnRow.appendChild(XP.h('button', { class: 'xp-btn', onclick: function () { finish(i); } }, label));
      });
      var body = XP.h(
        'div',
        { class: 'msgbox' },
        XP.h(
          'div',
          { class: 'msgbox-main' },
          opts.icon ? XP.h('img', { class: 'msgbox-icon', src: XP.icon(opts.icon), alt: '' }) : null,
          XP.h('div', { class: 'msgbox-text' }, opts.message)
        ),
        btnRow
      );
      win = XP.wm.open({
        title: opts.title || XP.site.systemName,
        content: body,
        width: 'auto',
        height: 'auto',
        resizable: false,
        minimizable: false,
        maximizable: false,
        taskbar: false,
        center: true,
        modal: true,
        className: 'msgbox-window',
        onClose: function () { if (!done) { done = true; resolve(-1); } }
      });
      // 延迟聚焦，避免触发消息框的那次回车键又“按下”了确定按钮
      var first = btnRow.querySelector('button');
      if (first) setTimeout(function () { first.focus(); }, 0);
    });
  };

  /* ---------- 程序注册与启动 ---------- */
  XP.registerApp = function (key, def) {
    def.key = key;
    XP.apps[key] = def;
  };

  XP.launch = function (key, args) {
    var app = XP.apps[key];
    if (!app) {
      XP.msgbox({
        title: key,
        icon: 'error',
        message: '找不到文件“' + key + '”。请确定文件名是否正确后，再试一次。'
      });
      return null;
    }
    return app.open(args || {});
  };

  XP.openUrl = function (url) {
    window.open(url, '_blank', 'noopener');
  };
})();
