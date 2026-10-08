/* Internet Explorer：以“网页”的形式浏览博客 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;
  var site = XP.site;
  var esc = XP.esc;
  var HOME = 'xp://home';

  var ICONS = {
    back: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3aa83a" stroke="#1d6b1d"/><path d="M13 6.5 7.5 12l5.5 5.5V14h4v-4h-4z" fill="#fff"/></svg>',
    forward: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3aa83a" stroke="#1d6b1d"/><path d="M11 6.5 16.5 12 11 17.5V14H7v-4h4z" fill="#fff"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#e5533d" stroke="#9c2f1f"/><path d="m8 8 8 8m0-8-8 8" stroke="#fff" stroke-width="2.4"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" stroke="#7a8fa8"/><path d="M16.5 10A5 5 0 1 0 17 13" fill="none" stroke="#2e9e2e" stroke-width="2.2"/><path d="m18 6-.5 5-4.5-1.5z" fill="#2e9e2e"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M12 3 2 12h3v9h5v-6h4v6h5v-9h3z" fill="#f2f2f2" stroke="#7a5a2b"/><path d="M12 3 2 12h3l7-6.3 7 6.3h3z" fill="#d9452b"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="#d8ecff" stroke="#355d9b" stroke-width="2"/><path d="m14.5 14.5 6 6" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/></svg>',
    favorites: '<svg viewBox="0 0 24 24"><path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z" fill="#f7c936" stroke="#b07d0b"/></svg>',
    go: '<svg viewBox="0 0 20 20"><rect x="1" y="1" width="18" height="18" rx="3" fill="#3aa83a" stroke="#1d6b1d"/><path d="M8 5l6 5-6 5z" fill="#fff"/></svg>'
  };

  function tags() {
    var all = {};
    site.posts.forEach(function (p) {
      (p.tags || []).forEach(function (t) { all[t] = (all[t] || 0) + 1; });
    });
    return all;
  }

  function link(url, text, cls) {
    return '<a href="#" data-nav="' + esc(url) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</a>';
  }

  function layout(main) {
    var o = site.owner;
    var tagMap = tags();
    var side =
      '<div class="blog-box"><h3>关于我</h3><div class="blog-me"><img src="' + esc(o.avatar) + '" alt="">' +
      '<p><b>' + esc(o.name) + '</b><br>' + esc(o.title) + '</p></div><p>' + esc(o.bio[0] || '') + '</p>' +
      '<p>' + link('xp://about', '更多关于我 »') + '</p></div>' +
      '<div class="blog-box"><h3>标签</h3><p class="blog-tags">' +
      Object.keys(tagMap).map(function (t) {
        return link('xp://tag/' + encodeURIComponent(t), esc(t) + ' (' + tagMap[t] + ')');
      }).join(' ') + '</p></div>' +
      '<div class="blog-box"><h3>文章归档</h3><ul>' +
      XP.posts().map(function (p) {
        return '<li>' + link('xp://post/' + p.id, esc(p.title)) + '</li>';
      }).join('') + '</ul></div>' +
      '<div class="blog-box"><h3>链接</h3><ul>' +
      site.links.map(function (l) {
        return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.name) + '</a></li>';
      }).join('') + '</ul></div>';

    return '<div class="blog">' +
      '<header class="blog-header"><img src="' + esc(o.avatar) + '" alt=""><div><h1>' + esc(o.name) + ' 的博客</h1>' +
      '<p>' + esc(o.motto || o.title) + '</p></div></header>' +
      '<nav class="blog-nav">' + link(HOME, '首页') + link('xp://about', '关于') + link('xp://help', '本站帮助') +
      '<a href="' + esc((o.contacts[0] || {}).url || '#') + '" target="_blank" rel="noopener">GitHub</a></nav>' +
      '<div class="blog-wrap"><main class="blog-main">' + main + '</main><aside class="blog-side">' + side + '</aside></div>' +
      '<footer class="blog-footer">© ' + new Date().getFullYear() + ' ' + esc(o.name) + ' · Powered by ' + esc(site.systemName) + '</footer>' +
      '</div>';
  }

  function entry(p) {
    return '<article class="blog-entry"><h2>' + link('xp://post/' + p.id, esc(p.title)) + '</h2>' +
      '<p class="post-meta">' + esc(p.date) + ' · ' + (p.tags || []).map(function (t) {
        return link('xp://tag/' + encodeURIComponent(t), esc(t));
      }).join('、') + '</p>' +
      '<p>' + esc(p.summary || '') + '</p>' +
      '<p>' + link('xp://post/' + p.id, '阅读全文 »', 'more') + '</p></article>';
  }

  /* 根据地址返回 {title, html} */
  function route(url) {
    var m;
    if (url === HOME || url === 'xp://' || url === 'xp://blog') {
      return { title: site.owner.name + ' 的博客', html: layout(XP.posts().map(entry).join('')) };
    }
    if ((m = url.match(/^xp:\/\/post\/(.+)$/))) {
      var posts = XP.posts();
      var p = XP.post(decodeURIComponent(m[1]));
      if (!p) return null;
      var i = posts.indexOf(p);
      var nav = '<div class="post-nav">' +
        (posts[i + 1] ? link('xp://post/' + posts[i + 1].id, '« ' + esc(posts[i + 1].title)) : '<span></span>') +
        (posts[i - 1] ? link('xp://post/' + posts[i - 1].id, esc(posts[i - 1].title) + ' »') : '<span></span>') + '</div>';
      return {
        title: p.title,
        html: layout(
          '<article class="blog-entry post-body"><h2>' + esc(p.title) + '</h2><p class="post-meta">' + esc(p.date) +
          ' · ' + (p.tags || []).map(function (t) { return link('xp://tag/' + encodeURIComponent(t), esc(t)); }).join('、') +
          '</p>' + XP.md(p.content) + '</article>' + nav
        )
      };
    }
    if ((m = url.match(/^xp:\/\/tag\/(.+)$/))) {
      var tag = decodeURIComponent(m[1]);
      var list = XP.posts().filter(function (p) { return (p.tags || []).indexOf(tag) >= 0; });
      return {
        title: '标签：' + tag,
        html: layout('<h2 class="blog-section">标签“' + esc(tag) + '”下的文章</h2>' + (list.map(entry).join('') || '<p>暂无文章。</p>'))
      };
    }
    if (url === 'xp://about') {
      var o = site.owner;
      return {
        title: '关于 ' + o.name,
        html: layout(
          '<article class="blog-entry"><h2>关于我</h2>' + o.bio.map(function (b) { return '<p>' + esc(b) + '</p>'; }).join('') +
          '<h3>技能</h3><ul>' + o.skills.map(function (s) { return '<li>' + esc(s.name) + '</li>'; }).join('') + '</ul>' +
          '<h3>联系方式</h3><ul>' + o.contacts.map(function (c) {
            return '<li>' + esc(c.label) + '：<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.url) + '</a></li>';
          }).join('') + '</ul></article>'
        )
      };
    }
    if (url === 'xp://help') {
      return {
        title: '帮助和支持',
        html: layout(
          '<article class="blog-entry post-body"><h2>帮助和支持中心</h2>' +
          '<p>欢迎使用 ' + esc(site.systemName) + '！这是一个仿 Windows XP 的个人网站。</p>' +
          '<h3>基本操作</h3><ul>' +
          '<li>双击桌面图标打开程序（手机上轻点即可）</li>' +
          '<li>拖动标题栏移动窗口，拖动窗口边缘调整大小，双击标题栏最大化</li>' +
          '<li>点击任务栏按钮切换或最小化窗口</li>' +
          '<li>在桌面空白处按住鼠标拖动可以框选图标</li>' +
          '<li>右键桌面 →“属性”可以更换壁纸、设置屏幕保护程序</li>' +
          '</ul><h3>小彩蛋</h3><ul>' +
          '<li>在<b>命令提示符</b>里输入 <code>help</code> 查看所有命令</li>' +
          '<li>开始菜单 →“运行”，输入 <code>winmine</code>、<code>mspaint</code>、<code>notepad</code> 试试</li>' +
          '<li>扫雷会记录你在每个难度下的最好成绩</li>' +
          '</ul><h3>关于本站</h3><p>本站由纯 HTML、CSS 与 JavaScript 编写，没有使用任何框架，所有图标均为手绘 SVG。' +
          '源代码：<a href="https://github.com/sungang1985/blog" target="_blank" rel="noopener">github.com/sungang1985/blog</a></p></article>'
        )
      };
    }
    if ((m = url.match(/^xp:\/\/search\/(.*)$/))) {
      var q = decodeURIComponent(m[1]);
      var ql = q.toLowerCase();
      var found = XP.posts().filter(function (p) {
        return (p.title + p.summary + p.content + (p.tags || []).join(' ')).toLowerCase().indexOf(ql) >= 0;
      });
      return {
        title: '搜索：' + q,
        html: layout('<h2 class="blog-section">“' + esc(q) + '”的搜索结果（' + found.length + '）</h2>' +
          (found.map(entry).join('') || '<p>没有找到相关文章。</p>'))
      };
    }
    if (url === 'about:blank') return { title: '空白页', html: '' };
    return null;
  }

  function errorPage(url) {
    return {
      title: '无法显示网页',
      html: '<div class="ie-error"><h1><img src="' + XP.icon('info') + '" alt="">无法显示网页</h1>' +
        '<p>您要访问的网页 <b>' + esc(url) + '</b> 不存在，或者已经被移到回收站了。</p><hr>' +
        '<p>请尝试以下操作：</p><ul>' +
        '<li>检查地址栏中的拼写是否正确。</li>' +
        '<li>单击 ' + link(HOME, '主页') + ' 返回博客首页。</li>' +
        '<li>单击<b>后退</b>按钮尝试其他链接。</li></ul>' +
        '<p class="ie-error-code">HTTP 404 - 找不到文件<br>Internet Explorer</p></div>'
    };
  }

  function externalPage(url) {
    return {
      title: url,
      html: '<div class="ie-error"><h1><img src="' + XP.icon('ie') + '" alt="">此网页已在新窗口中打开</h1>' +
        '<p>出于安全原因，外部网站会在浏览器的新标签页中打开：</p>' +
        '<p><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(url) + '</a></p>' +
        '<p>' + link(HOME, '返回博客首页') + '</p></div>'
    };
  }

  function normalize(url) {
    url = url.trim();
    if (!url) return HOME;
    if (/^(xp:|about:|https?:)/i.test(url)) return url;
    if (/^[\w-]+(\.[\w-]+)+/.test(url)) return 'http://' + url;
    return 'xp://' + url.replace(/^\/+/, '');
  }

  XP.registerApp('ie', {
    title: 'Internet Explorer',
    icon: 'ie',
    type: '应用程序',
    open: function (args) {
      var start = args.url || HOME;
      var history = [];
      var pos = -1;
      var loadTimer;

      var view = h('div', { class: 'ie-view selectable' });
      var searchInput = h('input', { type: 'search', class: 'xp-input', placeholder: '文章标题或内容' });
      searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
      var searchPane = h('div', { class: 'ie-search' },
        h('div', { class: 'ie-search-head' }, '搜索',
          h('button', { class: 'ie-search-close', 'aria-label': '关闭', onclick: function () { toggleSearch(false); } }, '×')),
        h('div', { class: 'ie-search-body' },
          h('img', { src: XP.icon('search-dog'), alt: '' }),
          h('label', null, '要搜索什么？', searchInput),
          h('button', { class: 'xp-btn', onclick: function () { doSearch(); } }, '搜索')));
      var addr = h('input', { class: 'ie-addr-input', type: 'text', spellcheck: 'false', 'aria-label': '地址' });
      var statusText = h('span', { class: 'ie-status-text' }, '完毕');
      var progress = h('span', { class: 'ie-progress' }, h('span'));

      function btn(icon, label, fn) {
        return h('button', { class: 'tb-button' + (label ? ' with-label' : ''), title: label || icon, onclick: fn },
          h('span', { class: 'tb-ico', html: ICONS[icon] }), label ? h('span', null, label) : null);
      }

      var backBtn = btn('back', '后退', function () { go(-1); });
      var fwdBtn = btn('forward', '', function () { go(1); });

      addr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') navigate(addr.value, true);
      });
      addr.addEventListener('focus', function () { addr.select(); });

      var root = h(
        'div', { class: 'ie' },
        h('div', { class: 'ie-menurow' },
          XP.menubar([
            { label: '文件(F)', items: [
              { label: '新建窗口(N)', disabled: true },
              { label: '另存为(A)...', disabled: true },
              { label: '打印(P)...', action: function () { window.print(); } },
              '-',
              { label: '关闭(C)', action: function () { win.close(); } }
            ] },
            { label: '编辑(E)', items: [
              { label: '全选(A)', shortcut: 'Ctrl+A', action: function () {
                var r = document.createRange();
                r.selectNodeContents(view);
                var s = window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
              } }
            ] },
            { label: '查看(V)', items: [
              { label: '刷新(R)', shortcut: 'F5', action: function () { load(history[pos]); } },
              { label: '源文件(C)', action: function () {
                XP.launch('notepad', { title: '源文件', text: view.innerHTML });
              } }
            ] },
            { label: '收藏(A)', items: function () {
              return [
                { label: '博客首页', icon: XP.icon('ie-page'), action: function () { navigate(HOME); } },
                { label: '帮助和支持', icon: XP.icon('ie-page'), action: function () { navigate('xp://help'); } },
                '-'
              ].concat(site.links.map(function (l) {
                return { label: l.name, icon: XP.icon('ie-page'), action: function () { navigate(l.url, true); } };
              }));
            } },
            { label: '工具(T)', items: [
              { label: 'Internet 选项(O)...', action: function () { XP.launch('display'); } }
            ] },
            { label: '帮助(H)', items: [
              { label: '关于 Internet Explorer(A)', action: function () {
                XP.msgbox({ title: '关于 Internet Explorer', icon: 'ie', message: 'Internet Explorer · ' + site.systemName + ' 特别版\n只能访问这个博客，但绝对不会弹广告。' });
              } }
            ] }
          ]),
          h('div', { class: 'ie-throbber' }, h('img', { src: XP.icon('flag'), alt: '' }))
        ),
        h('div', { class: 'ex-toolbar' },
          backBtn, fwdBtn,
          btn('stop', '', function () { finish('已停止'); }),
          btn('refresh', '', function () { load(history[pos]); }),
          btn('home', '', function () { navigate(HOME); }),
          h('span', { class: 'tb-sep' }),
          btn('search', '搜索', function () { toggleSearch(); }),
          btn('favorites', '收藏夹', function (e) {
            var r = e.currentTarget.getBoundingClientRect();
            XP.popupMenu(site.links.map(function (l) {
              return { label: l.name, icon: XP.icon('ie-page'), action: function () { navigate(l.url, true); } };
            }), r.left, r.bottom);
          })
        ),
        h('div', { class: 'ex-address' },
          h('span', { class: 'addr-label' }, '地址(D)'),
          h('div', { class: 'addr-box ie-addr' }, h('img', { src: XP.icon('ie-page'), alt: '' }), addr),
          h('button', { class: 'addr-go', onclick: function () { navigate(addr.value, true); } }, h('span', { html: ICONS.go }), '转到')
        ),
        h('div', { class: 'ie-body' }, searchPane, view),
        h('div', { class: 'statusbar' },
          h('span', { class: 'sb-cell sb-grow' }, h('img', { src: XP.icon('ie-page'), alt: '' }), statusText),
          h('span', { class: 'sb-cell sb-progress' }, progress),
          h('span', { class: 'sb-cell sb-zone' }, h('img', { src: XP.icon('globe'), alt: '' }), 'Internet'))
      );

      var win = XP.wm.open({
        id: 'ie',
        title: 'Internet Explorer',
        icon: XP.icon('ie'),
        content: root,
        width: 820,
        height: 560,
        minWidth: 320,
        className: 'ie-window',
        onReuse: function (w) { if (args.url) w.navigate(args.url); }
      });

      // 让浏览器“工具栏”按钮点击时不触发全局关闭菜单
      root.querySelectorAll('.tb-button').forEach(function (b) {
        b.addEventListener('pointerdown', function (e) { e.stopPropagation(); XP.closeMenus(); });
      });

      view.addEventListener('click', function (e) {
        var a = e.target.closest('a');
        if (!a) return;
        var nav = a.getAttribute('data-nav');
        if (nav) {
          e.preventDefault();
          navigate(nav);
        }
      });
      view.addEventListener('mouseover', function (e) {
        var a = e.target.closest('a');
        if (a) statusText.textContent = a.getAttribute('data-nav') || a.href;
      });
      view.addEventListener('mouseout', function (e) {
        if (e.target.closest('a')) statusText.textContent = '完毕';
      });

      function toggleSearch(force) {
        var open = force != null ? force : !root.classList.contains('searching');
        root.classList.toggle('searching', open);
        if (open) searchInput.focus();
      }

      function doSearch() {
        var q = searchInput.value.trim();
        if (q) navigate('xp://search/' + encodeURIComponent(q));
      }

      function navigate(url, typed) {
        url = normalize(url);
        if (/^https?:/i.test(url) && typed) XP.openUrl(url);
        history = history.slice(0, pos + 1);
        history.push(url);
        pos = history.length - 1;
        load(url);
      }

      function go(d) {
        var p = pos + d;
        if (p < 0 || p >= history.length) return;
        pos = p;
        load(history[p]);
      }

      function load(url) {
        var page = /^https?:/i.test(url) ? externalPage(url) : route(url) || errorPage(url);
        show(url, page);
      }

      function show(url, page) {
        addr.value = url;
        backBtn.disabled = pos <= 0;
        fwdBtn.disabled = pos >= history.length - 1;
        win.setTitle(page.title + ' - Internet Explorer');
        statusText.textContent = '正在打开网页 ' + url + '...';
        root.classList.add('loading');
        progress.firstChild.style.width = '0%';
        clearTimeout(loadTimer);
        view.style.visibility = 'hidden';
        loadTimer = setTimeout(function () {
          progress.firstChild.style.width = '70%';
          view.innerHTML = page.html;
          view.scrollTop = 0;
          view.style.visibility = '';
          loadTimer = setTimeout(function () { finish('完毕'); }, 180);
        }, 160);
      }

      function finish(text) {
        clearTimeout(loadTimer);
        view.style.visibility = '';
        progress.firstChild.style.width = '0%';
        root.classList.remove('loading');
        statusText.textContent = text;
      }

      win.navigate = function (u) { navigate(u); };
      navigate(start);
      return win;
    }
  });
})();
