# font-attention

实时 LLM attention 驱动的可变字体渲染实验。每个生成的 token，其字形的粗细、宽窄、倾斜等参数由模型内部的 attention 权重实时驱动，形成一段在语义中呼吸、变形的文字。

## 文档

- [项目方向与核心概念](doc/PROJECT_DIRECTION.md)
- [Roboto Flex 字体参数参考](doc/roboto-flex.md)

## 当前状态

**Session 1 完成（2026-02-21）**
- 静态 token 渲染器（`index.html`）：每个 token 独立 `<span>`，通过 `font-variation-settings` 控制 `wght` 和 `slnt`
- 使用 Roboto Flex 可变字体（Google Fonts CDN 加载）
- Lorem Ipsum 占位数据，以非公约数相位步长驱动 weight/slant 变化，模拟 token-level 信号

**待完成 / 下一步**
- 接入真实 attention 数据源（Hugging Face Transformers pipeline）
- attention → font axis 映射策略设计
- 实时更新逻辑（新 token 生成时平滑过渡）
