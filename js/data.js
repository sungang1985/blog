/*
 * 网站内容配置 —— 想修改个人信息、文章、项目，只需要编辑这个文件。
 * 文章正文使用 Markdown（支持标题、列表、引用、代码块、链接、图片、粗体、斜体）。
 */
window.SITE = {
  // 开机画面与系统名称
  systemName: 'SunGang XP',
  edition: 'Personal',

  owner: {
    name: 'SunGang',
    title: '开发者 · 博主',
    avatar: 'assets/avatar.svg',
    location: '中国',
    motto: '保持好奇，持续折腾。',
    bio: [
      '你好！欢迎来到我的个人小站。',
      '这是一个仿照 Windows XP 桌面打造的个人网站：双击桌面图标打开程序，拖动标题栏移动窗口，点击左下角的「开始」按钮探索更多。',
      '在这里我会记录学习笔记、做过的项目和一些生活随想。'
    ],
    // level: 0-100，在「关于我」里会显示成硬盘容量条
    skills: [
      { name: 'JavaScript', level: 85 },
      { name: 'HTML / CSS', level: 80 },
      { name: 'Python', level: 70 },
      { name: 'Linux', level: 65 },
      { name: 'Git', level: 75 }
    ],
    contacts: [
      { label: 'GitHub', url: 'https://github.com/sungang1985' }
    ]
  },

  // 「我的项目」文件夹
  projects: [
    {
      name: 'XP 风格个人网站',
      desc: '你正在浏览的这个网站：纯 HTML/CSS/JS 实现的 Windows XP 桌面，零依赖。',
      tags: ['HTML', 'CSS', 'JavaScript'],
      url: 'https://github.com/sungang1985/blog'
    },
    {
      name: '更多项目',
      desc: '去 GitHub 看看我的其他仓库。',
      tags: ['GitHub'],
      url: 'https://github.com/sungang1985'
    }
  ],

  // IE 收藏夹 / 友情链接
  links: [
    { name: '我的 GitHub', url: 'https://github.com/sungang1985' },
    { name: '本站源码', url: 'https://github.com/sungang1985/blog' }
  ],

  // 回收站里的“文件”（纯属娱乐）
  recycleBin: [
    { name: '烦恼.txt', size: '0 KB' },
    { name: '拖延症.exe', size: '1,024 KB' },
    { name: 'bug_final_最终版_v3.js', size: '12 KB' },
    { name: '明天再说.lnk', size: '1 KB' }
  ],

  // 博客文章（按日期自动倒序排列）
  posts: [
    {
      id: 'hello-xp',
      title: '欢迎来到我的 XP 小站',
      date: '2026-10-08',
      tags: ['公告', '建站'],
      summary: '一个用纯前端技术复刻的 Windows XP 桌面，也是我的个人网站与博客。',
      content: `
## 为什么是 Windows XP？

蓝天、白云、绿草地——很多人对电脑的第一印象，就是 Windows XP 的桌面。
于是我决定把个人网站做成一台“XP 电脑”：

- 双击桌面图标打开程序
- 拖动标题栏移动窗口，拖动边缘调整大小
- 点击 **开始** 按钮打开开始菜单
- 右键桌面可以更换壁纸

## 这里有什么？

| 程序 | 用途 |
| --- | --- |
| 关于我 | 个人简介与技能 |
| 我的文章 | 博客文章列表 |
| Internet Explorer | 以“网页”形式浏览博客 |
| 扫雷 / 画图 | 摸鱼专用 |
| 命令提示符 | 输入 \`help\` 试试 |

## 技术栈

整个网站没有使用任何框架或构建工具，只有 HTML、CSS 和原生 JavaScript，
可以直接部署在 GitHub Pages 上。

> 想写新文章？只需要编辑 \`js/data.js\` 里的 \`posts\` 数组。
`
    },
    {
      id: 'xp-memories',
      title: '关于 Windows XP 的那些回忆',
      date: '2026-09-20',
      tags: ['随笔'],
      summary: '开机音乐、扫雷、纸牌和 Bliss 壁纸——属于一代人的数字记忆。',
      content: `
很多人的“电脑启蒙”都发生在 Windows XP 上。

## 那些熟悉的画面

1. 开机时滚动的蓝色进度条
2. 欢迎屏幕上点击自己的用户名
3. 绿色的「开始」按钮和蓝色的任务栏
4. 一张蓝天绿地的壁纸

## 那些熟悉的游戏

*扫雷* 教会了我们逻辑推理，*纸牌* 教会了我们耐心，
而 *三维弹球* 则教会了我们——上课要专心。

> 有些界面虽然已经过时，但它们留下的感觉不会过时。

在这个网站里，你仍然可以玩一局扫雷，或者打开画图随手涂鸦。
`
    },
    {
      id: 'github-pages',
      title: '用 GitHub Pages 部署静态网站',
      date: '2026-09-01',
      tags: ['教程', '建站'],
      summary: '三步把一个纯静态网站免费部署到互联网上。',
      content: `
GitHub Pages 可以免费托管静态网站，非常适合个人主页和博客。

## 第一步：把代码推送到 GitHub

\`\`\`bash
git add .
git commit -m "my site"
git push origin main
\`\`\`

## 第二步：开启 Pages

进入仓库的 **Settings → Pages**，在 *Build and deployment* 中选择
\`Deploy from a branch\`，分支选 \`main\`，目录选 \`/ (root)\`，保存。

## 第三步：访问网站

稍等一两分钟，就可以通过下面的地址访问：

\`\`\`
https://<用户名>.github.io/<仓库名>/
\`\`\`

如果仓库名是 \`<用户名>.github.io\`，那么网址就是 \`https://<用户名>.github.io/\`。

---

更多信息请参考 [GitHub Pages 官方文档](https://docs.github.com/pages)。
`
    }
  ]
};
