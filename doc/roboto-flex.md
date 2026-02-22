# Roboto Flex — Variable Font Reference

> Authoritative reference for using Roboto Flex in this project.
> Last updated: 2026-02-21. Source: Google Fonts / fontsource.org / TypeNetwork GitHub.

---

## 基本情况

- **字体家族**: Roboto Flex
- **设计方**: TypeNetwork（commissioned by Google）
- **License**: Apache 2.0（开源，免费商用）
- **可变轴数**: 13 个
- **字符集**: Latin（含 Latin Extended、特殊符号）
- **Google Fonts 链接**: https://fonts.google.com/specimen/Roboto+Flex
- **GitHub 源仓库**: https://github.com/googlefonts/roboto-flex

---

## 全部 13 个可变轴

### 注册轴（Registered Axes）
这四个是 OpenType 标准轴，有对应的高层 CSS 属性，写 CSS 时优先用高层属性。

| 轴名 | Tag | Min | Max | Default | 控制效果 |
|------|-----|----:|----:|--------:|---------|
| Weight | `wght` | 100 | 1000 | 400 | 笔画粗细（细体→超黑体） |
| Width | `wdth` | 25 | 151 | 100 | 字形宽窄（极窄→极宽），单位：% |
| Slant | `slnt` | -10 | 0 | 0 | 倾斜角度（0=直立，-10=最大斜体倾角） |
| Optical Size | `opsz` | 8 | 144 | 14 | 按显示尺寸自动优化笔画细节，单位：pt |

### 自定义轴（Custom Axes）
这九个是 Roboto Flex 特有的参数化轴，必须通过 `font-variation-settings` 控制。

#### 全局分级轴
| 轴名 | Tag | Min | Max | Default | 控制效果 |
|------|-----|----:|----:|--------:|---------|
| Grade | `GRAD` | -200 | 150 | 0 | 在**不改变排版宽度**的前提下调整视觉重量（负值=更细，正值=更粗）。适合暗/亮主题切换。 |

#### X 方向参数轴（横向笔画）
| 轴名 | Tag | Min | Max | Default | 控制效果 |
|------|-----|----:|----:|--------:|---------|
| Thick Stroke | `XOPQ` | 27 | 175 | 96 | 主笔画（竖笔）粗细，单位：字体单位 |
| Counter Width | `XTRA` | 323 | 603 | 468 | 字母内部负空间（counter）宽度，影响整体字间紧凑感 |

#### Y 方向参数轴（纵向比例）
| 轴名 | Tag | Min | Max | Default | 控制效果 |
|------|-----|----:|----:|--------:|---------|
| Thin Stroke | `YOPQ` | 25 | 135 | 79 | 横向细笔画（横笔、衬线过渡）粗细 |
| Ascender Height | `YTAS` | 649 | 854 | 750 | 上延笔高度（b/d/h 等字母向上延伸的程度） |
| Descender Depth | `YTDE` | -305 | -98 | -203 | 下延笔深度（g/p/y 等字母向下延伸的程度，负值） |
| Figure Height | `YTFI` | 560 | 788 | 738 | 数字字符的高度 |
| Lowercase Height | `YTLC` | 416 | 570 | 514 | 小写字母 x 高度（x-height） |
| Uppercase Height | `YTUC` | 528 | 760 | 712 | 大写字母高度（cap-height） |

---

## 哪些轴该用？哪些不该乱动？

### 主要表达轴（面向内容、动画驱动）
这几个范围大、视觉效果直接，是这个项目 attention→字体映射的核心目标：

- **`wght`** — 权重最大、最直接，100→1000 跨度极广
- **`wdth`** — 宽窄变化视觉张力强，适合映射某种"扩张/收缩"语义
- **`slnt`** — 范围窄（-10~0），适合做细微的情绪倾斜
- **`GRAD`** — 不改变排版宽度地调重量，适合字重动画时避免 reflow
- **`opsz`** — 按字号自动设置即可（`font-optical-sizing: auto`），通常不需要动态控制

### 精细参数轴（低级别，慎用）
`XOPQ`、`XTRA`、`YOPQ`、`YTAS`、`YTDE`、`YTFI`、`YTLC`、`YTUC` 这八个轴是字体内部的参数化"配方"，正常排版不应单独操控。它们在以下情况有用：

- 需要跨字号保持视觉一致性时微调
- 实验性的字体变形艺术效果
- **注意**: 这些轴不是独立的，`wght`/`wdth` 的变化已经在内部协调了它们。单独拉动会产生非预期效果。

---

## CSS 用法

### Google Fonts 加载（当前项目使用）

```css
/* 加载所有主要轴的完整范围 */
@import url('https://fonts.googleapis.com/css2?family=Roboto+Flex:GRAD,XOPQ,XTRA,opsz,slnt,wdth,wght@-200..150,27..175,323..603,8..144,-10..0,25..151,100..1000&display=swap');
```

**格式规则**: `axes_list@range_list`
- 轴名按字母顺序（大写在前）
- 范围用 `..` 表示，顺序对应轴名顺序

如需加载全部 13 个轴（含 Y 轴参数轴）：
```
family=Roboto+Flex:GRAD,XOPQ,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC,opsz,slnt,wdth,wght@-200..150,27..175,323..603,25..135,649..854,-305..-98,560..788,416..570,528..760,8..144,-10..0,25..151,100..1000
```

### CSS 属性控制

```css
/* 注册轴 — 优先用高层 CSS 属性 */
font-weight: 300;           /* wght */
font-stretch: 75%;          /* wdth，单位 % */
font-style: oblique -5deg;  /* slnt，注意符号：slnt -5 → oblique -5deg */
font-optical-sizing: auto;  /* opsz，让浏览器按字号自动处理 */

/* 自定义轴 — 必须用 font-variation-settings */
font-variation-settings: "GRAD" 0, "XOPQ" 96, "XTRA" 468;
```

**关键注意**:
- 注册轴和 `font-variation-settings` 可以混用，但 `font-variation-settings` 是底层覆盖。
- 如果同时设置 `font-weight: 700` 和 `font-variation-settings: "wght" 300`，后声明的生效。
- `slnt` 的符号与 `oblique` 相反：`slnt -10` = `oblique 10deg`（向右倾）。

### 当前项目 CSS 写法（token-level）

```css
/* 每个 token 的 span 上直接设置 */
span.style.fontVariationSettings = `"wght" ${wght}, "slnt" ${slnt}`;
```

---

## 典型值参考

| 场景 | `wght` | `wdth` | `slnt` | `GRAD` |
|------|-------:|-------:|-------:|-------:|
| 正文默认 | 400 | 100 | 0 | 0 |
| 细体 | 200 | 100 | 0 | 0 |
| 粗标题 | 700 | 100 | 0 | 0 |
| 超黑 | 900 | 100 | 0 | 0 |
| 窄体 | 400 | 60 | 0 | 0 |
| 宽体 | 400 | 140 | 0 | 0 |
| 斜体感 | 400 | 100 | -8 | 0 |
| 暗色背景补偿 | 400 | 100 | 0 | -50 |
| 压缩粗体 | 800 | 50 | 0 | 0 |

---

## 已知限制与注意事项

1. **`slnt` 范围只到 -10**：Roboto Flex 没有真斜体（`ital` 轴），只有倾斜（oblique）。视觉上是几何倾斜，不是书法斜体。
2. **`wdth` 极端值下可能出现字形问题**：wdth 25（极窄）+ wght 200（极细）在某些字形下会有渲染异常（GitHub issue #316）。
3. **Y 轴参数轴不是独立控制**：`YTLC`（x-height）等参数轴在实际字体内部是联动的，单独拉大 `YTLC` 不等于"只改 x 高度"。
4. **Google Fonts 加载的轴需要在 URL 中显式声明范围**：未声明范围的轴只会加载默认值，无法动态变化。
5. **`font-kerning: none` 在跨 token 边界处是必要的**：相邻 span 的 `font-variation-settings` 不同时，浏览器可能在边界处产生错误的 kerning 计算。

---

## 与项目映射的关联

在 attention→字体参数 的映射设计中，各轴的自然对应关系：

| Attention 特征 | 推荐轴 | 理由 |
|---------------|--------|------|
| 高注意力权重（显著 token） | `wght` ↑ | 重量感 = 视觉突出 |
| 低注意力（背景 token） | `wght` ↓ + `GRAD` ↓ | 弱化但不改变布局 |
| 语义扩散（多头分散） | `wdth` ↑ | 扩张感 |
| 语义聚焦（单一 head 主导） | `wdth` ↓ | 收缩感 |
| 情绪/语气倾斜 | `slnt` | 轻微倾斜表达动势 |
| 字号适配 | `opsz` | 随渲染大小自动设定 |
