# DESIGN.md · Sidebar Plus

> 面向 AI 与人的设计规范：把这个文件放进上下文，就能按同一套规则继续扩展这个侧边栏。
> 所有数值都来自当前实现，不是意图。

## 1. 视觉主题

**安静的玻璃工作台。** 界面像一层悬浮在内容之上的亚光玻璃：背面的颜色透上来，但文字始终清晰。

判断标准：任何时候只应该有一个东西"跳出来"——当前会话。其余元素靠位置和留白被理解。

## 2. 色彩角色

颜色全部从宿主 token 派生，**不写死十六进制**（深色主题自动跟随）。

| 角色 | 取值 | 用途 |
|---|---|---|
| 画布（深色） | `@media (prefers-color-scheme: dark)` 下换成 `linear-gradient(160deg,#0d1016,#12161d,#171320)`，并叠同三色但更暗的光晕 | 整窗底色（深色） |
| 画布 | `radial-gradient` ×3（蓝 `rgba(111,156,255,.42)` / 粉 `rgba(255,158,196,.34)` / 青 `rgba(99,224,200,.32)`）+ `linear-gradient(160deg,#f3f6fd,#eef1f9,#f5eef9)` | 整窗底色，`background-attachment: fixed` |
| 面板 | `color-mix(in srgb, var(--dsw-alias-bg-layer-1) 58%, transparent)` | 侧边栏面板、对话框 |
| 面板浮层 | 同上 62% | 收起/展开长条 |
| 悬停底 | `color-mix(in srgb, var(--dsw-alias-bg-layer-1) 72%, transparent)` | 会话行 hover |
| 分隔线 | `color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent)` | 面板描边 |
| 主文字 | `var(--dsw-alias-label-primary)` | 中文标题、工作区名 |
| 次文字 | `var(--dsw-alias-label-secondary)` | 会话名、时间、计数 |
| 选中/链接 | `var(--dsw-alias-brand-primary)` | 恢复、当前项 |
| 运行中 | `var(--dsw-alias-state-warn-primary)` | 5px 圆点，唯一会动的东西 |
| 危险 | `var(--dsw-alias-state-error-primary)` | 只出现在"不可恢复"的确认里 |

**硬规则**：彩色只表达状态。列表里的删除按钮用次文字色，不用红。

## 3. 字体

| 层级 | 字号 | 字重 | 说明 |
|---|---|---|---|
| 分区标题 | 13.5px | 600 | 功能区 / 工作区 / 回收区 |
| 工作区名 | 13.5px | 600 | 比会话名重，但同尺寸 |
| 会话名 | 13.5px | 400 | 选中时 500 |
| 元信息（时间/计数） | 12px | 400 | 透明度 .7–.75 |
| 竖排长条文案 | 11px | 400 | `writing-mode: vertical-rl`，字距 `.14em` |
| 搜索框 | 13.5px | 400 | |

行高由 `min-height: 29px` + `padding: 3px` 控制，不做 `line-height` 微调。

## 4. 形状与间距

| 元素 | 圆角 | 尺寸 |
|---|---|---|
| 面板 | 20px | 外边距 6/4、内边距 `12px 32px 10px 8px` |
| 会话行 | 11px | 高 29px，左缩进 17+6px |
| 长条（收起/展开） | 12px | 宽 24，上下各留 10px |
| 按钮 | 12px | 高 28–32px |
| 阴影 | — | 面板 `inset 0 1px 0 rgba(255,255,255,.5), 0 12px 30px rgba(16,24,40,.10)`，行零阴影 |

**间距基数 4px**：组内 2px，组间 18px，面板内边距 12/10。

## 5. 组件

### 会话行
- 结构：标题（flex:1 省略号）→ 时间 → 运行点 → `⋯`（hover 显现，绝对定位右上）
- hover：底 72% 白，文字不变
- 拖拽：源行 `opacity .45`；目标位上/下出现 2px 品牌色内阴影

### 工作区长条（收起/展开）
- 收起态：整列宽 31px、整高，文案 `»` + 竖排「展开」
- 展开态：面板右缘宽 24px、`top/bottom: 10px`，文案 `«` + 竖排「收起」
- 两者都整条可点，调用 `ctx.layout.toggleSidebar()`
- 默认 `opacity .55`，hover 到 1

### 菜单（`⋯`）
- 必须 `createPortal` 到 `body`，`position: fixed`，坐标按按钮 `getBoundingClientRect` 计算并夹在视口内
- 圆角 10px，`bg-overlay`，阴影 `0 14px 34px rgba(0,0,0,.22)`

### 回收区行
- 只有两个动作：`恢复`（品牌色）、`删除`（次文字色）
- 头部 `清空` 只在有条目时出现

## 6. 状态

| 状态 | 表现 |
|---|---|
| hover | 底 72% 白；不改变布局 |
| 选中（当前会话） | 未单独标记，靠系统高亮 |
| 运行中 | 5px 琥珀圆点，位置固定在时间左侧 |
| 拖拽源 | 透明 45% |
| 拖放目标 | 2px 品牌色内阴影（行）/ 1px 虚线描边（工作区、回收区） |
| 空态 | 「回收区是空的」，次文字 13px |

## 7. 动效

| 场景 | 实现 |
|---|---|
| 分组展开/收起 | `grid-template-rows: 0fr ↔ 1fr`，460ms `cubic-bezier(.22,.9,.24,1.08)`；同组 `opacity 0 ↔ 1` 280ms |
| 行浮现 | `translateY(-6px) scale(.97) → 0 / 1`，400ms `cubic-bezier(.2,.9,.25,1.14)`，逐行延迟 26ms（最多 8 行） |
| 长条出现 | `opacity .55 → 1`，180ms |

原则：动效只解释"东西从哪来、到哪去"，不做装饰性弹跳。

## 8. Do / Don't

- ✅ 让背景有颜色（渐变/壁纸），玻璃才有意义
- ✅ 用 `color-mix` 从宿主 token 派生颜色，保持深浅主题一致
- ✅ 弹层用 portal，避免被裁剪
- ❌ 不要在列表里用红色表达"可删除"
- ❌ 不要给行加边框或阴影（会把列表变成表格）
- ❌ 不要让分区标题比会话名更显眼
- ❌ 不要把 `position: fixed` 放在带 `backdrop-filter` 的容器里（会变成相对该容器定位）

## 9. 适配说明

- 选择器依赖 DSH 构建产物的类名后缀：`_frame`、`_sidebarCol`、`_centerCol`、`_root`、`_page`，以及语义属性 `[role="dialog"]`、`[aria-modal="true"]`
- 上游改样式后可能失效，表现为局部退回默认样式，不会崩溃
- 收起/展开使用官方 `ctx.layout.toggleSidebar()`；排序/插入使用 `ctx.workspaces.insertSessionBefore()`
