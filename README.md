# 鱼窝编辑器（cm-editor）· 项目说明

自研 Markdown 编辑器：CodeMirror 6 内核，外壳、工具栏与短代码渲染均为鱼窝自研。

## 文件结构

```
├── main.md            本说明文件
├── index.html         页面骨架（内含 style.css?v= 与 bundle.js?v= 版本号）
├── bundle.js          构建产物（由 src/editor.js 打包而来）
├── package.json       依赖清单
└── src/
    ├── editor.js      主逻辑（约 800 行：编辑器、工具栏、短代码渲染、色板等）
    ├── style.css      全部样式（含深色模式适配）
    └── icons.json     Lucide 图标表（43 个，工具栏与顶栏共用）
```

## 功能清单

### 编辑体验
- Markdown 语法高亮（md / python / js / css / html / json / sql 等）
- 撤销 / 重做（Ctrl+Z / Ctrl+Y，已修复 6.11.1 键位表缺失问题）
- 查找替换（Ctrl+F，含高亮全部匹配）
- 括号自动补全；粘贴图片链接自动转 `![图片](url)`
- 草稿自动保存（localStorage，键 `yuwu_draft_v2_/editor-demo/index.html`，关页面不丢）
- 字数统计：按预览渲染后的可见文字计，显示在预览栏底部右侧

### 工具栏
- 排版：加粗、倾斜、删除线、行内代码、横线、H1–H3、引用（可嵌套）、无序/有序/任务列表
- 插入：链接、图片、表格、代码块、当前时间
- 块短代码：居中（Ctrl+E，`{center}`）、居中标题、进度条、提示、消息提示、折叠面板、标签页、时间轴、描述卡片、卡片列表、多彩按钮、便条按钮、彩色虚线、跑马灯、宫格
- 行内短代码：文字颜色（色板选色，18 预设色 + 自定义取色器）、文字字号
- 媒体：B站视频、网易云音乐、云盘下载
- 图标统一 Lucide，集中在 `src/icons.json`

### 快捷键
| 键 | 功能 |
| --- | --- |
| Ctrl+B / I | 加粗 / 倾斜 |
| Ctrl+E | 居中开关（选中包裹、已包裹解开、空选插骨架） |
| Ctrl+F | 查找替换 |
| Ctrl+Z / Y / Shift+Z | 撤销 / 重做 |

### 预览
- 实时渲染，短代码全部自研解析
- 代码块增强：语言标识 + 一键复制
- 手机端「编辑 / 预览」双标签；窄屏单栏
- 深浅色跟随系统

## 短代码速查

```
{color color="#e74c3c"}文字{/color}        行内颜色（可嵌套加粗等）
{size size="18"}文字{/size}                行内字号（纯数字自动加 px）
{center}内容{/center}                      居中块（内容走 Markdown 解析）
{mtitle title="居中标题"/}                 居中标题
{progress percentage="60" color="#6eb934"/}
{callout color="#f0ad4e"}内容{/callout}
{alert type="info"}内容{/alert}            success / info / warning / error
{collapse}{collapse-item label="标题" open}内容{/collapse-item}{/collapse}
{tabs}{tabs-pane label="标签一"}内容{/tabs-pane}{/tabs}
{timeline}{timeline-item color="#19be6b"}节点{/timeline-item}{/timeline}
{card-describe title="描述"}内容{/card-describe}
{card-list title="列表"}{card-list-item}项{/card-list-item}{/card-list}
{gird column="3" gap="15"}{gird-item}格子{/gird-item}{/gird}   兼容 {grid} 拼写
{abtn color="#6eb934" href="https://" radius="6" content="按钮"/}
{anote color="#409eff" href="https://" radius="6" content="便条"/}
{dotted startColor="#ff6c6c" endColor="#6eb934"/}
{lamp/}
{bilibili bvid="BV号" page="1"/}
{music id="歌曲ID"/}
{cloud type="bd" title="网盘文件" url="https://" password="提取码"/}
```

## 注意事项（重要）

1. **短代码只在编辑器预览端生效**。正式接入鱼窝 Python 静态站时，必须在 Python 侧实现同样的渲染逻辑（含容器内文走 Markdown、center 剥边界 `<br>` 这两处细节），否则两边显示不一致。
2. **改任何源码后必须递增版本号**：`index.html` 里 `style.css?v=` 和 `bundle.js?v=`，否则浏览器缓存不更新（已多次踩坑）。
3. **@codemirror/commands 6.11.1 的 `history()` 不自带键位表**，必须显式引入 `historyKeymap` 加入 keymap，否则 Ctrl+Z 失效。
4. **块级容器（宫格、提示、时间轴、折叠、标签页、卡片）内文走 `mdBlock()` 解析**：单段内容会去掉外层 `<p>` 避免空隙；`{center}` 在 `renderPreview` 中处理，会剥掉容器解析带来的边界 `<br>`。改渲染顺序时注意别破坏这套配合。
5. **工具栏按钮点击统一传 `(view, btn)`**：色板等需要按钮定位的功能依赖第二个参数。
6. 色板面板靠 document 级点击监听关闭；「文字颜色」按钮自身的点击被豁免（否则面板刚开就被关，事件冒泡坑）。
7. 草稿只存本机浏览器，不上传服务器。清掉 localStorage 键即可恢复内置演示文章。
8. `icons.json` 用 esbuild 的 json loader 打包，新增图标后需重新构建。
9. 依赖装好后的构建命令（在项目根目录）：
   ```
   npx esbuild src/editor.js --bundle --minify --outfile=bundle.js --loader:.json=json
   ```
10. 部署三件套（index.html、style.css、bundle.js）到站点目录下的 `editor-demo/` 即可，纯静态，无后端。

## 当前版本

- style.css v=18 / bundle.js v=27（2026-11-22）
- 已验证：色板选色、容器内 Markdown 嵌套、容器内居中、演示文章各容器渲染
- 待办：正式接入鱼窝站（Python 侧渲染待实现）
