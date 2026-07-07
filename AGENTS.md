<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# schedule-desktop

## Purpose
日程管理桌面端应用 (Schedule Desktop App)，基于 Vue 3 + Vite + Tailwind CSS v4 + Pinia 前端技术栈，以及 Tauri v2 + SQLite 桌面端外壳构建，实现日程安排、分类管理及未来多端同步底层能力。

## Key Files
| File | Description |
|------|-------------|
| `package.json` | 定义项目前端依赖、版本及基本启动脚本 |
| `tsconfig.json` | TypeScript 编译器全局配置 |
| `vite.config.js` | Vite 构建与开发服务器配置（设置 `src` 为 root 根目录） |
| `tailwind.config.js` | 占位配置文件，用于通过 shadcn-vue CLI 的验证 |
| `components.json` | shadcn-vue 组件库配置，指定组件、指令及样式导入路径 |
| `README.md` | 面向开发者和用户的项目基本介绍与安装运行指南 |
| `.npmrc` | 配置 npm 镜像与包管理参数 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `backend/` | 预留给桌面端后端服务的目录，未来实现 P2P 双端同步能力 (见 `backend/AGENTS.md`) |
| `docs/` | 技术规划方案与设计规格文档目录 (见 `docs/AGENTS.md`) |
| `src/` | 前端渲染进程核心源码，包括 Vue 组件、页面、状态、路由及业务工具类 (见 `src/AGENTS.md`) |
| `src-tauri/` | Tauri 桌面外壳的 Rust 代码目录，包括进程通信、系统托盘、SQLite 数据库迁移等 (见 `src-tauri/AGENTS.md`) |
| `tests/` | 单元测试和集成测试，使用 Vitest 执行验证 (见 `tests/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 运行和开发：前端使用 `npm run dev`，如果同时运行 Tauri 桌面应用可使用 `npm run tauri dev`（需要 Tauri CLI 支持）。
- 依赖管理：新增第三方库前需评估对多端/平台（Web/Tauri）的兼容性，首选轻量化、纯 JS/TS 实现。
- 样式配置：项目已接入 Tailwind CSS v4 编译器，请勿通过修改占位文件 `tailwind.config.js` 配置样式，而应直接在 `src/styles.css` 中使用 CSS 变量或 `@theme` 指令。
- 组件与组件库规范：在开发新功能或进行组件重构时，**禁止自己手动封装基础组件**。必须优先使用 `shadcn-vue` 的标准组件。对于组件的管理、安装与调试，应使用 `shadcn` MCP 工具，并参考项目内的 [@.agents/skills/shadcn-vue](file:///Users/aohan/aohan_dev_self_project/Schedule/.agents/skills/shadcn-vue) 技能规范。

### Testing Requirements
- 运行测试：在根目录下执行 `npx vitest run --root .` 运行所有测试。
- 在修改/重构任何底层逻辑时，必须首先通过单元测试。

### Common Patterns
- 采用 Repository 模式解耦前端与平台层（Sqlite/内存）。
- 业务逻辑抽离至 utils，状态管理采用 Pinia。

## Dependencies

### External
- Vue 3.4 - 前端渐进式框架
- Vite 8.1 - 极速前端构建工具
- Tailwind CSS 4.3 - 现代 CSS 样式系统
- Pinia 2.1 - 响应式状态管理库
- Tauri 2.11 - 跨平台桌面壳程序
- TypeScript 5.0 - 静态类型安全

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
