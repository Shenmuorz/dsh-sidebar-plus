# Changelog

## 0.3.1 — 2026-10-31

### 修复
- 深色模式下画布仍是浅色渐变，导致白字几乎不可读：新增 `@media (prefers-color-scheme: dark)` 分支，深色下使用深底渐变，对话框与描边同步加深

### 文档
- README 增加深色主题截图与说明（`docs/screenshots/dark.jpg`）

## 0.3.0 — 2026-10-31

### 侧边栏
- 三段式布局：功能区 / 工作区 / 回收区，顺序固定
- 工作区可独立折叠；头部单按钮在「全部展开 ⇄ 全部收起」之间切换
- 悬停工作区行出现 `＋`，在该工作区新建对话
- 会话行显示标题、相对时间、运行中圆点、`⋯` 菜单

### 回收区
- 移入回收区 = 归档 + 移动 `sessions/<ws>/<id>` → `storages/recycle/<id>` + 写 `meta.json`（含标题）
- 恢复 = 搬回文件 + `unarchiveSession` + `insertSessionBefore` + `refreshProjections`，行立即出现
- 单条「删除」使用 `purge` 接口；「清空」清空全部
- 运行中的会话拒绝删除并提示

### 交互
- 拖拽排序（工作区内）、拖到工作区标题（移动/恢复）、拖到回收区（删除）
- 菜单与拖拽等价；菜单通过 `createPortal` 渲染到 body，避免被 `overflow` 裁剪
- 标题搜索，跨工作区过滤

### 外观
- 液态玻璃：整窗三色渐变 + 面板 58% 底 + `blur(26px) saturate(1.45)`
- 颜色全部由 `color-mix()` 从宿主 token 派生，深色主题自动跟随
- 折叠态改为整高窄条（`» 展开`），展开态右缘对称长条（`« 收起`）
- 分组展开：`grid-template-rows 0fr → 1fr`，460ms 弹簧曲线 + 行错峰 26ms

### 修复
- 路由注册漏写尾斜杠导致 404/405（`dsh-host-webserver` 的前缀匹配规则）
- 页面端令牌过期导致 403：令牌持久化到 `sidebar-plus-token`，并放行同源请求
- 删除后工作区残留「未命名对话」幽灵行：删除前先 `archiveSession`
- 恢复后不显示：补 `unarchiveSession`
- `live session` 判定过严：只拒绝真正在运行的会话

## 0.2.0 — 2026-10-30

- 三区结构、回收区接口（list/delete/restore/empty）
- 客户端替换 `sidebar.workspaces` 槽位

## 0.1.0 — 2026-10-29

- 初版：底部回收区入口与模态列表
