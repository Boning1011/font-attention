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

### Session 3b（2026-02-22）— 已完成
- 扩充字体列表至 7 种：Roboto Flex, Roboto, Open Sans, Noto Sans, Noto Serif, Playfair Display, Merriweather
- UI 轴标签改为人类可读名称（`AXIS_LABELS` 映射表在 `ui-panel.js`）
- 二值轴（`BINARY_AXES` set，目前含 `ital`）显示为 checkbox toggle 而非双滑块

### Session 4（2026-02-22）— 已完成
- 布局稳定性：区分 reflow 轴（`wght`, `wdth`, `XTRA`, `XOPQ`）和 layout-safe 轴（`GRAD`, `slnt`, `YOPQ` 等）
- Reflow 轴默认锁定在字体 defaultValue（min === max），不振荡，避免文本排版抖动
- Layout-safe 轴保持全范围，用户仍可手动拖开 reflow 轴滑块来解锁
- `font-api.js` 补充返回 `defaultValue` 字段
- UI 面板中 reflow 轴标签旁显示 `· layout` 灰色提示

### Session 5（2026-02-22）— 已完成
- BPE tokenizer 集成：使用 HuggingFace Transformers.js（GPT-2 tokenizer），替代朴素空格分词
- `js/tokenizer.js` — 封装 tokenizer 初始化与 tokenize 接口
- `index.html` 增加 importmap 引入 `@huggingface/transformers`
- 测试文本选择器：UI 面板新增 "Test Text" 下拉，选择后重新流式渲染
- `js/text-samples.js` — 测试文本集合（Lorem Ipsum, Bacon Ipsum），可扩展
- **添加新测试文本**：在 `js/text-samples.js` 的 `SAMPLES` 数组中加一个 `{ id, label, text }` 对象即可

### Session 6（2026-02-23）— 已完成
- 入场动画增强：token 出现时有 scale(1.35) + blur(2px) → 正常大小的弹跳效果，区别度更大
- 选择性振荡：新 token 出现时不再振荡所有前序 token，而是随机选取一部分（≤35%）
  - 距离近的 token 更容易被扰动（nearby window = 8）
  - 远处 token 扰动概率随距离衰减
- Token 稳定化机制：每个 token 有 stability 计数器
  - 连续未被扰动 5 轮后进入 "settled" 状态
  - settled token 仅有 3% 概率被偶尔 ripple 触及
  - 效果：大部分文字逐渐稳定，只有零星变化
- 默认字体设置调整：
  - Italic 默认开启（`ital` checkbox 默认 checked）
  - Weight 默认使用字体的完整范围（min–max），不再限制 300–700

### 下一步（未开始）
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
- **主要表达轴 vs 锁定轴**：`wght`(full range)、`slnt`(-10–0)、`GRAD`(-50–50) 三个轴默认激活驱动（`PRIMARY_AXES` in `ui-panel.js`）；`ital` 默认开启；其余所有轴锁定在 defaultValue。用户可通过滑块手动解锁任意轴
- **Token 动画模型**：新 token 以 scale+blur 弹入；每轮只有 ≤35% 的 token 被扰动；token 连续 5 轮未被扰动后进入 settled 状态（3% ripple 概率）。参数在 `mock-driver.js` 顶部常量
