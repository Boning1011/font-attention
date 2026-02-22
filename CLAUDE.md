# CLAUDE.md

## 工作规范

- 每次修改代码后，自动执行 git commit 并 push 到远程仓库。
- 每次对话结束前，检查 README.md 是否需要更新（进度、新功能、变更）。
- 遇到新的规律、约定、踩坑，或做出重要技术决策时，**主动更新本文件（CLAUDE.md）**，把有用的上下文记录下来。CLAUDE.md 应该是活的文档，不是静态存档。

---

## 参考文档（开始任何相关工作前先查）

| 涉及内容 | 去哪里看 |
|---------|---------|
| 项目目标、核心概念、技术路线、开放问题 | `doc/PROJECT_DIRECTION.md` |
| Roboto Flex 字体的轴参数、范围、CSS 用法、限制 | `doc/roboto-flex.md` |

**规则**：凡是涉及字体参数、轴范围、CSS font-variation-settings 的工作，**必须先读 `doc/roboto-flex.md`**，不要凭记忆或猜测写数值。

---

## 项目背景（快速上手）

**项目名**: font-attention
**方向**: 用 LLM 的 attention 权重实时驱动可变字体参数，让每个 token 的字形随模型内部状态变化。
**核心管线**: Token → Attention → Font Axis Values → Rendered Glyph

**字体**: 支持多种 Google Variable Fonts（通过 Google Fonts API 运行时获取轴元数据）
**默认字体**: Roboto Flex（13 个可变轴，Apache 2.0）
**渲染端**: 纯 Web（HTML/CSS/JS），Google Fonts CDN 加载字体

---

## 当前项目进度

### Session 1（2026-02-21）— 已完成
- 搭建静态 token 渲染器 (`index.html`)
  - 每个 token 一个 `<span>`，`font-variation-settings` 控制 `wght` + `slnt`
  - `font-kerning: none` 避免跨 token 边界的 kerning 问题
  - CSS `transition` 做平滑过渡（0.4s ease）
- 确定主字体：Roboto Flex
- 记录字体完整规格：`doc/roboto-flex.md`
- Lorem Ipsum 占位数据，非公约数相位驱动（wght: ±80 around 400，slnt: −4..0）

### Session 2（2026-02-21）— 已完成
- 代码重构：单文件 → 模块化（ES modules）
  - `index.html` → 极简 HTML shell
  - `css/style.css` → 所有样式
  - `js/renderer.js` → 渲染引擎（appendToken, updateAxes, clearStage, getTokenCount）
  - `js/mock-driver.js` → mock 数据源 + 流式驱动（streamTokens）
  - `js/main.js` → 入口
- Token 流式出现：`streamTokens(tokens, interval)` 逐个添加
- Axis 平滑变化：每次新增 token 时重算所有前序 token 的 axis（模拟 attention 重分布）
- 入场动画：fade-in + scale（@keyframes token-enter, 250ms）
- 渲染层与数据源解耦：renderer 不知道数据从哪来，driver 可替换

### Session 3（2026-02-22）— 已完成
- 多字体支持架构重构
  - `js/font-registry.js` — 极简字体列表（只需 family name）
  - `js/font-api.js` — 运行时调用 Google Fonts Developer API 获取轴元数据，内存缓存
  - `js/font-loader.js` — 动态构建 CSS API v2 URL + 切换 `<link>` 加载字体
  - `js/ui-panel.js` — 右侧配置面板（API Key 输入 + 字体选择 + 双滑块轴范围调节）
- renderer.js 通用化：接受任意轴（Record<string, number>），不再硬编码 wght/slnt
- mock-driver.js 通用化：根据 config.activeAxes 驱动任意轴振荡
- main.js 改为协调器：监听 `fontconfig:change` 事件，generation counter 防异步竞态
- 添加 .gitignore、Python venv（本地 server）
- API Key 通过 UI 面板输入，存 localStorage

### 下一步（未开始）
- 用户提供 5-10 个字体列表，扩充 font-registry.js
- 接入真实 attention 数据（Hugging Face Transformers）
- 设计 attention → font axis 映射策略

---

## 技术约定

- **运行需要 local server**：ES modules 不支持 `file://`，用 `source venv/bin/activate && python -m http.server 8000`
- **Google Fonts API Key**：`.env` 文件存有 key，但前端通过 UI 面板输入（存 localStorage）。API 端点：`https://www.googleapis.com/webfonts/v1/webfonts?family={name}&capability=VF&key={key}`
- **字体加载**：Google Fonts CSS API v2，URL 由 `font-loader.js` 从 API 返回的轴数据动态构建（轴排序：大写标签在前按字母序，小写在后）
- **添加新字体**：在 `js/font-registry.js` 的 `FONTS` 数组中加一行 `{ id: 'xxx', family: 'Font Name' }` 即可，轴数据由 API 自动获取
- 每个 token 用独立 `<span>` 渲染，`display: inline`，`white-space: pre-wrap`
- `font-kerning: none` 是必要的，不要删除
- `slnt` 符号注意：`slnt -10` = 向右倾斜最大，`slnt 0` = 直立
- 架构分层：`renderer.js`（纯渲染）→ `*-driver.js`（数据源）→ `main.js`（协调器）→ `ui-panel.js`（配置面板）
- `fontconfig:change` 自定义事件：UI 面板任何变更都 dispatch 此事件，main.js 监听并重启 stream
