# Schedule 智能日程桌面端 (Tauri v2 + Vue 3)

这是一个基于 **Tauri v2** + **Vue 3 (Vite + TS)** + **Rust** 架构构建的高颜值、轻量级、跨平台智能日程管理系统。应用深度适配 Windows 11 的视觉美学，提供无感延迟的本地 SQLite 数据库存储、农历/节气/节日扩展支持，以及功能强大的桌面便签挂件（小组件）。

---

## 🎨 系统架构与设计

本项目采用 **混合开发（Hybrid App）** 架构。前端使用 Vue 3 负责高动态视觉交互渲染，后端使用 Rust 负责调用操作系统底层 API（如窗口定位、置顶、托盘、自启动注册表等）。

### 架构拓扑关系

```
               ┌────────────────────────────────────────────────────────┐
               │                     Tauri 主程序运行空间                │
               │                                                        │
               │  ┌──────────────────┐            ┌──────────────────┐  │
               │  │   主窗口 Webview  │            │  桌面组件 Webview │  │
               │  │  (Schedules/Cal) │            │   (WidgetView)   │  │
               │  └────────┬─────────┘            └────────┬─────────┘  │
               │           │                               │            │
               │           │ ◄─────── Tauri Events ───────► │            │
               │           │     (跨窗口双向数据实时同步)      │            │
               │           ▼                               ▼            │
               │  ┌──────────────────────────────────────────────────┐  │
               │  │                  Pinia 状态存储机制              │  │
               │  └────────┬────────────────────────┬────────────────┘  │
               │           │                        │                   │
               │           ▼                        ▼                   │
               │  ┌──────────────────┐    ┌──────────────────┐          │
               │  │  Tauri-Sqlite    │    │  Memory Fallback │          │
               │  │  (生产环境驱动)  │    │  (Web测试/Mock)  │          │
               │  └────────┬─────────┘    └──────────────────┘          │
               │           │                                            │
               └───────────┼────────────────────────────────────────────┘
                           ▼
                   [ 本地磁盘 schedule.db ]
```

### 技术栈详情
- **前端核心**：Vue 3.4 (SFC, Composition API), TypeScript, Pinia (状态管理)
- **开发与打包构建**：Vite 8.1, Tauri CLI v2
- **UI 设计系统**：Tailwind CSS v4 + `@iconify/vue` + `@lucide/vue` + shadcn-vue
- **系统底层外壳**：Rust 1.77+, Tauri v2 API (`@tauri-apps/api`)
- **数据持久化**：SQLite (基于官方 `@tauri-apps/plugin-sql` 插件)
- **历法支持**：`lunar-javascript`（提供阴历、节气、干支、生肖及黄历计算）
- **单元测试**：Vitest

---

## 🚀 核心功能特性与代码映射

### 1. 智能日程面板 (Schedule Board)
* **时段与分类双向互斥高亮**：侧边栏“今日、明天、未来7天、全部”等时间轴卡片与下方的“分类管理”互斥筛选，确保当前仅存在单一高亮过滤，视觉重心极佳。
* **无限子任务拆解**：日程卡片内支持子任务展开，可直接在卡片上快捷勾选/取消勾选子任务，并支持进度百分比可视化显示。
* **自然逾期判定**：截止时间点设为今天（如今天 9:00），在今天结束前（直到 23:59:59）都视为未到期，只有进入第二天零点起才会归入“已逾期”。
* **核心源码映射**：
  - 页面视图：[SchedulesView.vue](file:///e:/Schedule/win/src/views/SchedulesView.vue)
  - 状态管理：[scheduleStore.ts](file:///e:/Schedule/win/src/stores/scheduleStore.ts)

### 2. 多合一日历视图 (Calendar & Lunar Calendar)
* **农历与节日节气深度扩展**：支持一键切换显示/隐藏农历。传统节日、公历重要节日、二十四节气优先在日期格内展示，并以醒目的红色字体标出。
* **黄历侧边栏详情**：点击任何日期，右侧的“当天内容”面板会自动渲染当前日期的生肖干支信息。
* **滚轮手势导航（Wheel Navigation）**：支持在月历网格上滚动鼠标滚轮快速上/下翻页切换月份，并内置 500ms 防抖，翻页极其丝滑。
* **“今天”一键回归**：点击“今天”按钮，无论处于哪个年代的月历，都会瞬间重定向并高亮回填当下的今天。
* **核心源码映射**：
  - 页面视图：[CalendarView.vue](file:///e:/Schedule/win/src/views/CalendarView.vue)
  - 日历排布算法引擎：[calendarEngine.ts](file:///e:/Schedule/win/src/utils/calendarEngine.ts)

### 3. 独立桌面便签组件 (Desktop Widget)
* **Win11 毛玻璃视觉**：轻量级磨砂玻璃挂件，支持 25px 高斯模糊深度，日间模式 88% / 夜间模式 92% 不透明度自适应。
* **任务栏静默挂载 (skipTaskbar)**：支持跳过系统任务栏。当您关闭主程序窗口时，任务栏不会遗留任何图标，仅通过系统托盘保持后台运行。
* **双端实时无感同步**：基于 `tauri-event` 通道，在桌面小组件上完成快捷新增、勾选完成、删除操作后，主界面无需手动刷新即可实时接收广播并刷新 UI，反之亦然。
* **防丢失与位置记忆**：便签组件具有位置和物理像素尺寸记忆。启动时自动识别并读取当前显示器的 DPI 缩放比和显示器物理分辨率，防止超出屏幕边界。
* **核心源码映射**：
  - 页面视图：[WidgetView.vue](file:///e:/Schedule/win/src/views/WidgetView.vue)
  - 托盘逻辑与窗口位置管理：[lib.rs](file:///e:/Schedule/win/src-tauri/src/lib.rs)

### 4. 系统级配置与持久化
* **本地 SQLite 数据库**：
  - 数据库文件命名为 `sqlite.db`（或特定目标包名指定的 db 文件），Windows 环境下默认存放路径为 `%APPDATA%/com.schedule.desktop/`。
  - 数据表初始迁移及 schema 升级逻辑通过 Rust 侧 `migrations` 管理，并在 [lib.rs](file:///e:/Schedule/win/src-tauri/src/lib.rs) 中随数据库加载自动执行。
* **开机自启动控制**：集成系统级开机自启开关。挂载时自动调取系统 API 探查当前状态并回填开关，点击即可一键写入/卸载开机自启注册表。
* **核心源码映射**：
  - 数据库操作隔离适配器：[databaseManager.ts](file:///e:/Schedule/win/src/utils/databaseManager.ts)
  - Tauri SQL 驱动实现：[tauriSqliteAdapter.ts](file:///e:/Schedule/win/src/utils/tauriSqliteAdapter.ts)
  - 开机自启与托盘初始化：[lib.rs](file:///e:/Schedule/win/src-tauri/src/lib.rs) & [App.vue](file:///e:/Schedule/win/src/App.vue)

---

## 🛠️ 项目目录结构

```
e:/Schedule/win/
├── src-tauri/                 # Tauri 后端 Rust 核心目录
│   ├── Cargo.toml             # Rust 依赖声明
│   ├── tauri.conf.json        # 桌面窗口、安全沙箱、插件总体配置文件
│   ├── capabilities/          # Tauri v2 细粒度权限策略配置
│   │   ├── default.json       # 本地核心、事件、窗口操作权限
│   │   └── desktop.json       # 自启动等桌面插件权限
│   └── src/
│       ├── main.rs            # Rust 程序入口
│       └── lib.rs             # 系统托盘事件绑定、窗口初始化与数据库迁移逻辑
├── src/                       # 前端 Vue 3 源码目录
│   ├── assets/                # 静态资源 (图片、Logo)
│   ├── components/            # 复用组件与 Shadcn-vue 基础 UI
│   ├── router/                # Vue Router 路由配置 (Hash 模式)
│   ├── stores/                # Pinia 状态管理 (内含跨进程同步广播逻辑)
│   ├── utils/                 # 工具类
│   │   ├── adapters/          # 物理存储隔离适配器 (Tauri Sqlite / 内存 Mock)
│   │   ├── calendarEngine.ts  # 42宫格日历日程渲染算法
│   │   └── syncService.ts     # 数据修订版本号与双向同步冲突解决逻辑
│   ├── views/                 # 核心页面视图
│   │   ├── SchedulesView.vue  # 日程工作流管理视图
│   │   ├── CalendarView.vue   # 农历滚轮手势日历视图
│   │   └── WidgetView.vue     # 桌面便签组件视图
│   ├── App.vue                # 根主组件 (提供托盘事件同步、开机自启管理)
│   ├── main.ts                # 前端主入口
│   └── styles.css             # 全局现代极简风 CSS 样式 (Tailwind v4)
├── tests/                     # 自动化单元测试目录 (基于 Vitest)
├── package.json               # NPM 依赖包与指令声明
└── vite.config.ts             # Vite 构建配置文件
```

---

## ⚙️ 编译、运行与打包

### Windows 平台开发前置要求
在开始之前，请确保您的 Windows 电脑上已经安装并配置了以下开发环境：
1. **Node.js**：建议使用 v18 或 v20 LTS 版本。
2. **Rust 工具链**：请通过 [Rustup](https://rustup.rs/) 安装官方的 Rust 编译器（1.77 或以上版本）。
3. **C++ 构建工具**：需要安装 Microsoft Visual Studio 2022 并勾选 **"使用 C++ 的桌面开发"** 工作负荷，以获取 MSVC 编译器及 Windows SDK。
4. **WebView2**：Tauri 依赖 WebView2 进行界面渲染。Windows 11 已默认内置，Windows 10 环境若提示缺失请自行安装。

### 1. 安装项目依赖
在项目根目录下执行：
```bash
npm install
```

### 2. 启动开发模式 (热更新调试)
启动本地 Tauri 开发外壳，会自动执行 Vite 编译并弹出调试窗体：
```bash
npm run tauri dev
```

### 3. 构建打包正式安装包
该命令会自动编译前端静态资源与 Rust 代码，进行混淆优化后生成最终的生产环境安装包（Windows 下生成 `.exe` 安装程序），打包产物将会自动放置于配置的路径中，并自动拷贝到 `release/` 目录下：
```bash
npm run package
```

---

## 🧪 单元与集成测试

为了保证底层算法（如日历排布、多端同步、数据修订号合并）的稳健性，项目集成了基于 **Vitest** 的自动化单元测试套件。通过内存/Mock 适配器，测试可以在无需拉起整个 Tauri 桌面外壳的普通 Node.js 环境下高速运行。

### 运行测试
在项目根目录下执行以下命令运行所有测试用例：
```bash
npx vitest run --root .
```

### 主要测试覆盖范围
* **日历布局排布** ([calendarScheduler.test.ts](file:///e:/Schedule/win/tests/calendarScheduler.test.ts))：验证 42宫格日历日程渲染算法，保证多天重叠日程无冲突渲染且高度排布有序。
* **数据操作隔离** ([databaseManager.test.ts](file:///e:/Schedule/win/tests/databaseManager.test.ts) / [repositoryAdapter.test.ts](file:///e:/Schedule/win/tests/repositoryAdapter.test.ts))：验证数据库适配器自动切换与 CRUD 的准确性。
* **同步与冲突解决** ([syncService.test.ts](file:///e:/Schedule/win/tests/syncService.test.ts))：测试双向数据合并、物理删除标记（IsDeleted）以及冲突版本解决机制。
* **Pinia 状态变更** ([scheduleStore.test.ts](file:///e:/Schedule/win/tests/scheduleStore.test.ts))：测试全局状态更新、删除和添加动作的副作用。

---

## 📚 技术规划与设计规格

项目的具体演进路线与底层设计规格，请参考 `docs/` 下的各专项设计文档：

* **核心架构设计**
  - [架构重构与物理层解耦说明](file:///e:/Schedule/win/docs/superpowers/specs/2026-07-07-schedule-architecture-refactor-design.md) — 详述 Repository 模式设计，如何通过抽象层实现前端渲染层与具体平台介质（Sqlite/Web内存）的彻底隔离。
  - [UI 组件与 Shadcn-vue 改造规范](file:///e:/Schedule/win/docs/superpowers/specs/2026-07-07-shadcn-vue-components-redesign.md) — 定义项目中二次封装组件规范以及与 Tailwind CSS v4 样式工具链的对接。
* **多端同步方案**
  - [Vue3 迁移及 P2P 同步方案设计](file:///e:/Schedule/win/docs/superpowers/specs/2026-07-07-vue3-migration-p2p-sync-design.md) — 规划基于版本修订号的弱网弱状态合并算法，预留的 P2P 局域网传输协议与发现协议设计。
* **实施重构计划**
  - [架构重构执行细则](file:///e:/Schedule/win/docs/superpowers/plans/2026-07-07-schedule-architecture-refactor-plan.md)
  - [Tailwind v4 与 Shadcn 集成计划](file:///e:/Schedule/win/docs/superpowers/plans/2026-07-07-tailwind-v4-shadcn-integration-plan.md)

