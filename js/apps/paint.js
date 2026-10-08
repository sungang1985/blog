/* 画图 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;

  var PALETTE = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'
  ];

  var TOOLS = [
    { id: 'pencil', name: '铅笔', svg: '<path d="M4 20l1.5-5L16 4.5l3.5 3.5L9 18.5z" fill="#f2c94c" stroke="#7a5a10"/><path d="M4 20l1.5-5 3.5 3.5z" fill="#f5deb3" stroke="#7a5a10"/><path d="M4 20l.8-2.6 1.8 1.8z"/>' },
    { id: 'brush', name: '刷子', svg: '<path d="M14 3l7 7-6 3-4-4z" fill="#b0702a" stroke="#5a3510"/><path d="M11 9l4 4-3 2c-2 4-6 5-9 5 2-2 1-5 3-7z" fill="#3a6fd6" stroke="#1a3f80"/>' },
    { id: 'eraser', name: '橡皮/彩色橡皮擦', svg: '<path d="M3 15l8-8 7 7-5 5H7z" fill="#f4a3b5" stroke="#8a3b4d"/><path d="M11 7l4-4 7 7-4 4z" fill="#fff" stroke="#8a3b4d"/>' },
    { id: 'fill', name: '用颜色填充', svg: '<path d="M4 11l7-7 8 8-7 7z" fill="#e8e8e8" stroke="#444"/><path d="M19 12c2 3 2 6 0 6s-2-3 0-6z" fill="#2a6fe0"/><path d="M4 11h15" stroke="#2a6fe0" stroke-width="2"/>' },
    { id: 'picker', name: '取色', svg: '<path d="M4 20l2-5 8-8 3 3-8 8z" fill="#ddd" stroke="#444"/><path d="M14 7l3-3c1-1 3 1 2 2l-2 2" fill="#555" stroke="#222"/>' },
    { id: 'spray', name: '喷枪', svg: '<rect x="9" y="9" width="8" height="12" rx="1" fill="#c33" stroke="#611"/><rect x="11" y="6" width="4" height="3" fill="#888"/><g fill="#333"><circle cx="5" cy="5" r="1"/><circle cx="8" cy="3" r="1"/><circle cx="4" cy="9" r="1"/><circle cx="7" cy="7" r="1"/></g>' },
    { id: 'line', name: '直线', svg: '<path d="M4 20 20 4" stroke="#000" stroke-width="2"/>' },
    { id: 'rect', name: '矩形', svg: '<rect x="4" y="6" width="16" height="12" fill="none" stroke="#000" stroke-width="2"/>' },
    { id: 'ellipse', name: '椭圆', svg: '<ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="#000" stroke-width="2"/>' },
    { id: 'frect', name: '实心矩形', svg: '<rect x="4" y="6" width="16" height="12" fill="#8a8a8a" stroke="#000" stroke-width="2"/>' }
  ];

  var SIZES = [1, 3, 5, 8];

  XP.registerApp('paint', {
    title: '画图',
    icon: 'paint',
    type: '应用程序',
    open: function () {
      var W = 640, H = 420;
      var tool = 'pencil', size = 3, primary = '#000000', secondary = '#ffffff';
      var undo = [], redo = [];

      var canvas = h('canvas', { class: 'paint-canvas', width: W, height: H });
      var overlay = h('canvas', { class: 'paint-overlay', width: W, height: H });
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      var octx = overlay.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);

      var coords = h('span', { class: 'sb-cell paint-coords' });
      var toolBox = h('div', { class: 'paint-tools' });
      var sizeBox = h('div', { class: 'paint-sizes' });
      var swPrimary = h('div', { class: 'sw-primary' });
      var swSecondary = h('div', { class: 'sw-secondary' });
      var palette = h('div', { class: 'paint-palette' });

      TOOLS.forEach(function (t) {
        var b = h('button', {
          class: 'paint-tool', title: t.name, 'aria-label': t.name, 'data-tool': t.id,
          html: '<svg viewBox="0 0 24 24">' + t.svg + '</svg>',
          onclick: function () { tool = t.id; syncUI(); }
        });
        toolBox.appendChild(b);
      });
      SIZES.forEach(function (s) {
        sizeBox.appendChild(h('button', {
          class: 'paint-size', 'data-size': s, title: s + ' 像素', 'aria-label': s + ' 像素',
          onclick: function () { size = s; syncUI(); }
        }, h('span', { style: { height: s + 'px' } })));
      });
      PALETTE.forEach(function (c) {
        var sw = h('button', { class: 'paint-color', style: { background: c }, title: c, 'aria-label': c });
        sw.addEventListener('click', function () { primary = c; syncUI(); });
        sw.addEventListener('contextmenu', function (e) { e.preventDefault(); secondary = c; syncUI(); });
        palette.appendChild(sw);
      });

      function syncUI() {
        toolBox.querySelectorAll('.paint-tool').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-tool') === tool);
        });
        sizeBox.querySelectorAll('.paint-size').forEach(function (b) {
          b.classList.toggle('active', +b.getAttribute('data-size') === size);
        });
        sizeBox.style.visibility = /pencil|fill|picker/.test(tool) ? 'hidden' : '';
        swPrimary.style.background = primary;
        swSecondary.style.background = secondary;
        overlay.style.cursor = tool === 'fill' || tool === 'picker' ? 'cell' : 'crosshair';
      }

      function snapshot() {
        undo.push(ctx.getImageData(0, 0, W, H));
        if (undo.length > 30) undo.shift();
        redo = [];
      }

      function doUndo() {
        if (!undo.length) return;
        redo.push(ctx.getImageData(0, 0, W, H));
        ctx.putImageData(undo.pop(), 0, 0);
      }

      function doRedo() {
        if (!redo.length) return;
        undo.push(ctx.getImageData(0, 0, W, H));
        ctx.putImageData(redo.pop(), 0, 0);
      }

      function clearAll() {
        snapshot();
        ctx.fillStyle = secondary;
        ctx.fillRect(0, 0, W, H);
      }

      /* ---------- 绘图 ---------- */
      function plot(c, x, y, s) {
        c.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
      }

      // Bresenham 直线，保证像素清晰
      function pixelLine(c, x0, y0, x1, y1, s) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
        var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
        for (;;) {
          plot(c, x0, y0, s);
          if (x0 === x1 && y0 === y1) break;
          var e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      }

      function brushLine(c, x0, y0, x1, y1, color, s) {
        c.strokeStyle = color;
        c.lineWidth = s + 1;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
      }

      function spray(x, y, color) {
        var r = size * 3 + 4;
        ctx.fillStyle = color;
        for (var i = 0; i < r * 1.5; i++) {
          var a = Math.random() * Math.PI * 2, d = Math.random() * r;
          ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 1, 1);
        }
      }

      function hexToRgb(hex) {
        var n = parseInt(hex.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      }

      function floodFill(x, y, color) {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        var img = ctx.getImageData(0, 0, W, H), d = img.data;
        var at = (y * W + x) * 4;
        var tr = d[at], tg = d[at + 1], tb = d[at + 2], ta = d[at + 3];
        var rgb = hexToRgb(color);
        if (tr === rgb[0] && tg === rgb[1] && tb === rgb[2] && ta === 255) return;
        var stack = [x, y];
        function match(p) { return d[p] === tr && d[p + 1] === tg && d[p + 2] === tb && d[p + 3] === ta; }
        while (stack.length) {
          var py = stack.pop(), px = stack.pop();
          var p = (py * W + px) * 4;
          while (px >= 0 && match(p)) { px--; p -= 4; }
          px++; p += 4;
          var up = false, down = false;
          while (px < W && match(p)) {
            d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255;
            if (py > 0) {
              var u = match(p - W * 4);
              if (u && !up) { stack.push(px, py - 1); up = true; } else if (!u) up = false;
            }
            if (py < H - 1) {
              var dn = match(p + W * 4);
              if (dn && !down) { stack.push(px, py + 1); down = true; } else if (!dn) down = false;
            }
            px++; p += 4;
          }
        }
        ctx.putImageData(img, 0, 0);
      }

      function shape(c, kind, x0, y0, x1, y1, color, fill) {
        var s = size;
        c.strokeStyle = color;
        c.fillStyle = fill || color;
        c.lineWidth = s;
        var off = s % 2 ? 0.5 : 0;
        if (kind === 'line') {
          pixelLine(c, x0, y0, x1, y1, s);
        } else if (kind === 'rect' || kind === 'frect') {
          var l = Math.min(x0, x1) + off, t = Math.min(y0, y1) + off;
          var w = Math.abs(x1 - x0), ht = Math.abs(y1 - y0);
          if (kind === 'frect') {
            c.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, ht);
          }
          c.strokeRect(l, t, w, ht);
        } else if (kind === 'ellipse') {
          c.beginPath();
          c.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.max(1, Math.abs(x1 - x0) / 2), Math.max(1, Math.abs(y1 - y0) / 2), 0, 0, Math.PI * 2);
          c.stroke();
        }
      }

      function pos(e) {
        var r = overlay.getBoundingClientRect();
        return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
      }

      var drag = null;
      overlay.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      overlay.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 && e.button !== 2) return;
        e.preventDefault();
        var p = pos(e);
        var color = e.button === 2 ? secondary : primary;
        var other = e.button === 2 ? primary : secondary;
        if (tool === 'picker') {
          var px = ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
          var hex = '#' + [px[0], px[1], px[2]].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
          if (e.button === 2) secondary = hex; else primary = hex;
          syncUI();
          return;
        }
        snapshot();
        if (tool === 'fill') {
          floodFill(p.x, p.y, color);
          return;
        }
        overlay.setPointerCapture(e.pointerId);
        drag = { x: p.x, y: p.y, lx: p.x, ly: p.y, color: color, other: other };
        stroke(p);
        if (tool === 'spray') {
          drag.timer = setInterval(function () { spray(drag.lx, drag.ly, drag.color); }, 30);
        }
      });

      function stroke(p) {
        ctx.fillStyle = drag.color;
        if (tool === 'pencil') pixelLine(ctx, drag.lx, drag.ly, p.x, p.y, 1);
        else if (tool === 'brush') brushLine(ctx, drag.lx, drag.ly, p.x, p.y, drag.color, size);
        else if (tool === 'eraser') {
          ctx.fillStyle = secondary;
          pixelLine(ctx, drag.lx, drag.ly, p.x, p.y, size * 3 + 2);
        } else if (tool === 'spray') spray(p.x, p.y, drag.color);
        else {
          octx.clearRect(0, 0, W, H);
          shape(octx, tool, drag.x, drag.y, p.x, p.y, drag.color, drag.other);
        }
        drag.lx = p.x;
        drag.ly = p.y;
      }

      overlay.addEventListener('pointermove', function (e) {
        var p = pos(e);
        coords.textContent = Math.floor(p.x) + ',' + Math.floor(p.y);
        if (drag) stroke(p);
      });
      overlay.addEventListener('pointerleave', function () { coords.textContent = ''; });

      function end(e) {
        if (!drag) return;
        clearInterval(drag.timer);
        if (/line|rect|ellipse|frect/.test(tool)) {
          var p = pos(e);
          octx.clearRect(0, 0, W, H);
          shape(ctx, tool, drag.x, drag.y, p.x, p.y, drag.color, drag.other);
        }
        drag = null;
      }
      overlay.addEventListener('pointerup', end);
      overlay.addEventListener('pointercancel', end);

      var root = h(
        'div', { class: 'paint', tabindex: '0' },
        XP.menubar([
          { label: '文件(F)', items: [
            { label: '新建(N)', shortcut: 'Ctrl+N', action: function () {
              snapshot();
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, W, H);
            } },
            { label: '另存为(A)...', action: function () {
              canvas.toBlob(function (b) { XP.download('未命名.png', b); });
            } },
            '-',
            { label: '退出(X)', action: function () { win.close(); } }
          ] },
          { label: '编辑(E)', items: function () {
            return [
              { label: '撤销(U)', shortcut: 'Ctrl+Z', disabled: !undo.length, action: doUndo },
              { label: '重复(R)', shortcut: 'Ctrl+Y', disabled: !redo.length, action: doRedo }
            ];
          } },
          { label: '图像(I)', items: [
            { label: '水平翻转', action: function () { transform(-1, 1); } },
            { label: '垂直翻转', action: function () { transform(1, -1); } },
            { label: '反色(I)', shortcut: 'Ctrl+I', action: invert },
            { label: '清除图像(C)', shortcut: 'Ctrl+Shift+N', action: clearAll }
          ] },
          { label: '帮助(H)', items: [
            { label: '关于画图(A)', action: function () {
              XP.msgbox({ title: '关于画图', icon: 'paint', message: '画图 · ' + XP.site.systemName + '\n左键使用前景色，右键使用背景色。\n画完可以通过“文件 → 另存为”保存成 PNG。' });
            } }
          ] }
        ]),
        h('div', { class: 'paint-main' },
          h('div', { class: 'paint-side' }, toolBox, sizeBox),
          h('div', { class: 'paint-area' }, h('div', { class: 'paint-stage' }, canvas, overlay))),
        h('div', { class: 'paint-bottom' },
          h('div', { class: 'paint-current', title: '左键：前景色　右键：背景色' }, swSecondary, swPrimary),
          palette),
        h('div', { class: 'statusbar' },
          h('span', { class: 'sb-cell sb-grow' }, '左键单击颜色设置前景色，右键单击设置背景色。'),
          coords)
      );

      function transform(sx, sy) {
        snapshot();
        var tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = H;
        tmp.getContext('2d').drawImage(canvas, 0, 0);
        ctx.save();
        ctx.setTransform(sx, 0, 0, sy, sx < 0 ? W : 0, sy < 0 ? H : 0);
        ctx.drawImage(tmp, 0, 0);
        ctx.restore();
      }

      function invert() {
        snapshot();
        var img = ctx.getImageData(0, 0, W, H);
        for (var i = 0; i < img.data.length; i += 4) {
          img.data[i] = 255 - img.data[i];
          img.data[i + 1] = 255 - img.data[i + 1];
          img.data[i + 2] = 255 - img.data[i + 2];
        }
        ctx.putImageData(img, 0, 0);
      }

      root.addEventListener('keydown', function (e) {
        if (!(e.ctrlKey || e.metaKey)) return;
        var k = e.key.toLowerCase();
        if (k === 'z') { e.preventDefault(); doUndo(); }
        else if (k === 'y') { e.preventDefault(); doRedo(); }
        else if (k === 'i') { e.preventDefault(); invert(); }
      });

      var win = XP.wm.open({
        id: 'paint',
        title: '未命名 - 画图',
        icon: XP.icon('paint'),
        content: root,
        width: 780,
        height: 600,
        minWidth: 360,
        minHeight: 300
      });
      syncUI();
      return win;
    }
  });
})();
