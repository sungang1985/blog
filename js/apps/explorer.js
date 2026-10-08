/* 资源管理器风格的程序：我的电脑、关于我、我的文章、我的项目、回收站，以及文章阅读器（写字板） */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;
  var site = XP.site;

  var TB = {
    back: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3aa83a" stroke="#1d6b1d"/><path d="M13 6.5 7.5 12l5.5 5.5V14h4v-4h-4z" fill="#fff"/></svg>',
    forward: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3aa83a" stroke="#1d6b1d"/><path d="M11 6.5 16.5 12 11 17.5V14H7v-4h4z" fill="#fff"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M2 7h7l2 2h10v11H2z" fill="#f5c84b" stroke="#b8860b"/><path d="M12 10l-4 4h2.5v4h3v-4H16z" fill="#2e9e2e"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="#d8ecff" stroke="#355d9b" stroke-width="2"/><path d="m14.5 14.5 6 6" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/></svg>',
    folders: '<svg viewBox="0 0 24 24"><path d="M3 5h6l2 2h10v12H3z" fill="#f5c84b" stroke="#b8860b"/><path d="M3 10h18" stroke="#b8860b"/></svg>',
    views: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" fill="#4d8fe0" stroke="#2556a8"/><rect x="13" y="3" width="8" height="8" fill="#f2b84b" stroke="#a87010"/><rect x="3" y="13" width="8" height="8" fill="#5bbf5b" stroke="#2c7d2c"/><rect x="13" y="13" width="8" height="8" fill="#e0614d" stroke="#9c2f1f"/></svg>',
    go: '<svg viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="3" fill="#3aa83a" stroke="#1d6b1d"/><path d="M8 5l6 5-6 5z" fill="#fff"/></svg>'
  };

  /* ---------- 回收站状态 ---------- */
  var bin = (site.recycleBin || []).slice();

  /* ---------- 位置定义 ---------- */
  var LOC = {
    computer: { title: '我的电脑', icon: 'computer', path: '我的电脑' },
    about: { title: '关于我', icon: 'user', path: '我的电脑\\关于我', parent: 'computer' },
    documents: { title: '我的文章', icon: 'documents', path: '我的电脑\\我的文章', parent: 'computer', list: true },
    projects: { title: '我的项目', icon: 'folder', path: '我的电脑\\我的项目', parent: 'computer', list: true },
    recycle: { title: '回收站', icon: function () { return bin.length ? 'recycle-full' : 'recycle-empty'; }, path: '回收站', parent: 'computer', list: true }
  };

  function locIcon(key) {
    var i = LOC[key].icon;
    return XP.icon(typeof i === 'function' ? i() : i);
  }

  function otherPlaces(current) {
    return {
      title: '其他位置',
      links: ['computer', 'about', 'documents', 'projects', 'recycle']
        .filter(function (k) { return k !== current; })
        .map(function (k) { return { label: LOC[k].title, icon: locIcon(k), nav: k }; })
        .concat([{ label: '控制面板', icon: XP.icon('display'), action: function () { XP.launch('display'); } }])
    };
  }

  function postItems() {
    return XP.posts().map(function (p) {
      return {
        icon: XP.icon('document'),
        name: p.title,
        desc: p.date,
        meta: (p.tags || []).join('、'),
        cols: [p.title, p.date, (p.tags || []).join('、'), XP.wordCount(p.content) + ' 字'],
        search: p.title + ' ' + p.summary + ' ' + p.content + ' ' + (p.tags || []).join(' '),
        post: p
      };
    });
  }

  function projectItems() {
    return site.projects.map(function (p) {
      return {
        icon: XP.icon('project'),
        name: p.name,
        desc: p.desc,
        meta: (p.tags || []).join(' · '),
        cols: [p.name, (p.tags || []).join(' · '), p.url.replace(/^https?:\/\//, '')],
        search: p.name + ' ' + p.desc + ' ' + (p.tags || []).join(' '),
        project: p
      };
    });
  }

  function binItems() {
    return bin.map(function (f) {
      return {
        icon: XP.icon(/\.exe$/.test(f.name) ? 'program' : /\.lnk$/.test(f.name) ? 'shortcut' : 'text'),
        name: f.name,
        desc: f.size,
        meta: '原位置：C:\\我的心里',
        cols: [f.name, 'C:\\我的心里', f.size],
        search: f.name,
        file: f
      };
    });
  }

  function detailsPanel(rows) {
    return {
      title: '详细信息',
      html: rows.filter(Boolean).map(function (r, i) {
        return i === 0 ? '<b>' + XP.esc(r) + '</b>' : XP.esc(r);
      }).join('<br>')
    };
  }

  /* ---------- 资源管理器窗口 ---------- */
  var explorers = [];

  function openExplorer(loc) {
    for (var i = 0; i < explorers.length; i++) {
      if (explorers[i].loc === loc) {
        var w = explorers[i].win;
        if (w.minimized) w.restore();
        w.focus();
        return w;
      }
    }
    return createExplorer(loc);
  }

  function createExplorer(startLoc) {
    var ex = { loc: startLoc, history: [startLoc], pos: 0, view: 'tiles', selected: null, filter: '', searching: false };

    var backBtn = tbButton('back', '后退', function () { go(-1); }, true);
    var fwdBtn = tbButton('forward', '', function () { go(1); });
    var upBtn = tbButton('up', '', function () {
      var p = LOC[ex.loc].parent;
      if (p) navigate(p);
    });
    var searchBtn = tbButton('search', '搜索', function () {
      ex.searching = !ex.searching;
      if (!ex.searching) ex.filter = '';
      render();
    }, true);
    var viewBtn = tbButton('views', '', function (e) {
      var r = viewBtn.getBoundingClientRect();
      XP.popupMenu([
        { label: '平铺(S)', radio: ex.view === 'tiles', action: function () { ex.view = 'tiles'; render(); } },
        { label: '详细信息(D)', radio: ex.view === 'details', action: function () { ex.view = 'details'; render(); } }
      ], r.left, r.bottom);
      e.stopPropagation();
    });
    viewBtn.classList.add('has-drop');
    viewBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

    var toolbar = h(
      'div', { class: 'ex-toolbar' },
      backBtn, fwdBtn, upBtn, h('span', { class: 'tb-sep' }),
      searchBtn,
      tbButton('folders', '文件夹', function () {
        XP.msgbox({ title: '文件夹', icon: 'info', message: '这台电脑的文件夹不多，左侧的“其他位置”已经全部列出来啦。' });
      }, true),
      h('span', { class: 'tb-sep' }),
      viewBtn
    );

    var addrIcon = h('img', { src: '', alt: '' });
    var addrText = h('span', { class: 'addr-text' });
    var addrBox = h('div', { class: 'addr-box', tabindex: '0' }, addrIcon, addrText, h('span', { class: 'addr-drop' }));
    addrBox.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      var r = addrBox.getBoundingClientRect();
      var m = XP.popupMenu(Object.keys(LOC).map(function (k) {
        return { label: LOC[k].path, icon: locIcon(k), action: function () { navigate(k); } };
      }), r.left, r.bottom);
      m.style.minWidth = r.width + 'px';
    });
    var address = h(
      'div', { class: 'ex-address' },
      h('span', { class: 'addr-label' }, '地址(D)'),
      addrBox,
      h('button', { class: 'addr-go', onclick: function () { render(); } }, h('span', { html: TB.go }), '转到')
    );

    var side = h('div', { class: 'ex-side' });
    var content = h('div', { class: 'ex-content selectable', tabindex: '-1' });
    var status = h('div', { class: 'statusbar' });

    var root = h(
      'div', { class: 'explorer' },
      XP.menubar([
        { label: '文件(F)', items: function () {
          return [
            { label: '打开(O)', disabled: !ex.selected, action: function () { openItem(ex.selected); } },
            '-',
            { label: '关闭(C)', action: function () { win.close(); } }
          ];
        } },
        { label: '编辑(E)', items: [
          { label: '全选(A)', disabled: true, shortcut: 'Ctrl+A' }
        ] },
        { label: '查看(V)', items: function () {
          return [
            { label: '平铺(S)', radio: ex.view === 'tiles', action: function () { ex.view = 'tiles'; render(); } },
            { label: '详细信息(D)', radio: ex.view === 'details', action: function () { ex.view = 'details'; render(); } },
            '-',
            { label: '刷新(R)', shortcut: 'F5', action: render }
          ];
        } },
        { label: '收藏(A)', items: site.links.map(function (l) {
          return { label: l.name, icon: XP.icon('ie-page'), action: function () { XP.openUrl(l.url); } };
        }) },
        { label: '工具(T)', items: [
          { label: '文件夹选项(O)...', action: function () { XP.launch('display'); } }
        ] },
        { label: '帮助(H)', items: [
          { label: '关于本站(A)', action: function () { XP.launch('ie', { url: 'xp://help' }); } }
        ] }
      ]),
      toolbar,
      address,
      h('div', { class: 'ex-main' }, side, content),
      status
    );

    var win = XP.wm.open({
      title: LOC[startLoc].title,
      icon: locIcon(startLoc),
      content: root,
      width: 720,
      height: 480,
      minWidth: 320,
      minHeight: 220,
      className: 'explorer-window',
      onClose: function () {
        explorers = explorers.filter(function (e) { return e !== ex; });
      }
    });
    ex.win = win;
    ex.render = render;
    explorers.push(ex);

    content.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('.ex-item')) select(null);
    });

    function navigate(loc) {
      if (loc === ex.loc) return;
      ex.history = ex.history.slice(0, ex.pos + 1);
      ex.history.push(loc);
      ex.pos = ex.history.length - 1;
      ex.loc = loc;
      reset();
    }

    function go(d) {
      var p = ex.pos + d;
      if (p < 0 || p >= ex.history.length) return;
      ex.pos = p;
      ex.loc = ex.history[p];
      reset();
    }

    function reset() {
      ex.selected = null;
      ex.filter = '';
      ex.searching = false;
      content.scrollTop = 0;
      render();
    }

    function select(item, el) {
      ex.selected = item;
      content.querySelectorAll('.ex-item.selected').forEach(function (n) { n.classList.remove('selected'); });
      if (el) el.classList.add('selected');
      renderSide();
      renderStatus();
    }

    function openItem(item) {
      if (!item) return;
      if (item.nav) navigate(item.nav);
      else if (item.post) XP.launch('reader', { id: item.post.id });
      else if (item.project) XP.openUrl(item.project.url);
      else if (item.file) {
        XP.msgbox({
          title: item.file.name,
          icon: 'warning',
          message: '无法打开回收站中的项目。\n要使用此项目，请先还原它……不过还是别还原了吧。'
        });
      } else if (item.action) item.action();
    }

    function currentItems() {
      var items = ex.loc === 'documents' ? postItems() : ex.loc === 'projects' ? projectItems() : binItems();
      if (ex.filter) {
        var q = ex.filter.toLowerCase();
        items = items.filter(function (it) { return it.search.toLowerCase().indexOf(q) >= 0; });
      }
      return items;
    }

    function render() {
      var L = LOC[ex.loc];
      win.setTitle(ex.filter ? '搜索结果 - ' + L.title : L.title);
      win.setIcon(locIcon(ex.loc));
      addrIcon.src = locIcon(ex.loc);
      addrText.textContent = L.path;
      backBtn.disabled = ex.pos <= 0;
      fwdBtn.disabled = ex.pos >= ex.history.length - 1;
      upBtn.disabled = !L.parent;
      searchBtn.classList.toggle('on', ex.searching);
      searchBtn.disabled = !L.list;
      viewBtn.disabled = !L.list;

      content.innerHTML = '';
      content.className = 'ex-content selectable loc-' + ex.loc;
      if (ex.loc === 'computer') renderComputer();
      else if (ex.loc === 'about') renderAbout();
      else renderList(currentItems());
      renderSide();
      renderStatus();
    }

    /* 我的电脑：文件夹 + 用“硬盘”展示技能 */
    function renderComputer() {
      content.appendChild(h('h3', { class: 'ex-group' }, '在这台计算机上存储的文件'));
      var folders = h('div', { class: 'ex-tiles' });
      ['documents', 'projects', 'about', 'recycle'].forEach(function (k) {
        folders.appendChild(tile({
          icon: locIcon(k),
          name: LOC[k].title,
          desc: k === 'documents' ? site.posts.length + ' 篇文章' : k === 'projects' ? site.projects.length + ' 个项目' : k === 'recycle' ? bin.length + ' 个对象' : '个人资料',
          nav: k
        }));
      });
      content.appendChild(folders);

      content.appendChild(h('h3', { class: 'ex-group' }, '硬盘（技能）'));
      var drives = h('div', { class: 'ex-tiles' });
      site.owner.skills.forEach(function (s, i) {
        var letter = String.fromCharCode(67 + i);
        var t = tile({
          icon: XP.icon('drive'),
          name: s.name + ' (' + letter + ':)',
          desc: '熟练度 ' + s.level + '%',
          skill: s,
          action: function () {
            XP.msgbox({
              title: s.name + ' (' + letter + ':) 属性',
              icon: 'drive',
              message: '类型：技能\n熟练度：' + s.level + '%\n剩余空间：' + (100 - s.level) + '%（还在继续学习中）'
            });
          }
        });
        t.querySelector('.ex-item-text').appendChild(h('div', { class: 'drive-bar' }, h('span', { style: { width: s.level + '%' } })));
        drives.appendChild(t);
      });
      content.appendChild(drives);

      content.appendChild(h('h3', { class: 'ex-group' }, '其他'));
      var other = h('div', { class: 'ex-tiles' });
      other.appendChild(tile({ icon: XP.icon('display'), name: '控制面板', desc: '更换桌面壁纸、屏幕保护程序', action: function () { XP.launch('display'); } }));
      other.appendChild(tile({ icon: XP.icon('ie'), name: '博客主页', desc: '用 Internet Explorer 浏览', action: function () { XP.launch('ie'); } }));
      content.appendChild(other);
    }

    function renderAbout() {
      var o = site.owner;
      var wrap = h('div', { class: 'about' });
      wrap.appendChild(h(
        'div', { class: 'about-card' },
        h('img', { class: 'about-avatar', src: o.avatar, alt: o.name }),
        h(
          'div', null,
          h('h1', null, o.name),
          h('p', { class: 'about-title' }, o.title),
          o.location ? h('p', { class: 'about-meta' }, '所在地：' + o.location) : null,
          o.motto ? h('p', { class: 'about-motto' }, '“' + o.motto + '”') : null
        )
      ));
      wrap.appendChild(h('h3', { class: 'ex-group' }, '个人简介'));
      wrap.appendChild(h('div', { class: 'about-bio' }, o.bio.map(function (p) { return h('p', null, p); })));
      wrap.appendChild(h('h3', { class: 'ex-group' }, '技能'));
      wrap.appendChild(h('div', { class: 'skills' }, o.skills.map(function (s) {
        return h(
          'div', { class: 'skill' },
          h('span', { class: 'skill-name' }, s.name),
          h('div', { class: 'xp-progress' }, h('span', { style: { width: s.level + '%' } })),
          h('span', { class: 'skill-val' }, s.level + '%')
        );
      })));
      wrap.appendChild(h('h3', { class: 'ex-group' }, '联系方式'));
      wrap.appendChild(h('ul', { class: 'about-links' }, o.contacts.map(function (c) {
        return h('li', null, c.label + '：', h('a', { href: c.url, target: '_blank', rel: 'noopener' }, c.url.replace(/^https?:\/\//, '')));
      })));
      content.appendChild(wrap);
    }

    function renderList(items) {
      if (ex.view === 'details') {
        var heads = ex.loc === 'documents' ? ['名称', '日期', '标签', '字数']
          : ex.loc === 'projects' ? ['名称', '标签', '链接'] : ['名称', '原位置', '大小'];
        var tbody = h('tbody');
        items.forEach(function (it) {
          var tr = h('tr', { class: 'ex-item' }, it.cols.map(function (c, i) {
            return h('td', null, i === 0 ? [h('img', { src: it.icon, alt: '' }), c] : c);
          }));
          bindItem(tr, it);
          tbody.appendChild(tr);
        });
        content.appendChild(h(
          'table', { class: 'ex-details' },
          h('thead', null, h('tr', null, heads.map(function (t) { return h('th', null, t); }))),
          tbody
        ));
      } else {
        var grid = h('div', { class: 'ex-tiles' });
        items.forEach(function (it) { grid.appendChild(tile(it)); });
        content.appendChild(grid);
      }
      if (!items.length) {
        content.appendChild(h('p', { class: 'ex-empty' }, ex.filter ? '搜索完毕，没有找到与“' + ex.filter + '”匹配的结果。' : '此文件夹为空。'));
      }
    }

    function tile(it) {
      var el = h(
        'div', { class: 'ex-item ex-tile', tabindex: '0' },
        h('img', { src: it.icon, alt: '' }),
        h(
          'div', { class: 'ex-item-text' },
          h('div', { class: 'ex-item-name' }, it.name),
          it.desc ? h('div', { class: 'ex-item-desc' }, it.desc) : null,
          it.meta ? h('div', { class: 'ex-item-desc' }, it.meta) : null
        )
      );
      bindItem(el, it);
      return el;
    }

    function bindItem(el, it) {
      var ptype = 'mouse';
      el.addEventListener('pointerdown', function (e) {
        ptype = e.pointerType;
        select(it, el);
      });
      el.addEventListener('click', function () {
        if (ptype === 'touch' || ptype === 'pen') openItem(it);
      });
      el.addEventListener('dblclick', function () { openItem(it); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') openItem(it);
      });
      el.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        select(it, el);
        XP.popupMenu([{ label: '打开(O)', bold: true, action: function () { openItem(it); } }], e.clientX, e.clientY);
      });
    }

    /* 左侧任务窗格 */
    function renderSide() {
      side.innerHTML = '';
      var panels = [];
      var sel = ex.selected;
      if (ex.searching) {
        var input = h('input', { type: 'search', class: 'xp-input', placeholder: '关键字', value: ex.filter });
        var doSearch = function () {
          ex.filter = input.value.trim();
          ex.selected = null;
          render();
          var again = side.querySelector('input');
          if (again) again.focus();
        };
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
        panels.push({
          title: '搜索助理',
          node: h(
            'div', { class: 'ex-search' },
            h('img', { class: 'ex-search-dog', src: XP.icon('search-dog'), alt: '' }),
            h('label', null, '全部或部分文件名或内容：', input),
            h('div', { class: 'ex-search-btns' },
              h('button', { class: 'xp-btn', onclick: doSearch }, '搜索'),
              h('button', { class: 'xp-btn', onclick: function () { ex.searching = false; ex.filter = ''; render(); } }, '返回'))
          )
        });
      } else if (ex.loc === 'computer') {
        panels.push({ title: '系统任务', links: [
          { label: '查看个人信息', icon: XP.icon('user'), nav: 'about' },
          { label: '更改桌面设置', icon: XP.icon('display'), action: function () { XP.launch('display'); } },
          { label: '运行程序...', icon: XP.icon('run'), action: function () { XP.launch('run'); } }
        ] });
      } else if (ex.loc === 'about') {
        panels.push({ title: '联系方式', links: site.owner.contacts.map(function (c) {
          return { label: c.label, icon: XP.icon('ie-page'), action: function () { XP.openUrl(c.url); } };
        }) });
      } else if (ex.loc === 'documents') {
        panels.push({ title: '文章任务', links: [
          { label: '阅读所选文章', icon: XP.icon('document'), disabled: !sel, action: function () { openItem(sel); } },
          { label: '在 IE 中浏览博客', icon: XP.icon('ie'), action: function () {
            XP.launch('ie', { url: sel ? 'xp://post/' + sel.post.id : 'xp://home' });
          } },
          { label: '搜索文章', icon: XP.icon('search'), action: function () { ex.searching = true; render(); } }
        ] });
      } else if (ex.loc === 'projects') {
        panels.push({ title: '项目任务', links: [
          { label: '访问项目主页', icon: XP.icon('ie-page'), disabled: !sel, action: function () { openItem(sel); } },
          { label: '在 GitHub 上查看全部', icon: XP.icon('ie'), action: function () { XP.openUrl(site.owner.contacts[0].url); } }
        ] });
      } else if (ex.loc === 'recycle') {
        panels.push({ title: '回收站任务', links: [
          { label: '清空回收站', icon: XP.icon('recycle-empty'), disabled: !bin.length, action: emptyBin },
          { label: '还原所有项目', icon: XP.icon('undo'), disabled: !bin.length, action: function () {
            XP.msgbox({ title: '还原', icon: 'question', message: '确定要把烦恼和拖延症都还原回来吗？', buttons: ['算了', '还是算了'] });
          } }
        ] });
      }
      panels.push(otherPlaces(ex.loc));

      if (sel && sel.post) {
        panels.push(detailsPanel([sel.post.title, '日期：' + sel.post.date, sel.post.tags && '标签：' + sel.post.tags.join('、'), '字数：' + XP.wordCount(sel.post.content), sel.post.summary]));
      } else if (sel && sel.project) {
        panels.push(detailsPanel([sel.project.name, sel.project.desc, sel.project.url]));
      } else if (sel && sel.file) {
        panels.push(detailsPanel([sel.file.name, '大小：' + sel.file.size, '删除日期：很久以前']));
      } else if (sel && sel.skill) {
        panels.push(detailsPanel([sel.name, '本地磁盘', '熟练度：' + sel.skill.level + '%']));
      } else {
        var L = LOC[ex.loc];
        panels.push(detailsPanel([L.title, ex.loc === 'about' ? site.owner.name + ' · ' + site.owner.title : '系统文件夹']));
      }

      panels.forEach(function (p) { side.appendChild(panel(p)); });
    }

    function panel(p) {
      var body = h('div', { class: 'ex-panel-body' });
      if (p.links) {
        p.links.forEach(function (l) {
          body.appendChild(h(
            'button',
            {
              class: 'ex-link', disabled: !!l.disabled,
              onclick: function () { if (l.nav) navigate(l.nav); else if (l.action) l.action(); }
            },
            h('img', { src: l.icon, alt: '' }),
            h('span', null, l.label)
          ));
        });
      }
      if (p.html) body.appendChild(h('div', { class: 'ex-panel-text', html: p.html }));
      if (p.node) body.appendChild(p.node);
      var section = h('section', { class: 'ex-panel' });
      var head = h('button', {
        class: 'ex-panel-head', 'aria-expanded': 'true',
        onclick: function () {
          var c = section.classList.toggle('collapsed');
          head.setAttribute('aria-expanded', c ? 'false' : 'true');
        }
      }, h('span', null, p.title), h('span', { class: 'ex-chevron' }));
      section.appendChild(head);
      section.appendChild(body);
      return section;
    }

    function renderStatus() {
      var L = LOC[ex.loc];
      var text;
      if (ex.selected) text = '已选定 1 个对象';
      else if (L.list) text = currentItems().length + ' 个对象';
      else if (ex.loc === 'computer') text = (4 + site.owner.skills.length + 2) + ' 个对象';
      else text = site.owner.name + ' 的个人资料';
      status.innerHTML = '';
      status.appendChild(h('span', { class: 'sb-cell sb-grow' }, text));
      status.appendChild(h('span', { class: 'sb-cell sb-zone' }, h('img', { src: locIcon('computer'), alt: '' }), '我的电脑'));
    }

    render();
    return win;
  }

  function tbButton(icon, label, onclick, showLabel) {
    return h(
      'button', { class: 'tb-button' + (showLabel ? ' with-label' : ''), title: label || icon, onclick: onclick },
      h('span', { class: 'tb-ico', html: TB[icon] }),
      showLabel && label ? h('span', null, label) : null
    );
  }

  function refreshExplorers() {
    explorers.forEach(function (e) { e.render(); });
  }

  function emptyBin() {
    if (!bin.length) return;
    XP.msgbox({
      title: '确认删除多个文件',
      icon: 'question',
      message: '确实要删除这 ' + bin.length + ' 项吗？\n（删除之后烦恼就真的没有了）',
      buttons: ['是(Y)', '否(N)']
    }).then(function (i) {
      if (i !== 0) return;
      bin = [];
      refreshExplorers();
      XP.refreshDesktop();
    });
  }

  /* ---------- 注册程序 ---------- */
  function explorerApp(key, title, icon, type) {
    XP.registerApp(key, {
      title: title,
      icon: icon,
      type: type,
      open: function () { return openExplorer(key); }
    });
  }

  explorerApp('computer', '我的电脑', 'computer', '系统文件夹');
  explorerApp('about', '关于我', 'user', '个人资料');
  explorerApp('documents', '我的文章', 'documents', '文件夹');
  explorerApp('projects', '我的项目', 'folder', '文件夹');
  XP.registerApp('recycle', {
    title: '回收站',
    type: '系统文件夹',
    icon: function () { return bin.length ? 'recycle-full' : 'recycle-empty'; },
    open: function () { return openExplorer('recycle'); },
    hasItems: function () { return bin.length > 0; },
    empty: emptyBin
  });

  /* ---------- 文章阅读器（写字板风格） ---------- */
  XP.registerApp('reader', {
    title: '写字板',
    icon: 'wordpad',
    type: '应用程序',
    open: function (args) {
      var posts = XP.posts();
      var post = XP.post(args.id) || posts[0];
      var size = XP.storage.get('reader-size', 15);

      var page = h('article', { class: 'wp-page post-body selectable' });
      var prevBtn = h('button', { class: 'tb-button with-label', onclick: function () { step(1); } }, '‹ 上一篇');
      var nextBtn = h('button', { class: 'tb-button with-label', onclick: function () { step(-1); } }, '下一篇 ›');
      var sizeSel = h('select', { class: 'xp-select', 'aria-label': '字号' },
        [13, 15, 17, 20].map(function (s) { return h('option', { value: s, selected: s === size }, s + ' px'); }));
      sizeSel.addEventListener('change', function () {
        size = +sizeSel.value;
        XP.storage.set('reader-size', size);
        page.style.fontSize = size + 'px';
      });

      var root = h(
        'div', { class: 'wordpad' },
        XP.menubar([
          { label: '文件(F)', items: [
            { label: '另存为 Markdown(A)...', action: function () {
              XP.download(post.title + '.md', new Blob(['# ' + post.title + '\n\n' + post.content.trim() + '\n'], { type: 'text/markdown' }));
            } },
            { label: '打印(P)...', shortcut: 'Ctrl+P', action: function () { window.print(); } },
            '-',
            { label: '退出(X)', action: function () { win.close(); } }
          ] },
          { label: '查看(V)', items: [
            { label: '在 Internet Explorer 中打开', action: function () { XP.launch('ie', { url: 'xp://post/' + post.id }); } }
          ] },
          { label: '帮助(H)', items: [
            { label: '关于写字板(A)', action: function () {
              XP.msgbox({ title: '关于写字板', icon: 'info', message: '写字板 · ' + site.systemName + '\n用来阅读本站的文章。' });
            } }
          ] }
        ]),
        h('div', { class: 'ex-toolbar wp-toolbar' },
          prevBtn, nextBtn, h('span', { class: 'tb-sep' }),
          h('label', { class: 'wp-size' }, '字号 ', sizeSel),
          h('span', { class: 'tb-sep' }),
          h('button', { class: 'tb-button with-label', onclick: function () { XP.launch('ie', { url: 'xp://post/' + post.id }); } },
            h('img', { src: XP.icon('ie'), alt: '' }), '网页视图')),
        h('div', { class: 'wp-ruler' }),
        h('div', { class: 'wp-scroll' }, page),
        h('div', { class: 'statusbar' }, h('span', { class: 'sb-cell sb-grow' }, '按 F1 获取帮助'), h('span', { class: 'sb-cell wp-count' }))
      );

      var win = XP.wm.open({
        id: 'reader',
        title: post.title + ' - 写字板',
        icon: XP.icon('wordpad'),
        content: root,
        width: 680,
        height: 520,
        minWidth: 320,
        onReuse: function (w) { w.showPost(XP.post(args.id) || posts[0]); }
      });

      function show(p) {
        post = p;
        win.setTitle(p.title + ' - 写字板');
        page.style.fontSize = size + 'px';
        page.innerHTML =
          '<h1>' + XP.esc(p.title) + '</h1>' +
          '<p class="post-meta">' + XP.esc(p.date) + (p.tags && p.tags.length ? ' · ' + XP.esc(p.tags.join('、')) : '') + '</p>' +
          XP.md(p.content);
        page.parentNode.scrollTop = 0;
        var idx = posts.indexOf(p);
        prevBtn.disabled = idx >= posts.length - 1;
        nextBtn.disabled = idx <= 0;
        root.querySelector('.wp-count').textContent = XP.wordCount(p.content) + ' 字';
      }

      function step(d) {
        var idx = posts.indexOf(post) + d;
        if (posts[idx]) show(posts[idx]);
      }

      win.showPost = show;
      show(post);
      return win;
    }
  });
})();
