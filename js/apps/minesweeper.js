/* 扫雷 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;

  var LEVELS = {
    beginner: { w: 9, h: 9, m: 10, name: '初级' },
    intermediate: { w: 16, h: 16, m: 40, name: '中级' },
    expert: { w: 30, h: 16, m: 99, name: '高级' }
  };

  /* 七段数码管 */
  var SEGS = {
    a: '1,0.5 12,0.5 10,2.5 3,2.5',
    b: '12.5,1 12.5,11 10.5,10 10.5,3',
    c: '12.5,12 12.5,22 10.5,20 10.5,13',
    d: '3,20.5 10,20.5 12,22.5 1,22.5',
    e: '0.5,12 2.5,13 2.5,20 0.5,22',
    f: '0.5,1 2.5,3 2.5,10 0.5,11',
    g: '1.5,11.5 3,10.5 10,10.5 11.5,11.5 10,12.5 3,12.5'
  };
  var DIGITS = {
    0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd',
    6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g'
  };

  function led(value) {
    var n = Math.max(-99, Math.min(999, value));
    var s = n < 0 ? '-' + XP.pad(-n) : ('00' + n).slice(-3);
    var out = '<svg viewBox="0 0 41 23" aria-hidden="true">';
    for (var i = 0; i < 3; i++) {
      var on = DIGITS[s[i]];
      out += '<g transform="translate(' + (i * 14 + 0.5) + ',0)">';
      Object.keys(SEGS).forEach(function (k) {
        out += '<polygon points="' + SEGS[k] + '" fill="' + (on.indexOf(k) >= 0 ? '#ff0000' : '#3a0000') + '"/>';
      });
      out += '</g>';
    }
    return out + '</svg>';
  }

  var FACES = {
    smile: '<circle cx="8.5" cy="8.5" r="7.5" fill="#ff0" stroke="#000"/><rect x="5" y="5.5" width="2" height="2"/><rect x="10" y="5.5" width="2" height="2"/><path d="M4.8 10.5q3.7 3.6 7.4 0" fill="none" stroke="#000" stroke-width="1.2"/>',
    ooh: '<circle cx="8.5" cy="8.5" r="7.5" fill="#ff0" stroke="#000"/><rect x="5" y="5" width="2" height="2.5"/><rect x="10" y="5" width="2" height="2.5"/><circle cx="8.5" cy="11.5" r="1.8" fill="none" stroke="#000" stroke-width="1.2"/>',
    dead: '<circle cx="8.5" cy="8.5" r="7.5" fill="#ff0" stroke="#000"/><path d="m4.8 4.8 2.6 2.6m0-2.6-2.6 2.6m4.8-2.6 2.6 2.6m0-2.6-2.6 2.6" stroke="#000" stroke-width="1.1"/><path d="M4.8 13q3.7-3.4 7.4 0" fill="none" stroke="#000" stroke-width="1.2"/>',
    cool: '<circle cx="8.5" cy="8.5" r="7.5" fill="#ff0" stroke="#000"/><path d="M2 6h13v1l-1 2.5h-4L9 7H8L7 9.5H3L2 7z"/><path d="M4.8 10.8q3.7 3.2 7.4 0" fill="none" stroke="#000" stroke-width="1.2"/>'
  };

  XP.registerApp('minesweeper', {
    title: '扫雷',
    icon: 'minesweeper',
    type: '游戏',
    open: function () {
      var level = XP.storage.get('ms-level', 'beginner');
      if (!LEVELS[level]) level = 'beginner';
      var L, cells, els, status, flags, opened, time, timer, pressed = null, longPress = null, longFired = false;

      var mineLed = h('div', { class: 'ms-led' });
      var timeLed = h('div', { class: 'ms-led' });
      var face = h('button', { class: 'ms-face', 'aria-label': '新游戏', title: '新游戏 (F2)' });
      var board = h('div', { class: 'ms-board', role: 'grid' });

      var root = h(
        'div', { class: 'ms', tabindex: '0' },
        XP.menubar([
          { label: '游戏(G)', items: function () {
            var items = [{ label: '开局(N)', shortcut: 'F2', action: newGame }, '-'];
            Object.keys(LEVELS).forEach(function (k) {
              items.push({ label: LEVELS[k].name + '(' + LEVELS[k].w + '×' + LEVELS[k].h + '，' + LEVELS[k].m + '雷)', checked: k === level, action: function () { setLevel(k); } });
            });
            items.push('-', { label: '扫雷英雄榜(T)...', action: showBest }, '-', { label: '退出(X)', action: function () { win.close(); } });
            return items;
          } },
          { label: '帮助(H)', items: [
            { label: '玩法(H)', action: function () {
              XP.msgbox({
                title: '扫雷 玩法', icon: 'minesweeper',
                message: '左键单击：翻开方块\n右键单击：插旗 / 拔旗（手机上长按）\n单击已翻开的数字：如果周围旗子数量正确，自动翻开其余方块\n\n翻开所有不是地雷的方块即可获胜！'
              });
            } },
            { label: '关于扫雷(A)', action: function () {
              XP.msgbox({ title: '关于扫雷', icon: 'minesweeper', message: '扫雷 · ' + XP.site.systemName + '\n第一步永远不会踩雷。' });
            } }
          ] }
        ]),
        h('div', { class: 'ms-frame' },
          h('div', { class: 'ms-header' }, mineLed, face, timeLed),
          board)
      );

      var win = XP.wm.open({
        id: 'minesweeper',
        title: '扫雷',
        icon: XP.icon('minesweeper'),
        content: root,
        width: 'auto',
        height: 'auto',
        resizable: false,
        maximizable: false,
        className: 'ms-window',
        onClose: function () { clearInterval(timer); }
      });

      function setFace(f) { face.innerHTML = '<svg viewBox="0 0 17 17">' + FACES[f] + '</svg>'; }
      function setLevel(k) {
        level = k;
        XP.storage.set('ms-level', k);
        newGame();
      }

      function newGame() {
        L = LEVELS[level];
        root.setAttribute('data-level', level);
        clearInterval(timer);
        status = 'ready';
        flags = 0;
        opened = 0;
        time = 0;
        cells = [];
        els = [];
        board.innerHTML = '';
        board.style.gridTemplateColumns = 'repeat(' + L.w + ', var(--ms-cell))';
        for (var i = 0; i < L.w * L.h; i++) {
          cells.push({ mine: false, n: 0, open: false, flag: false });
          var el = h('div', { class: 'ms-cell', 'data-i': i, role: 'gridcell' });
          els.push(el);
          board.appendChild(el);
        }
        setFace('smile');
        updateLeds();
      }

      function updateLeds() {
        mineLed.innerHTML = led(L.m - flags);
        timeLed.innerHTML = led(time);
      }

      function neighbors(i) {
        var x = i % L.w, y = Math.floor(i / L.w), out = [];
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            var nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < L.w && ny < L.h) out.push(ny * L.w + nx);
          }
        }
        return out;
      }

      function placeMines(safe) {
        var banned = {};
        banned[safe] = true;
        if (L.w * L.h - 9 >= L.m) neighbors(safe).forEach(function (n) { banned[n] = true; });
        var pool = [];
        for (var i = 0; i < cells.length; i++) if (!banned[i]) pool.push(i);
        for (var k = 0; k < L.m; k++) {
          var j = k + Math.floor(Math.random() * (pool.length - k));
          var t = pool[k]; pool[k] = pool[j]; pool[j] = t;
          cells[pool[k]].mine = true;
        }
        cells.forEach(function (c, idx) {
          c.n = neighbors(idx).filter(function (n) { return cells[n].mine; }).length;
        });
      }

      function paint(i) {
        var c = cells[i], el = els[i], cls = 'ms-cell';
        if (c.open) {
          cls += ' open';
          if (c.mine) cls += ' mine';
          else if (c.n) cls += ' n' + c.n;
          el.textContent = !c.mine && c.n ? c.n : '';
        } else if (c.flag) cls += ' flag';
        if (c.boom) cls += ' boom';
        if (c.wrong) cls += ' wrong';
        el.className = cls;
      }

      function reveal(i) {
        var c = cells[i];
        if (status === 'won' || status === 'lost' || c.open || c.flag) return;
        if (status === 'ready') {
          placeMines(i);
          status = 'playing';
          time = 1;
          updateLeds();
          timer = setInterval(function () {
            if (time < 999) time++;
            updateLeds();
          }, 1000);
        }
        if (c.mine) return lose(i);
        var stack = [i];
        while (stack.length) {
          var k = stack.pop(), cell = cells[k];
          if (cell.open || cell.flag) continue;
          cell.open = true;
          opened++;
          paint(k);
          if (cell.n === 0) neighbors(k).forEach(function (n) { if (!cells[n].open) stack.push(n); });
        }
        if (opened === cells.length - L.m) winGame();
      }

      function chord(i) {
        var c = cells[i];
        if (!c.open || !c.n) return;
        var ns = neighbors(i);
        var f = ns.filter(function (n) { return cells[n].flag; }).length;
        if (f !== c.n) return;
        ns.forEach(function (n) { if (status === 'playing') reveal(n); });
      }

      function toggleFlag(i) {
        var c = cells[i];
        if (c.open || status === 'won' || status === 'lost') return;
        c.flag = !c.flag;
        flags += c.flag ? 1 : -1;
        paint(i);
        updateLeds();
      }

      function lose(i) {
        status = 'lost';
        clearInterval(timer);
        cells.forEach(function (c, k) {
          if (c.mine && !c.flag) c.open = true;
          if (!c.mine && c.flag) c.wrong = true;
          if (k === i) c.boom = true;
          paint(k);
        });
        setFace('dead');
      }

      function winGame() {
        status = 'won';
        clearInterval(timer);
        cells.forEach(function (c, k) {
          if (c.mine && !c.flag) { c.flag = true; paint(k); }
        });
        flags = L.m;
        updateLeds();
        setFace('cool');
        var best = XP.storage.get('ms-best', {});
        var record = !best[level] || time < best[level];
        if (record) {
          best[level] = time;
          XP.storage.set('ms-best', best);
        }
        setTimeout(function () {
          XP.msgbox({
            title: '扫雷',
            icon: 'minesweeper',
            message: '恭喜！你用 ' + time + ' 秒完成了' + L.name + '。' + (record ? '\n新纪录！已记入扫雷英雄榜。' : '')
          });
        }, 200);
      }

      function showBest() {
        var best = XP.storage.get('ms-best', {});
        XP.msgbox({
          title: '扫雷英雄榜',
          icon: 'minesweeper',
          message: Object.keys(LEVELS).map(function (k) {
            return LEVELS[k].name + '：' + (best[k] ? best[k] + ' 秒' : '暂无记录');
          }).join('\n')
        });
      }

      /* ---------- 输入 ---------- */
      function cellIndex(e) {
        var el = e.target.closest && e.target.closest('.ms-cell');
        return el ? +el.getAttribute('data-i') : -1;
      }

      function setPressed(i) {
        if (pressed != null && els[pressed]) els[pressed].classList.remove('pressed');
        pressed = i;
        if (i != null && i >= 0 && !cells[i].open && !cells[i].flag) els[i].classList.add('pressed');
      }

      function busy() { return status === 'won' || status === 'lost'; }

      board.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      board.addEventListener('pointerdown', function (e) {
        var i = cellIndex(e);
        if (i < 0 || busy()) return;
        if (e.button === 2) {
          toggleFlag(i);
          return;
        }
        if (e.button !== 0) return;
        longFired = false;
        if (e.pointerType === 'touch') {
          clearTimeout(longPress);
          longPress = setTimeout(function () {
            longFired = true;
            setPressed(null);
            setFace('smile');
            toggleFlag(i);
            if (navigator.vibrate) navigator.vibrate(25);
          }, 380);
        }
        setPressed(i);
        setFace('ooh');
      });
      board.addEventListener('pointermove', function (e) {
        if (pressed == null || !(e.buttons & 1)) return;
        var i = cellIndex(e);
        if (i !== pressed) {
          clearTimeout(longPress);
          setPressed(i);
        }
      });
      board.addEventListener('pointerup', function (e) {
        clearTimeout(longPress);
        if (e.button !== 0 || pressed == null) return;
        var i = cellIndex(e);
        setPressed(null);
        if (!busy()) setFace('smile');
        if (longFired || i < 0) return;
        if (cells[i].open) chord(i);
        else reveal(i);
      });
      document.addEventListener('pointerup', function () {
        if (pressed != null) {
          setPressed(null);
          if (!busy()) setFace('smile');
        }
      });

      face.addEventListener('click', newGame);
      root.addEventListener('keydown', function (e) {
        if (e.key === 'F2') {
          e.preventDefault();
          newGame();
        }
      });

      newGame();
      root.focus();
      return win;
    }
  });
})();
