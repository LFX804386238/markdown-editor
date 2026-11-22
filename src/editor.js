/* 鱼窝轻量编辑器 · CodeMirror 6 内核（MIT）+ 自研外壳 */
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { indentWithTab, undo, redo, history, historyKeymap } from "@codemirror/commands";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets } from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { marked } from "marked";
import ICONS from "./icons.json";

marked.setOptions({ breaks: true, gfm: true });

const DEFAULT_DOC = `{mtitle title="鱼窝编辑器 · 全功能体验记"/}

这篇日记是专门写来验收的——把编辑器目前支持的每一个功能都真实用了一遍，左边是源码，右边就是最终效果。

## 基础排版

支持 **加粗**、*倾斜*、~~删除线~~、行内代码 \`printf("hello 鱼窝")\`，也能插[链接](https://codemirror.net)，写起来不用记语法，点工具栏就行。

---

## 引用（支持嵌套）

> 一层引用：好的工具是让写作变顺滑，而不是让人先学一遍语法。
> > 二层引用：边框转灰、底色加深，一眼能看出层级。
> > > 三层引用：还能继续往下套，最多演示到这。

## 列表

- 无序列表一
- 无序列表二
1. 有序列表一
2. 有序列表二
- [x] 撤销 / 重做
- [x] 草稿自动保存
- [x] 正式接入鱼窝（2026-11-22）

## 代码块（语言标识 + 一键复制）

\`\`\`python
def hello():
    print("hello 鱼窝")  # 头部条左边是语言名，右边点「复制」
\`\`\`

\`\`\`javascript
const editor = "自研";  // 换个语言试试
\`\`\`

## 提示与进度

{progress percentage="86" color="#6eb934"/}

{callout color="#f0ad4e"}
这是一个提示块，支持**加粗**和[链接](https://codemirror.net)，颜色可以自己定。
{/callout}

{alert type="success"}
成功提示：功能全部实测通过。
{/alert}

{alert type="warning"}
注意：演示页随便玩，正式站还没接。
{/alert}

{lamp/}

## 折叠面板与标签页

{collapse}
{collapse-item label="点我展开：编辑器是怎么来的" open}
从 Joe 原版到自研，工具栏、短代码渲染全部重写，图标统一用 Lucide。
{/collapse-item}
{collapse-item label="点我展开：草稿存在哪"}
存在本机浏览器里，关掉页面也不丢，不上传任何服务器。
{/collapse-item}
{/collapse}

{tabs}
{tabs-pane label="写作"}
左边写源码，语法高亮，写起来很安静。
{/tabs-pane}
{tabs-pane label="预览"}
右边实时渲染，所见即所得。
{/tabs-pane}
{tabs-pane label="手机"}
窄屏变成「编辑 / 预览」双标签，单手也能切换。
{/tabs-pane}
{/tabs}

## 时间轴

{timeline}
{timeline-item color="#19be6b"}
定下自研方案，工具栏对齐 Joe
{/timeline-item}
{timeline-item color="#409eff"}
补齐四个短代码：B站、网易云、云盘、宫格
{/timeline-item}
{timeline-item color="#f0ad4e"}
借鉴参考稿：嵌套引用、代码块复制、窄屏双标签
{/timeline-item}
{timeline-item color="#ed4014"}
已正式接入鱼窝站
{/timeline-item}
{/timeline}

## 卡片与按钮

{card-describe title="关于本编辑器"}
CodeMirror 6 内核，外壳与短代码渲染鱼窝自研。
{/card-describe}

{card-list title="这轮新增"}
{card-list-item}
嵌套引用样式，逐层渐进
{/card-list-item}
{card-list-item}
代码块头部条：语言名 + 一键复制
{/card-list-item}
{card-list-item}
窄屏「编辑 / 预览」双标签
{/card-list-item}
{/card-list}

{abtn color="#6eb934" href="https://losn.cc" radius="6" content="去鱼窝看看"/}

{anote color="#409eff" href="https://losn.cc" radius="6" content="这是一张便条按钮"/}

{dotted startColor="#ff6c6c" endColor="#6eb934"/}

## 媒体与布局

{bilibili bvid="BV1GJ411x7h7" page="1"/}

{music id="5264842"/}

{cloud type="bd" title="鱼窝资源包（演示）" url="https://pan.baidu.com/s/demo" password="yuwu"/}

{gird column="3" gap="15"}
{gird-item}
宫格一
{/gird-item}
{gird-item}
宫格二
{/gird-item}
{gird-item}
宫格三
{/gird-item}
{/gird}

## 配图

![编辑器全貌](https://mdn.alipayobjects.com/asap_serivce/uri/file/as/upload_image_e864f53507464e88af31438a225e526d.png)

---

写到这里，全部功能就演示完了。

{mtitle title="谢谢观看"/}
`;

/* ---------- 短代码：自研实现，兼容 {xxx} 语法 ---------- */
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function attrs(str) {
  const o = {}; const re = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g; let m;
  while ((m = re.exec(str))) o[m[1]] = m[2];
  return o;
}
/* 块级容器内文走 Markdown 解析；单段内容去掉外层 <p>，避免容器里多出空隙 */
function mdBlock(s) {
  const html = marked.parse(s.trim());
  return html.replace(/^<p>([\s\S]*)<\/p>\n?$/, (t, inner) => (inner.includes("<p>") ? t : inner));
}
function renderShortcodes(src) {
  // 行内样式：颜色 / 字号（内容仍走 Markdown 解析，可嵌套）
  src = src.replace(/\{color([^}]*)\}([\s\S]*?)\{\/color\}/g, (_, a, inner) => {
    const o = attrs(a); return `<span style="color:${esc(o.color || "inherit")}">${inner}</span>`;
  });
  src = src.replace(/\{size([^}]*)\}([\s\S]*?)\{\/size\}/g, (_, a, inner) => {
    const o = attrs(a); const s = o.size || "inherit";
    return `<span style="font-size:${/^\d+(\.\d+)?$/.test(s) ? s + "px" : esc(s)}">${inner}</span>`;
  });
  // 自闭合
  src = src.replace(/\{mtitle([^}]*)\/\}/g, (_, a) => {
    const t = attrs(a).title || ""; return `<div class="fw-mtitle"><span>${t}</span></div>`;
  });
  src = src.replace(/\{progress([^}]*)\/\}/g, (_, a) => {
    const o = attrs(a); const p = Math.min(100, Math.max(0, parseFloat(o.percentage) || 0)); const c = o.color || "#409eff";
    return `<div class="fw-progress"><div class="fw-progress-strip"><div class="fw-progress-bar" style="width:${p}%;background:${c}"></div></div><span class="fw-progress-num">${p}%</span></div>`;
  });
  src = src.replace(/\{lamp\/\}/g, `<div class="fw-lamp"></div>`);
  src = src.replace(/\{abtn([^}]*)\/\}/g, (_, a) => {
    const o = attrs(a); return `<a class="fw-abtn" style="background:${o.color || "#409eff"};border-radius:${o.radius || 6}px" href="${o.href || "javascript:void(0)"}" target="_blank" rel="noopener">${o.content || "按钮"}</a>`;
  });
  src = src.replace(/\{anote([^}]*)\/\}/g, (_, a) => {
    const o = attrs(a); return `<a class="fw-anote" style="background:${o.color || "#409eff"};border-radius:${o.radius || 6}px" href="${o.href || "javascript:void(0)"}" target="_blank" rel="noopener"><span class="fw-anote-icon">✎</span><span class="fw-anote-text">${o.content || "便条"}</span></a>`;
  });
  src = src.replace(/\{dotted([^}]*)\/\}/g, (_, a) => {
    const o = attrs(a); return `<div class="fw-dotted" style="background:linear-gradient(90deg,${o.startColor || "#ccc"} 50%,transparent 50%)"></div>`;
  });
  // B站视频：官方外链播放器
  src = src.replace(/\{bilibili([^}]*)\/\}/g, (_, a) => {
    const o = attrs(a); const bvid = (o.bvid || "").trim();
    if (!bvid) return `<div class="fw-media-tip">B站视频：请填写 bvid</div>`;
    const page = parseInt(o.page) || 1;
    return `<div class="fw-video"><iframe src="https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&page=${page}&autoplay=0" allowfullscreen="true" scrolling="no" frameborder="0"></iframe></div>`;
  });
  // 网易云音乐：官方外链播放器
  src = src.replace(/\{music([^}]*)\/\}/g, (_, a) => {
    const o = attrs(a); const id = (o.id || "").trim();
    if (!id) return `<div class="fw-media-tip">网易云音乐：请填写歌曲 id</div>`;
    return `<div class="fw-music"><iframe src="https://music.163.com/outchain/player?type=2&id=${encodeURIComponent(id)}&autoplay=0" frameborder="0"></iframe></div>`;
  });
  // 云盘下载卡片
  src = src.replace(/\{cloud([^}]*)\/\}/g, (_, a) => {
    const o = attrs(a);
    const names = { default: "默认网盘", "360": "360网盘", bd: "百度网盘", ty: "天翼网盘", ct: "城通网盘", wy: "微云网盘", github: "GitHub 仓库", lz: "蓝奏云网盘" };
    const type = o.type || "default";
    return `<span class="fw-cloud"><span class="fw-cloud-logo">${ico("cloud-download")}</span><span class="fw-cloud-desc"><span class="fw-cloud-title">${esc(o.title || "默认标题")}</span><span class="fw-cloud-type">来源：${esc(names[type] || type)}${o.password ? " | 提取码：" + esc(o.password) : ""}</span></span><a class="fw-cloud-btn" href="${o.url || "#"}" target="_blank" rel="noopener" title="下载">${ico("download")}</a></span>`;
  });
  // 宫格：兼容 Joe 的 {gird} 拼写，也支持 {grid}
  src = src.replace(/\{g(?:ird|rid)([^}]*)\}([\s\S]*?)\{\/g(?:ird|rid)\}/g, (_, a, body) => {
    const o = attrs(a);
    const col = Math.min(6, Math.max(1, parseInt(o.column) || 3));
    const gap = parseInt(o.gap) || 15;
    let items = ""; let m;
    const re = /\{g(?:ird|rid)-item([^}]*)\}([\s\S]*?)\{\/g(?:ird|rid)-item\}/g;
    while ((m = re.exec(body))) items += `<div class="fw-grid-item">${mdBlock(m[2])}</div>`;
    return `<div class="fw-grid" style="grid-template-columns:repeat(${col},1fr);gap:${gap}px">${items}</div>`;
  });
  // 包裹型：先内层后外层
  src = src.replace(/\{callout([^}]*)\}([\s\S]*?)\{\/callout\}/g, (_, a, body) => {
    const c = attrs(a).color || "#409eff"; return `<div class="fw-callout" style="border-left-color:${c}">${mdBlock(body)}</div>`;
  });
  src = src.replace(/\{alert([^}]*)\}([\s\S]*?)\{\/alert\}/g, (_, a, body) => {
    const t = attrs(a).type || "info";
    const icons = { success: "✓", info: "ℹ", warning: "⚠", error: "✕" };
    return `<div class="fw-alert fw-alert-${t}"><span class="fw-alert-icon">${icons[t] || "ℹ"}</span><div>${mdBlock(body)}</div></div>`;
  });
  src = src.replace(/\{timeline\}([\s\S]*?)\{\/timeline\}/g, (_, body) => {
    let items = ""; let m;
    const re = /\{timeline-item([^}]*)\}([\s\S]*?)\{\/timeline-item\}/g;
    while ((m = re.exec(body))) {
      const c = attrs(m[1]).color || "#19be6b";
      items += `<div class="fw-tl-item"><div class="fw-tl-line"></div><div class="fw-tl-dot" style="border-color:${c}"></div><div class="fw-tl-body">${mdBlock(m[2])}</div></div>`;
    }
    return `<div class="fw-timeline">${items}</div>`;
  });
  src = src.replace(/\{collapse\}([\s\S]*?)\{\/collapse\}/g, (_, body) => {
    let items = ""; let m; let i = 0;
    const re = /\{collapse-item([^}]*)\}([\s\S]*?)\{\/collapse-item\}/g;
    while ((m = re.exec(body))) {
      const o = attrs(m[1]); const open = "open" in o;
      items += `<div class="fw-cl-item${open ? " open" : ""}"><div class="fw-cl-head" data-fw-cl="${i}"><span>${esc(o.label || "折叠项")}</span><svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg></div><div class="fw-cl-wrap"><div class="fw-cl-body">${mdBlock(m[2])}</div></div></div>`;
      i++;
    }
    return `<div class="fw-collapse">${items}</div>`;
  });
  src = src.replace(/\{tabs\}([\s\S]*?)\{\/tabs\}/g, (_, body) => {
    let heads = ""; let panes = ""; let m; let i = 0;
    const re = /\{tabs-pane([^}]*)\}([\s\S]*?)\{\/tabs-pane\}/g;
    while ((m = re.exec(body))) {
      const label = esc(attrs(m[1]).label || `标签${i + 1}`);
      heads += `<div class="fw-tab-head${i === 0 ? " active" : ""}" data-fw-tab="${i}">${label}</div>`;
      panes += `<div class="fw-tab-pane${i === 0 ? " active" : ""}">${mdBlock(m[2])}</div>`;
      i++;
    }
    return `<div class="fw-tabs"><div class="fw-tab-bar">${heads}</div>${panes}</div>`;
  });
  src = src.replace(/\{card-describe([^}]*)\}([\s\S]*?)\{\/card-describe\}/g, (_, a, body) => {
    const t = esc(attrs(a).title || "描述");
    return `<div class="fw-cd"><div class="fw-cd-title">${t}</div><div class="fw-cd-body">${mdBlock(body)}</div></div>`;
  });
  src = src.replace(/\{card-list[^}]*\}([\s\S]*?)\{\/card-list\}/g, (_, body) => {
    let items = ""; let m;
    const re = /\{card-list-item[^}]*\}([\s\S]*?)\{\/card-list-item\}/g;
    while ((m = re.exec(body))) items += `<div class="fw-cl2-item">${mdBlock(m[1])}</div>`;
    return `<div class="fw-card-list">${items}</div>`;
  });
  return src;
}

function renderPreview(src) {
  let src2 = renderShortcodes(src);
  /* {center} 块：先取出单独渲染，再包居中容器回填 */
  const centerBlocks = [];
  src2 = src2.replace(/\{center\}([\s\S]*?)\{\/center\}/g, (_, inner) => {
    /* 容器内文已先经过一次 Markdown 解析，边界可能带 <br>，去掉再解析避免多余空行 */
    inner = inner.replace(/^(?:\s|<br\s*\/?>)+/i, "").replace(/(?:\s|<br\s*\/?>)+$/i, "");
    centerBlocks.push(`<div class="fw-center">${marked.parse(inner.trim())}</div>`);
    return `\n<!--YUWUCENTER${centerBlocks.length - 1}-->\n`;
  });
  let html = marked.parse(src2);
  html = html.replace(/<!--YUWUCENTER(\d+)-->/g, (_, i) => centerBlocks[+i]);
  return html;
}

/* ---------- 代码块增强：语言标识 + 一键复制 ---------- */
function copyText(text, done) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch (e) {}
  ta.remove();
}
function enhanceCodeBlocks(root) {
  root.querySelectorAll("pre > code").forEach(code => {
    const pre = code.parentElement;
    if (pre.parentElement?.classList.contains("fw-code")) return;
    const lang = (code.className.match(/language-([\w+#.-]+)/) || [])[1] || "text";
    const wrap = document.createElement("div");
    wrap.className = "fw-code";
    const head = document.createElement("div");
    head.className = "fw-code-head";
    head.innerHTML = `<span class="fw-code-lang">${lang}</span><button type="button" class="fw-code-copy">${ico("copy")}<span>复制</span></button>`;
    pre.replaceWith(wrap);
    wrap.appendChild(head);
    wrap.appendChild(pre);
  });
}

/* ---------- 预览交互（折叠/标签页/复制代码） ---------- */
function bindPreviewEvents(preview) {
  preview.addEventListener("click", (e) => {
    const cp = e.target.closest(".fw-code-copy");
    if (cp) {
      const code = cp.closest(".fw-code")?.querySelector("pre code");
      if (!code) return;
      copyText(code.textContent || "", () => {
        const prev = cp.innerHTML;
        cp.innerHTML = `${ico("check")}<span>已复制</span>`;
        cp.classList.add("ok");
        setTimeout(() => { cp.innerHTML = prev; cp.classList.remove("ok"); }, 1500);
      });
      return;
    }
    const cl = e.target.closest("[data-fw-cl]");
    if (cl) { cl.parentElement.classList.toggle("open"); return; }
    const tb = e.target.closest("[data-fw-tab]");
    if (tb) {
      const root = tb.closest(".fw-tabs");
      root.querySelectorAll(".fw-tab-head").forEach(h => h.classList.toggle("active", h === tb));
      root.querySelectorAll(".fw-tab-pane").forEach((p, i) => p.classList.toggle("active", i === Number(tb.dataset.fwTab)));
    }
  });
}

/* ---------- 编辑动作 ---------- */
function wrap(view, mark) {
  const { state } = view; const { from, to } = state.selection.main;
  const sel = state.sliceDoc(from, to);
  view.dispatch({ changes: { from, to, insert: mark + (sel || "文字") + mark } });
  view.focus();
}
function wrapPair(view, pre, suf) {
  const { state } = view; const { from, to } = state.selection.main;
  const sel = state.sliceDoc(from, to);
  view.dispatch({ changes: { from, to, insert: pre + (sel || "文字") + suf } });
  view.focus();
}
function linePrefix(view, prefix, accumulate) {
  const { state } = view; const { from, to } = state.selection.main;
  const startLine = state.doc.lineAt(from).number, endLine = state.doc.lineAt(to).number;
  const changes = [];
  for (let n = startLine; n <= endLine; n++) {
    const line = state.doc.line(n);
    /* accumulate：每次点击都在行首再套一层（引用嵌套用）；否则已有前缀就跳过 */
    if (accumulate || !line.text.startsWith(prefix)) changes.push({ from: line.from, to: line.from, insert: prefix });
  }
  if (changes.length) view.dispatch({ changes });
  view.focus();
}

/* 列表前缀：识别与剥离 */
const LIST_TYPES = [
  { name: "ul", re: /^- (?!\[)/, prefix: () => "- " },
  { name: "ol", re: /^\d+\. /, prefix: n => `${n}. ` },
  { name: "todo", re: /^- \[ \] /, prefix: () => "- [ ] " },
  { name: "done", re: /^- \[x\] /, prefix: () => "- [x] " },
];
function listKind(text) { return LIST_TYPES.find(t => t.re.test(text)) || null; }

/* 列表按钮：同类型再点一次=取消；不同类型直接切换；多行有序列表自动编号 */
function listToggle(view, type) {
  const { state } = view; const { from, to } = state.selection.main;
  const startLine = state.doc.lineAt(from).number, endLine = state.doc.lineAt(to).number;
  const lines = [];
  for (let n = startLine; n <= endLine; n++) lines.push(state.doc.line(n));
  const kinds = lines.map(l => listKind(l.text));
  const allSame = kinds.every(k => k && k.name === type);
  const changes = [];
  let firstFrom = null;
  lines.forEach((line, i) => {
    const k = kinds[i];
    const stripped = k ? line.text.slice(k.re.exec(line.text)[0].length) : line.text;
    if (allSame) { /* 再点一次：取消列表 */
      changes.push({ from: line.from, to: line.from + line.text.length, insert: stripped });
      return;
    }
    const insert = type === "ol" ? `${i + 1}. ` : LIST_TYPES.find(t => t.name === type).prefix();
    changes.push({ from: line.from, to: line.from + line.text.length, insert: insert + stripped });
    if (firstFrom === null) firstFrom = { line, len: insert.length };
  });
  if (changes.length) {
    const { anchor, head } = state.selection.main;
    const sel = (anchor === head && firstFrom)
      ? { anchor: firstFrom.line.from + firstFrom.len }
      : undefined;
    view.dispatch({ changes, selection: sel, scrollIntoView: true });
  }
  view.focus();
}

/* 回车：列表行自动续接；空列表项回车=去掉前缀退出列表 */
function listEnter(view) {
  const { state } = view; const { from } = state.selection.main;
  const line = state.doc.lineAt(from);
  const k = listKind(line.text);
  if (!k) return false;
  const content = line.text.slice(k.re.exec(line.text)[0].length);
  if (!content.trim()) {
    /* 空列表项：回车退出列表，删掉前缀 */
    view.dispatch({ changes: { from: line.from, to: line.from + line.text.length, insert: "" }, selection: { anchor: line.from } });
    return true;
  }
  const num = /^\d+\. /.exec(line.text);
  const nextPrefix = num ? `${parseInt(num[0], 10) + 1}. ` : k.prefix();
  view.dispatch({ changes: { from: from, insert: "\n" + nextPrefix }, selection: { anchor: from + 1 + nextPrefix.length } });
  return true;
}
function insert(view, text) {
  const { from, to } = view.state.selection.main;
  view.dispatch({ changes: { from, to, insert: text } });
  view.focus();
}
function insertTime(view) {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  insert(view, `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
}
/* 居中开关：选中内容包 {center}，已包裹则解开；空选区插入骨架 */
function centerToggle(view) {
  const sel = view.state.selection.main;
  const text = view.state.sliceDoc(sel.from, sel.to);
  if (/^\{center\}\n?[\s\S]*\n?\{\/center\}$/.test(text)) {
    const inner = text.replace(/^\{center\}\n?/, "").replace(/\n?\{\/center\}$/, "");
    view.dispatch({ changes: { from: sel.from, to: sel.to, insert: inner } });
  } else if (text) {
    view.dispatch({ changes: { from: sel.from, to: sel.to, insert: `{center}\n${text}\n{/center}` } });
  } else {
    view.dispatch({
      changes: { from: sel.from, insert: `{center}\n\n{/center}` },
      selection: { anchor: sel.from + 9 },
    });
  }
  view.focus();
  return true;
}

/* ---------- 色板（文字颜色） ---------- */
const PALETTE = [
  "#000000", "#595959", "#8a97a5", "#ffffff",
  "#e74c3c", "#ff6c6c", "#f39c12", "#f0ad4e",
  "#6eb934", "#19be6b", "#00b8a9", "#409eff",
  "#2d8cf0", "#50bfff", "#6236ff", "#9c27b0",
  "#ff69b4", "#8b4513",
];
let paletteEl = null, paletteSel = null, paletteBtn = null;
function buildPalette() {
  const p = document.createElement("div");
  p.className = "fw-palette";
  PALETTE.forEach(c => {
    const s = document.createElement("button");
    s.type = "button"; s.className = "fw-swatch"; s.title = c;
    s.style.background = c;
    if (c === "#ffffff") s.classList.add("fw-swatch-light");
    s.addEventListener("click", e => { e.stopPropagation(); applyColor(c); });
    p.appendChild(s);
  });
  const custom = document.createElement("input");
  custom.type = "color"; custom.className = "fw-swatch-custom";
  custom.title = "自定义颜色"; custom.value = "#e74c3c";
  custom.addEventListener("input", () => applyColor(custom.value));
  custom.addEventListener("click", e => e.stopPropagation());
  p.appendChild(custom);
  return p;
}
function closePalette() {
  if (paletteEl) { paletteEl.remove(); paletteEl = null; }
  paletteBtn = null;
}
function togglePalette(btn) {
  if (paletteEl) { closePalette(); return; }
  /* 点面板会让编辑器失焦，先存当前选区 */
  paletteBtn = btn;
  const sel = view.state.selection.main;
  paletteSel = { from: sel.from, to: sel.to, text: view.state.sliceDoc(sel.from, sel.to) };
  paletteEl = buildPalette();
  document.body.appendChild(paletteEl);
  const r = btn.getBoundingClientRect();
  const pw = paletteEl.offsetWidth, ph = paletteEl.offsetHeight;
  let left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
  let top = r.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
  paletteEl.style.left = left + "px";
  paletteEl.style.top = top + "px";
}
function applyColor(c) {
  closePalette();
  const s = paletteSel || { from: view.state.selection.main.from, to: view.state.selection.main.to, text: "" };
  view.dispatch({ changes: { from: s.from, to: s.to, insert: `{color color="${c}"}${s.text || "文字"}{/color}` } });
  paletteSel = null;
  view.focus();
}
document.addEventListener("click", e => {
  if (!paletteEl || paletteEl.contains(e.target)) return;
  /* 颜色按钮自身的点击由 togglePalette 切换，不在此关闭 */
  if (paletteBtn && (e.target === paletteBtn || paletteBtn.contains(e.target))) return;
  closePalette();
});

/* ---------- 工具栏（对齐 Joe 功能，Lucide 图标） ---------- */
const ico = n => ICONS[n] || n;
const TOOLBAR = [
  { title: "撤销", icon: "undo-2", run: v => { undo(v); v.focus(); } },
  { title: "重做", icon: "redo-2", run: v => { redo(v); v.focus(); } },
  { sep: true },
  { title: "加粗", icon: "bold", run: v => wrap(v, "**") },
  { title: "倾斜", icon: "italic", run: v => wrap(v, "*") },
  { title: "删除线", icon: "strikethrough", run: v => wrap(v, "~~") },
  { title: "行内代码", icon: "code", run: v => wrap(v, "`") },
  { title: "横线", icon: "minus", run: v => insert(v, "\n---\n") },
  { sep: true },
  { title: "一级标题", text: "H1", run: v => linePrefix(v, "# ") },
  { title: "二级标题", text: "H2", run: v => linePrefix(v, "## ") },
  { title: "三级标题", text: "H3", run: v => linePrefix(v, "### ") },
  { sep: true },
  { title: "引用", icon: "quote", run: v => linePrefix(v, "> ", true) },
  { title: "无序列表", icon: "list", run: v => listToggle(v, "ul") },
  { title: "有序列表", icon: "list-ordered", run: v => listToggle(v, "ol") },
  { title: "任务 - 未完成", icon: "list-todo", run: v => listToggle(v, "todo") },
  { title: "任务 - 已完成", icon: "list-checks", run: v => listToggle(v, "done") },
  { sep: true },
  { title: "超链接", icon: "link", run: v => insert(v, "[链接文字](https://)") },
  { title: "插入图片", icon: "image-plus", run: v => insert(v, "![图片描述](图片地址)") },
  { title: "表格", icon: "table", run: v => insert(v, "\n| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n") },
  { title: "代码块", icon: "braces", run: v => insert(v, "\n```python\ncode here\n```\n") },
  { title: "当前时间", icon: "clock", run: insertTime },
  { sep: true },
  { title: "居中标题", icon: "align-center", run: v => insert(v, "{mtitle title=\"居中标题\"/}\n") },
  { title: "居中（选中内容，Ctrl+E）", icon: "align-center-horizontal", run: centerToggle },
  { title: "文字颜色", icon: "palette", run: (v, b) => togglePalette(b) },
  { title: "文字字号", icon: "type", run: v => wrapPair(v, `{size size=\"18\"}`, `{/size}`) },
  { title: "进度条", icon: "gauge", run: v => insert(v, "{progress percentage=\"60\" color=\"#6eb934\"/}\n") },
  { title: "提示", icon: "message-square", run: v => insert(v, "{callout color=\"#f0ad4e\"}\n提示内容\n{/callout}\n") },
  { title: "消息提示", icon: "alert-triangle", run: v => insert(v, "{alert type=\"info\"}\n消息内容\n{/alert}\n") },
  { title: "折叠面板", icon: "chevron-down-square", run: v => insert(v, "{collapse}\n{collapse-item label=\"折叠标题\" open}\n内容\n{/collapse-item}\n{/collapse}\n") },
  { title: "标签页", icon: "panels-top-left", run: v => insert(v, "{tabs}\n{tabs-pane label=\"标签一\"}\n内容一\n{/tabs-pane}\n{tabs-pane label=\"标签二\"}\n内容二\n{/tabs-pane}\n{/tabs}\n") },
  { title: "时间轴", icon: "history", run: v => insert(v, "{timeline}\n{timeline-item color=\"#19be6b\"}\n节点一\n{/timeline-item}\n{timeline-item color=\"#ed4014\"}\n节点二\n{/timeline-item}\n{/timeline}\n") },
  { title: "描述卡片", icon: "file-text", run: v => insert(v, "{card-describe title=\"描述\"}\n内容\n{/card-describe}\n") },
  { title: "卡片列表", icon: "list-checks", run: v => insert(v, "{card-list title=\"卡片列表\"}\n{card-list-item}\n列表项\n{/card-list-item}\n{/card-list}\n") },
  { title: "多彩按钮", icon: "mouse-pointer-click", run: v => insert(v, "{abtn color=\"#6eb934\" href=\"https://\" radius=\"6\" content=\"按钮\"/}\n") },
  { title: "便条按钮", icon: "sticky-note", run: v => insert(v, "{anote color=\"#409eff\" href=\"https://\" radius=\"6\" content=\"便条\"/}\n") },
  { title: "彩色虚线", icon: "activity", run: v => insert(v, "{dotted startColor=\"#ff6c6c\" endColor=\"#6eb934\"/}\n") },
  { title: "跑马灯", icon: "zap", run: v => insert(v, "{lamp/}\n") },
  { sep: true },
  { title: "B站视频", icon: "monitor-play", run: v => insert(v, '{bilibili bvid="BV号" page="1"/}\n') },
  { title: "网易云音乐", icon: "music", run: v => insert(v, '{music id="歌曲ID"/}\n') },
  { title: "云盘下载", icon: "cloud-download", run: v => insert(v, '{cloud type="bd" title="网盘文件" url="https://" password="提取码"/}\n') },
  { title: "宫格", icon: "layout-grid", run: v => insert(v, '{gird column="3" gap="15"}\n{gird-item}\n格子内容\n{/gird-item}\n{gird-item}\n格子内容\n{/gird-item}\n{gird-item}\n格子内容\n{/gird-item}\n{/gird}\n') },
];

/* ---------- 主题色 ---------- */
/* 颜色走 CSS 变量（浅色为回退默认值），嵌入模式由宿主主题覆盖变量实现深色跟随 */
const fwHighlight = HighlightStyle.define([
  { tag: tags.heading1, color: "var(--yw-ed-ink, #1f2d3d)", fontWeight: "700", fontSize: "1.15em" },
  { tag: tags.heading2, color: "var(--yw-ed-ink, #1f2d3d)", fontWeight: "700" },
  { tag: tags.heading3, color: "var(--yw-ed-ink, #1f2d3d)", fontWeight: "600" },
  { tag: tags.strong, color: "var(--yw-ed-strong, #c7254e)", fontWeight: "700" },
  { tag: tags.emphasis, color: "var(--yw-ed-em, #8a6d3b)", fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "var(--yw-ed-muted, #999)" },
  { tag: tags.link, color: "#409eff" },
  { tag: tags.monospace, color: "var(--yw-ed-code-inline, #e96900)", background: "var(--yw-ed-code-inline-bg, #f8f8f8)" },
  { tag: [tags.quote], color: "var(--yw-ed-muted, #7f8c9b)", fontStyle: "italic" },
  { tag: [tags.list, tags.contentSeparator], color: "var(--yw-ed-ink, #1f2d3d)" },
  { tag: tags.processingInstruction, color: "var(--yw-ed-muted, #8a97a5)" },
]);

const editorTheme = EditorView.theme({
  "&": { fontSize: "14.5px", height: "100%", background: "var(--yw-ed-bg, #fff)" },
  ".cm-scroller": { fontFamily: `-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`, lineHeight: "1.75", padding: "14px 4px" },
  ".cm-content": { caretColor: "#409eff", color: "var(--yw-ed-ink, #1f2d3d)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#409eff", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { background: "var(--yw-ed-sel, #d6e9ff)" },
  ".cm-activeLine": { background: "var(--yw-ed-activeline, #f7fafc)" },
  ".cm-gutters": { background: "var(--yw-ed-gutter-bg, #fafbfc)", color: "var(--yw-ed-gutter-fg, #b3bec7)", border: "none", minWidth: "44px" },
  ".cm-activeLineGutter": { background: "var(--yw-ed-activeline, #eef2f5)", color: "var(--yw-ed-gutter-fg-active, #5a6b7b)" },
});

/* ---------- 工厂：演示页与嵌入模式共用 ---------- */
let view = null;
function createYuwuEditor(opts) {
  const editorEl = opts.editorEl;
  const previewEl = opts.previewEl || null;
  const statusEl = opts.statusEl || null;
  const wordCountEl = opts.wordCountEl || null;
  const draftKey = opts.draftKey || null;
  if (previewEl) bindPreviewEvents(previewEl);

  let saveTimer = null;
  function updateWordCount() {
    if (!wordCountEl || !previewEl) return;
    const clone = previewEl.cloneNode(true);
    clone.querySelectorAll(".fw-code-head").forEach(n => n.remove()); /* 复制按钮等控件不计入 */
    wordCountEl.textContent = (clone.textContent || "").replace(/\s/g, "").length + " 字";
  }
  function updatePreview() {
    if (!previewEl) return;
    previewEl.innerHTML = renderPreview(view.state.doc.toString());
    enhanceCodeBlocks(previewEl);
    updateWordCount();
  }
  function scheduleSave() {
    if (!statusEl || !draftKey) return;
    statusEl.textContent = "输入中…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, view.state.doc.toString());
        const t = new Date();
        statusEl.textContent = `草稿已自动保存 ${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      } catch (e) { statusEl.textContent = "草稿保存失败（存储空间不足）"; }
    }, 600);
  }

  /* 嵌套代码块：按围栏语言名匹配，未匹配的退回纯文本 */
  const codeLangs = {
    python: () => python(),
    javascript: () => javascript(),
    typescript: () => javascript({ typescript: true }),
    bash: () => new LanguageSupport(StreamLanguage.define(shell)),
    sh: () => new LanguageSupport(StreamLanguage.define(shell)),
  };
  const mdLang = markdown({
    base: markdownLanguage,
    codeLanguages: (info) => (codeLangs[info?.toLowerCase()]?.() ?? null),
  });

  const v = new EditorView({
    parent: editorEl,
    state: EditorState.create({
      doc: (draftKey && localStorage.getItem(draftKey)) || opts.initialDoc || "",
      extensions: [
        lineNumbers(),
        history(),
        search(),
        highlightSelectionMatches(),
        closeBrackets(),
        keymap.of([
          indentWithTab,
          { key: "Enter", run: listEnter },
          { key: "Mod-e", run: centerToggle },
          ...historyKeymap,
          ...searchKeymap,
        ]),
        mdLang,
        syntaxHighlighting(fwHighlight),
        editorTheme,
        EditorView.domEventHandlers({
          paste(e, v) {
            const text = e.clipboardData?.getData("text/plain");
            if (!text || !/^https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp|svg)(\?\S*)?$/i.test(text.trim())) return false;
            e.preventDefault();
            const url = text.trim();
            v.dispatch({ changes: { from: v.state.selection.main.from, to: v.state.selection.main.to, insert: `![图片](${url})` } });
            return true;
          },
        }),
        EditorView.updateListener.of(u => {
          if (u.docChanged) { updatePreview(); scheduleSave(); if (opts.onChange) opts.onChange(); }
        }),
      ],
    }),
  });
  view = v;

  /* 工具栏渲染 */
  if (opts.toolbarEl) {
    TOOLBAR.forEach(item => {
      if (item.sep) { opts.toolbarEl.appendChild(Object.assign(document.createElement("span"), { className: "tb-sep" })); return; }
      const b = document.createElement("button");
      b.type = "button"; b.title = item.title;
      b.innerHTML = item.icon ? ico(item.icon) : `<span class="tb-text">${item.text}</span>`;
      b.addEventListener("click", () => item.run(v, b));
      opts.toolbarEl.appendChild(b);
    });
  }

  updatePreview();
  return {
    view: v,
    get: () => v.state.doc.toString(),
    set: (text) => {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text || "" } });
      v.focus();
    },
    focus: () => v.focus(),
  };
}

/* 嵌入模式：由宿主页面调用 YuwuEditor.create；演示页自动启动 */
window.YuwuEditor = {
  create: createYuwuEditor,
  renderPreview,
  enhance: enhanceCodeBlocks,
  bindPreviewEvents,
};

/* ---------- 演示页启动 ---------- */
if (!window.YW_EMBED_ONLY) {
  const DRAFT_KEY = "yuwu_draft_v2_" + (location.pathname || "default");
  const editorEl = document.getElementById("editor");
  const previewEl = document.getElementById("preview");
  const statusEl = document.getElementById("save-status");
  const inst = createYuwuEditor({
    editorEl,
    previewEl,
    statusEl,
    toolbarEl: document.getElementById("toolbar"),
    wordCountEl: document.getElementById("word-count"),
    draftKey: DRAFT_KEY,
    initialDoc: DEFAULT_DOC,
  });
  window.__view = inst.view; /* 调试句柄 */

  /* 顶栏按钮注入 Lucide 图标 */
  const TOPBAR_ICONS = [
    ["btn-image", "image-plus"], ["btn-export", "download"], ["btn-preview", "eye"],
    ["btn-fullscreen", "maximize"], ["btn-about", "info"], ["btn-home", "home"],
  ];
  TOPBAR_ICONS.forEach(([id, name]) => {
    const b = document.getElementById(id);
    if (!b) return;
    const label = b.textContent.trim();
    b.innerHTML = ico(name) + `<span class="tbtn-label">${label}</span>`;
  });

  /* 分隔条拖动 */
  const divider = document.getElementById("divider");
  let dragging = false;
  divider.addEventListener("pointerdown", e => { dragging = true; divider.setPointerCapture(e.pointerId); document.body.style.cursor = "col-resize"; });
  divider.addEventListener("pointermove", e => {
    if (!dragging) return;
    const wrapRect = document.getElementById("split").getBoundingClientRect();
    const pct = Math.min(80, Math.max(20, ((e.clientX - wrapRect.left) / wrapRect.width) * 100));
    editorEl.style.width = pct + "%";
  });
  divider.addEventListener("pointerup", () => { dragging = false; document.body.style.cursor = ""; });

  /* 预览开关（手机上由「编辑/预览」双标签接管） */
  const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;
  const previewWrap = document.getElementById("preview-wrap");
  document.getElementById("btn-preview").addEventListener("click", () => {
    if (isNarrow()) { document.body.classList.toggle("m-preview"); return; }
    const off = previewWrap.style.display === "none";
    previewWrap.style.display = off ? "" : "none";
    divider.style.display = off ? "" : "none";
  });

  /* 窄屏「编辑 / 预览」双标签 */
  const mobileTabs = document.getElementById("mobile-tabs");
  mobileTabs.addEventListener("click", e => {
    const b = e.target.closest("button[data-m]");
    if (!b) return;
    document.body.classList.toggle("m-preview", b.dataset.m === "preview");
    mobileTabs.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
  });

  /* 全屏 */
  document.getElementById("btn-fullscreen").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });

  /* 导出 .md */
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([inst.get()], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "日记_" + new Date().toISOString().slice(0, 10) + ".md";
    a.click(); URL.revokeObjectURL(a.href);
  });

  /* 关于（自家的，随便看） */
  document.getElementById("btn-about").addEventListener("click", () => {
    const modal = document.createElement("div");
    modal.className = "fw-modal";
    modal.innerHTML = `<div class="fw-modal-box">
      <div class="fw-modal-head">关于本编辑器<span class="fw-modal-close">✕</span></div>
      <ul>
        <li>编辑器内核：CodeMirror 6（MIT 协议）</li>
        <li>外壳、工具栏与短代码渲染：鱼窝自研</li>
        <li>图标：Lucide（ISC 协议）</li>
        <li>草稿自动保存在本机浏览器，不上传</li>
      </ul>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if (e.target === modal || e.target.classList.contains("fw-modal-close")) modal.remove(); });
  });

  /* 贴图：暂以本地预览插入，正式接入后改为直传服务器 */
  document.getElementById("btn-image").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const f = input.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => insert(inst.view, `\n![${f.name}](${rd.result})\n`);
      rd.readAsDataURL(f);
    };
    input.click();
  });
  inst.view.dom.addEventListener("paste", e => {
    const f = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith("image/"));
    if (f) {
      e.preventDefault();
      const rd = new FileReader();
      rd.onload = () => insert(inst.view, `\n![截图](${rd.result})\n`);
      rd.readAsDataURL(f);
    }
  });

  statusEl.textContent = localStorage.getItem(DRAFT_KEY) ? "已恢复上次草稿" : "新日记";
}
