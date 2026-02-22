# CLAUDE.md

## 工作规范

- 每次修改代码后，自动执行 git commit 提交更改。
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

**主字体**: Roboto Flex（13 个可变轴，Apache 2.0）
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

### 下一步（未开始）
- 接入真实 attention 数据（Hugging Face Transformers）
- 设计 attention → font axis 映射策略
- 实现实时 token 流更新逻辑

---

## 技术约定

- 字体加载：Google Fonts CSS API v2，在 URL 中显式声明所有需要动态控制的轴及其范围
- 每个 token 用独立 `<span>` 渲染，`display: inline`，`white-space: pre-wrap`
- `font-kerning: none` 是必要的，不要删除
- `slnt` 符号注意：`slnt -10` = 向右倾斜最大，`slnt 0` = 直立
