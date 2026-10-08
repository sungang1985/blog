/* 命令提示符 */
(function () {
  'use strict';

  var XP = window.XP;
  var h = XP.h;
  var site = XP.site;

  var COLORS = ['#000000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#c0c0c0',
    '#808080', '#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#ffffff'];

  var APPS = {
    notepad: 'notepad', mspaint: 'paint', paint: 'paint', winmine: 'minesweeper', minesweeper: 'minesweeper',
    iexplore: 'ie', ie: 'ie', explorer: 'computer', about: 'about', docs: 'documents', documents: 'documents',
    projects: 'projects', control: 'display', 'desk.cpl': 'display', recycle: 'recycle', cmd: 'cmd'
  };

  XP.registerApp('cmd', {
    title: '命令提示符',
    icon: 'cmd',
    type: '应用程序',
    open: function () {
      var user = site.owner.name;
      var prompt = 'C:\\Documents and Settings\\' + user + '>';
      var history = [];
      var hpos = 0;

      var out = h('div', { class: 'cmd-out' });
      var input = h('input', { class: 'cmd-input', type: 'text', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': '命令' });
      var promptEl = h('span', { class: 'cmd-prompt' }, prompt);
      var line = h('div', { class: 'cmd-line' }, promptEl, input);
      var screen = h('div', { class: 'cmd selectable' }, out, line);

      function print(text) {
        out.appendChild(h('div', { class: 'cmd-row' }, text == null ? '' : String(text)));
        screen.scrollTop = screen.scrollHeight;
      }

      function postsList() {
        return XP.posts();
      }

      function findPost(arg) {
        var posts = postsList();
        if (/^\d+$/.test(arg)) return posts[+arg - 1];
        var a = arg.toLowerCase().replace(/\.md$/, '');
        return posts.filter(function (p) { return p.id.toLowerCase() === a || p.title.toLowerCase() === a; })[0];
      }

      var commands = {
        help: function () {
          [
            '有关某个命令的详细信息，请随便试试 :)',
            '',
            'ABOUT      显示个人简介',
            'BLOG       列出所有文章',
            'CLS        清除屏幕',
            'COLOR      设置控制台颜色，例如 color 0a',
            'DATE       显示当前日期',
            'DIR        显示当前目录中的文件',
            'ECHO       显示消息',
            'EXIT       退出命令提示符',
            'GITHUB     打开我的 GitHub',
            'IPCONFIG   显示网络配置',
            'PING       测试网络连接，例如 ping github.com',
            'READ       阅读文章，例如 read 1',
            'SHUTDOWN   关闭计算机',
            'SKILLS     显示技能',
            'START      启动程序，例如 start winmine',
            'TIME       显示当前时间',
            'TYPE       显示文章源文件，例如 type hello-xp.md',
            'VER        显示系统版本',
            'WHOAMI     显示当前用户'
          ].forEach(print);
        },
        cls: function () { out.innerHTML = ''; },
        ver: function () { print(''); print(site.systemName + ' [版本 5.1.2600]'); print(''); },
        whoami: function () { print(user.toLowerCase() + '-pc\\' + user.toLowerCase()); },
        about: function () {
          print(user + ' — ' + site.owner.title);
          site.owner.bio.forEach(print);
        },
        skills: function () {
          site.owner.skills.forEach(function (s) {
            var n = Math.round(s.level / 5);
            print((s.name + '            ').slice(0, 12) + '[' + new Array(n + 1).join('█') + new Array(21 - n).join('░') + '] ' + s.level + '%');
          });
        },
        blog: function () {
          postsList().forEach(function (p, i) { print(' ' + (i + 1) + '. [' + p.date + '] ' + p.title); });
          print('');
          print('输入 read <编号> 阅读文章。');
        },
        read: function (arg) {
          var p = findPost(arg);
          if (!p) return print('找不到文章：' + (arg || '(空)') + '。输入 blog 查看文章列表。');
          print('正在打开《' + p.title + '》...');
          XP.launch('reader', { id: p.id });
        },
        type: function (arg) {
          if (!arg) return print('命令语法不正确。');
          var p = findPost(arg);
          if (!p) return print('系统找不到指定的文件。');
          print('# ' + p.title);
          p.content.trim().split('\n').forEach(print);
        },
        dir: function () {
          var posts = postsList();
          print(' 驱动器 C 中的卷是 ' + site.systemName);
          print('');
          print(' C:\\Documents and Settings\\' + user + ' 的目录');
          print('');
          ['关于我', '我的文章', '我的项目'].forEach(function (d) {
            print('2026-01-01  00:00    <DIR>          ' + d);
          });
          var total = 0;
          posts.forEach(function (p) {
            var size = new Blob([p.content]).size;
            total += size;
            print(p.date + '  12:00    ' + ('              ' + size.toLocaleString()).slice(-14) + ' ' + p.id + '.md');
          });
          print('              ' + posts.length + ' 个文件 ' + total.toLocaleString() + ' 字节');
          print('               3 个目录  还有很多可用字节');
        },
        cd: function (arg) {
          if (!arg) print('C:\\Documents and Settings\\' + user);
          else print('系统找不到指定的路径。这台电脑只有一个目录，别乱跑啦。');
        },
        echo: function (arg) { print(arg || 'ECHO 处于打开状态。'); },
        date: function () { print('当前日期: ' + XP.formatDate(new Date())); },
        time: function () {
          var d = new Date();
          print('当前时间: ' + XP.pad(d.getHours()) + ':' + XP.pad(d.getMinutes()) + ':' + XP.pad(d.getSeconds()));
        },
        color: function (arg) {
          var m = /^([0-9a-f])([0-9a-f])$/i.exec(arg || '');
          if (!arg) {
            screen.style.background = '';
            screen.style.color = '';
            return;
          }
          if (!m || m[1].toLowerCase() === m[2].toLowerCase()) {
            print('用法：COLOR [背景色][前景色]，例如 color 0a（黑底绿字）');
            print('0 = 黑色  1 = 蓝色  2 = 绿色  3 = 浅绿  4 = 红色  5 = 紫色  6 = 黄色  7 = 白色');
            print('8 = 灰色  9 = 淡蓝  A = 淡绿  B = 淡浅绿 C = 淡红  D = 淡紫  E = 淡黄  F = 亮白');
            return;
          }
          screen.style.background = COLORS[parseInt(m[1], 16)];
          screen.style.color = COLORS[parseInt(m[2], 16)];
        },
        github: function () {
          var url = (site.owner.contacts[0] || {}).url;
          if (!url) return;
          print('正在打开 ' + url + ' ...');
          XP.openUrl(url);
        },
        start: function (arg) {
          var key = APPS[(arg || '').toLowerCase().replace(/\.exe$/, '')];
          if (!key) return print('系统找不到文件 ' + (arg || '') + '。');
          XP.launch(key);
        },
        ipconfig: function () {
          print('');
          print(site.systemName + ' IP Configuration');
          print('');
          print('Ethernet adapter 本地连接:');
          print('');
          print('        Connection-specific DNS Suffix  . : localhost');
          print('        IP Address. . . . . . . . . . . . : 127.0.0.1');
          print('        Subnet Mask . . . . . . . . . . . : 255.0.0.0');
          print('        Default Gateway . . . . . . . . . : 想你的方向');
        },
        ping: function (arg) {
          var host = arg || 'localhost';
          print('');
          print('正在 Ping ' + host + ' 具有 32 字节的数据:');
          var n = 0;
          busy = true;
          var t = setInterval(function () {
            print('来自 ' + host + ' 的回复: 字节=32 时间=' + (8 + Math.floor(Math.random() * 30)) + 'ms TTL=64');
            if (++n === 4) {
              clearInterval(t);
              print('');
              print(host + ' 的 Ping 统计信息:');
              print('    数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)');
              print('');
              busy = false;
              line.hidden = false;
              input.focus();
            }
          }, 500);
        },
        shutdown: function () { XP.shutdownDialog(); },
        exit: function () { win.close(); }
      };
      commands.posts = commands.blog;
      commands.ls = commands.dir;
      commands.clear = commands.cls;
      commands['?'] = commands.help;

      var busy = false;

      function run(raw) {
        print(prompt + raw);
        var text = raw.trim();
        if (!text) return;
        history.push(text);
        hpos = history.length;
        var sp = text.search(/\s/);
        var cmd = (sp < 0 ? text : text.slice(0, sp)).toLowerCase();
        var arg = sp < 0 ? '' : text.slice(sp + 1).trim();
        if (commands[cmd]) commands[cmd](arg);
        else if (APPS[cmd.replace(/\.exe$/, '')]) XP.launch(APPS[cmd.replace(/\.exe$/, '')]);
        else {
          print('\'' + cmd + '\' 不是内部或外部命令，也不是可运行的程序');
          print('或批处理文件。');
        }
        print('');
      }

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var v = input.value;
          input.value = '';
          run(v);
          if (busy) line.hidden = true;
          screen.scrollTop = screen.scrollHeight;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (hpos > 0) input.value = history[--hpos];
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (hpos < history.length - 1) input.value = history[++hpos];
          else { hpos = history.length; input.value = ''; }
        } else if (e.key === 'l' && e.ctrlKey) {
          e.preventDefault();
          commands.cls();
        }
      });

      screen.addEventListener('click', function () {
        if (!window.getSelection().toString()) input.focus();
      });

      var win = XP.wm.open({
        title: '命令提示符',
        icon: XP.icon('cmd'),
        content: screen,
        width: 660,
        height: 400,
        minWidth: 280,
        className: 'cmd-window'
      });

      print(site.systemName + ' [版本 5.1.2600]');
      print('(C) 版权所有 1985-' + new Date().getFullYear() + ' ' + user + '。');
      print('');
      print('输入 help 查看可用命令。');
      print('');
      setTimeout(function () { input.focus(); }, 0);
      return win;
    }
  });
})();
