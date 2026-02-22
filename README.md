# font-attention

实时 LLM attention 驱动的可变字体渲染实验。每个生成的 token，其字形的粗细、宽窄、倾斜等参数由模型内部的 attention 权重实时驱动，形成一段在语义中呼吸、变形的文字。

## 文档

- [项目方向与核心概念](doc/PROJECT_DIRECTION.md)
- [Roboto Flex 字体参数参考](doc/roboto-flex.md) | [在线预览](https://fonts.google.com/specimen/Roboto+Flex/tester?query=robot+fl&categoryFilters=Technology:%2FTechnology%2FVariable)

## 运行

需要 local server（ES modules 不支持 `file://` 协议）：

```bash
npx serve .
# 或
python3 -m http.server
```

## 当前状态

**Session 2 完成（2026-02-21）**
- 代码重构：从单文件拆分为模块化结构（`css/style.css` + `js/renderer.js` + `js/mock-driver.js` + `js/main.js`）
- Token 流式出现：`streamTokens()` 按时间间隔逐个添加 token，模拟模型生成过程
- Axis 平滑变化：每次新 token 出现时，前面所有 token 的 wght/slnt 会平滑过渡（模拟 attention 重分布）
- 入场动画：fade-in + 微缩放（250ms ease-out）
- 渲染层（`renderer.js`）与数据源（`mock-driver.js`）解耦，方便将来替换为真实 attention 数据

**Session 1 完成（2026-02-21）**
- 静态 token 渲染器：每个 token 独立 `<span>`，通过 `font-variation-settings` 控制 `wght` 和 `slnt`
- 使用 Roboto Flex 可变字体（Google Fonts CDN 加载）
- Lorem Ipsum 占位数据，非公约数相位驱动

**待完成 / 下一步**
- 接入真实 attention 数据源（Hugging Face Transformers pipeline）
- attention → font axis 映射策略设计
