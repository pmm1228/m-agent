---
name: mac-ui-css
description: >-
  Styles web UI with Apple macOS design language: SF typography, system colors,
  vibrancy/glass surfaces, rounded controls, subtle motion. Use when writing
  CSS/SCSS, styling Vue/React components, or when the user mentions Mac UI,
  Apple HIG, macOS style, SF Pro, glassmorphism, or Apple-like design.
---

# Mac UI CSS

按 Apple macOS / Human Interface Guidelines 编写 CSS。优先复用设计令牌，保持克制、通透、圆角与微动效。

## 工作流程

1. 在根容器或 `:root` 定义 `--apple-*` 变量（见下方令牌）
2. 使用系统字体栈与 `-webkit-font-smoothing: antialiased`
3. 表面用半透明 + `backdrop-filter`，避免纯色大块
4. 交互态：hover 变色、focus 蓝色光晕、active 轻微 `scale(0.985)`
5. 支持 `prefers-color-scheme: dark`（详见 [reference.md](reference.md)）
6. 移动端缩小圆角与字号，保持比例

## 设计令牌（Light）

```css
:root {
  --apple-bg: #f5f5f7;
  --apple-text: #1d1d1f;
  --apple-secondary: #6e6e73;
  --apple-tertiary: #86868b;
  --apple-blue: #0071e3;
  --apple-blue-hover: #0077ed;
  --apple-border: rgba(0, 0, 0, 0.08);
  --apple-surface: rgba(255, 255, 255, 0.72);
  --apple-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);
  --apple-radius-sm: 14px;
  --apple-radius-md: 18px;
  --apple-radius-lg: 28px;
  --apple-transition: 0.2s ease;
}
```

## 字体

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  'SF Pro Display',
  'SF Pro Text',
  'Helvetica Neue',
  sans-serif;
```

| 用途 | 字号 | 字重 | 字距 |
|------|------|------|------|
| 大标题 | 28–32px | 600 | -0.03em |
| 正文/输入 | 15–17px | 400–500 | -0.01em |
| 标签/脚注 | 12–13px | 600 / 400 | 0.02em（标签可 uppercase） |
| 按钮 | 17px | 600 | -0.01em |

## 核心模式

### 毛玻璃卡片

```css
.card {
  padding: 40px 36px 32px;
  border-radius: var(--apple-radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.65);
  background: var(--apple-surface);
  box-shadow: var(--apple-shadow);
  backdrop-filter: blur(24px) saturate(180%);
}
```

### 表单字段

- 外层 `.field`：`border-radius: 14px`，白底 `rgba(255,255,255,0.88)`，细边框
- focus：蓝色边框 + `box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.12)`
- 内层 `input`：无边框、透明背景、`outline: none`
- placeholder：`#aeaeb2`

### 主按钮

```css
.btn-primary {
  height: 50px;
  border: 0;
  border-radius: var(--apple-radius-sm);
  background: var(--apple-blue);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  transition: background-color var(--apple-transition), transform 0.15s ease;
}
.btn-primary:hover:not(:disabled) { background: var(--apple-blue-hover); }
.btn-primary:active:not(:disabled) { transform: scale(0.985); }
.btn-primary:disabled { opacity: 0.72; cursor: wait; }
```

### 链接/文字按钮

- 颜色 `var(--apple-blue)`，无下划线，hover 可略加深
- 不用粗边框，保持轻量

### App 图标块

```css
.app-icon {
  width: 72px;
  height: 72px;
  border-radius: var(--apple-radius-md);
  background: linear-gradient(145deg, #2b2b2f 0%, #1d1d1f 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 10px 30px rgba(0, 0, 0, 0.18);
}
```

### 背景光晕（可选装饰）

大圆 + `filter: blur(80px)` + 低透明度品牌色，置于 `pointer-events: none`。

### Tab 导航 / 多页壳（防晃动）

多 Tab 切换时页面「晃动」通常来自：**整页重绘**、**滚动条出现/消失**、**侧栏高度不一致**。按以下规则实现：

1. **共享 Layout 壳**：背景、`.app-shell`、侧栏头部、Tab 导航、用户区放在 `layouts/` 中，路由切换时只替换主内容 `<slot />`，不要每个页面各写一套外壳。
2. **Tab 用路由 + 固定尺寸**：Tab 容器设固定高度（如 `height: 46px`），激活态只改背景/颜色，避免 `border` 切换导致布局偏移。
3. **滚动条稳定**：
   ```css
   html { scrollbar-gutter: stable; }
   body { overflow: hidden; } /* 应用内滚动交给面板 */
   .workspace-scroll {
     overflow-y: auto;
     scrollbar-gutter: stable;
   }
   ```
4. **侧栏面板切换**：用 `[hidden]` / `v-show` 切换侧栏内容，外壳尺寸不变；侧栏主体 `flex: 1; min-height: 0; overflow: hidden`。
5. **壳层尺寸 token 化**：宽高用 CSS 变量（如 `--workspace-shell-height`）统一，禁止各页硬编码不同数值。
6. **关闭页面过渡**：Nuxt 中 `app.pageTransition: false`，避免 Tab 切换淡入淡出造成「闪动」。
7. **Nuxt 必须挂载 Layout**：`app.vue` 中使用 `<NuxtLayout><NuxtPage /></NuxtLayout>`，否则 `layouts/` 不会生效。
8. **禁止**：各 Tab 页重复定义 `.workspace` / `.app-shell`；Tab 上用 `border-bottom` 切换选中态；在 `body` 上直接滚动。

```css
.app-nav {
  flex-shrink: 0;
  height: 46px; /* 固定，避免切换撑高 */
}
.sidebar__panel[hidden] {
  display: none !important;
}
```

## 禁止事项

- 不用 Material 式硬阴影、高饱和渐变按钮
- 不用小于 12px 的正文（可读性）
- 不用 `transition: all`（明确列出属性）
- 不用直角或小圆角（< 10px）作为主容器
- 不用非系统字体作为 UI 主字体（装饰性标题除外）
- 深色模式不要纯 `#000` 背景，用 `#1d1d1f` / `#2c2c2e`

## 与框架集成

- **Vue/Nuxt**：样式放 `<style scoped>`，变量挂在页面根 class
- **Tailwind**：用 `@layer base` 定义 CSS 变量，或 `theme.extend` 映射令牌
- **Element Plus 等**：覆盖时用更高优先级 + 令牌，避免破坏组件逻辑

## 自检清单

- [ ] 使用了 `--apple-*` 变量而非散落 hex
- [ ] 标题负字距、正文 15–17px
- [ ] 卡片/面板有 blur + 半透明
- [ ] focus 有蓝色 ring，不仅改 border
- [ ] 按钮有 hover / active / disabled 三态
- [ ] 含 dark mode 或说明仅 light
- [ ] 480px 以下有响应式调整
- [ ] 多 Tab/路由共用 layout 壳，切换无整页晃动（见 Tab 导航章节）

## 延伸阅读

- 完整色板、深色令牌、间距与更多组件：[reference.md](reference.md)
- 登录页等完整示例：[examples.md](examples.md)
