# Mac UI CSS — 参考手册

## 间距系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--apple-space-xs` | 8px | 字段内 gap、紧凑间距 |
| `--apple-space-sm` | 12px | 表单项之间 |
| `--apple-space-md` | 20px | 表单区块、section |
| `--apple-space-lg` | 24–28px | 标题与内容、页脚 |
| `--apple-space-xl` | 32–40px | 卡片内边距 |
| 页面边距 | 20–32px | 移动端 20px，桌面 32px |

## 圆角

| 元素 | 半径 |
|------|------|
| 按钮、输入框 | 14px |
| App 图标 | 18px |
| 卡片/面板 | 28px（移动 24px） |
| 药丸标签 | 999px |
| 头像 | 50% 或 12px |

## 阴影层级

```css
/* 卡片 */
--apple-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);

/* 浮层/Popover */
--apple-shadow-elevated: 0 8px 32px rgba(0, 0, 0, 0.12);

/* 内嵌控件 */
--apple-shadow-inset: inset 0 1px 0 rgba(255, 255, 255, 0.12);
```

## 语义色（Light）

| 名称 | Hex | 用途 |
|------|-----|------|
| Blue | `#0071e3` | 主操作、链接 |
| Blue Hover | `#0077ed` | 按钮 hover |
| Green | `#34c759` | 成功 |
| Orange | `#ff9500` | 警告 |
| Red | `#ff3b30` | 错误、destructive |
| Purple | `#af52de` | 装饰光晕 |
| Placeholder | `#aeaeb2` | 占位符 |
| Separator | `rgba(0,0,0,0.08)` | 分隔线 |

## 深色模式令牌

```css
@media (prefers-color-scheme: dark) {
  :root {
    --apple-bg: #1d1d1f;
    --apple-text: #f5f5f7;
    --apple-secondary: #a1a1a6;
    --apple-tertiary: #86868b;
    --apple-border: rgba(255, 255, 255, 0.1);
    --apple-surface: rgba(44, 44, 46, 0.72);
    --apple-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  }
}
```

深色下输入框背景常用 `rgba(255, 255, 255, 0.06)`，focus ring 仍为蓝色半透明。

## 动效

| 场景 | 时长 | 缓动 |
|------|------|------|
| 颜色/边框 | 0.2s | ease |
| 缩放 active | 0.15s | ease |
| 页面进入 | 0.3–0.4s | ease-out |
| Spinner | 0.8s | linear infinite |

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

## 组件扩展

### 次要按钮

```css
.btn-secondary {
  height: 50px;
  border-radius: var(--apple-radius-sm);
  border: 1px solid var(--apple-border);
  background: rgba(255, 255, 255, 0.88);
  color: var(--apple-text);
  font-weight: 600;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 1);
}
```

### Toggle / Switch（简化）

- 轨道：`border-radius: 999px`，关闭 `#e5e5ea`，打开 `#34c759`
- 滑块：白色圆，带 `box-shadow: 0 2px 4px rgba(0,0,0,0.2)`
- 过渡 `transform 0.2s ease`

### 列表行（Settings 风格）

```css
.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--apple-border);
  font-size: 15px;
}
.list-row:last-child { border-bottom: 0; }
```

### 侧边栏 / Toolbar

- 背景：`rgba(246, 246, 246, 0.8)` + blur
- 分隔：1px `var(--apple-border)`
- 选中项：浅蓝底 `rgba(0, 113, 227, 0.1)` + 蓝色文字

### Toast / Banner

- 圆角 14px，毛玻璃或 `#323232`（深色 toast）
- 字号 13–15px，padding 12px 16px

## 无障碍

- focus 态必须可见（ring 或 outline），不仅依赖颜色
- 按钮 `:disabled` 降低 opacity，保留 `cursor: wait` 或 `not-allowed`
- 装饰性元素加 `aria-hidden="true"`
- 对比度：正文对背景 ≥ 4.5:1

## Safari / WebKit 注意

```css
backdrop-filter: blur(24px) saturate(180%);
-webkit-backdrop-filter: blur(24px) saturate(180%);
```

毛玻璃在旧浏览器可能降级为纯色 `--apple-surface`，可接受。
