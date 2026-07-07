<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# src

## Purpose
前端核心源码目录（Vue 3 + Vite + Tailwind CSS v4）。负责日程安排和分类管理的用户界面渲染、路由跳转、全局状态管理，以及与底层 Tauri/SQLite 数据服务的交互。

## Key Files
| File | Description |
|------|-------------|
| `main.ts` | 前端渲染进程的初始化入口文件，挂载 Vue App 并加载 Pinia 与路由配置 |
| `App.vue` | Vue 根组件，定义了应用的主视图骨架与全局路由出口 |
| `index.html` | 前端入口 HTML，定义挂载容器 `#app` |
| `styles.css` | 主样式表文件，包含 Tailwind CSS v4 导入和基础 CSS 样式 |
| `verify-build.ts` | 辅助构建验证的启动代码，提供不含 DOM 依赖的 Vue 引导实例测试接口 |
| `env.d.ts` | 全局 TypeScript 类型声明文件，解决 `.vue` 文件导入的类型识别问题 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `assets/` | 静态资源目录（如图标、标志等），仅包含单文件 logo.png，不生成独立 AGENTS.md |
| `components/` | 页面组件及 Shadcn UI 基础组件 (见 `components/AGENTS.md`) |
| `lib/` | 前端辅助方法（如 Tailwind 类合并） (见 `lib/AGENTS.md`) |
| `router/` | Vue Router 路由配置 (见 `router/AGENTS.md`) |
| `stores/` | Pinia 状态管理库 (见 `stores/AGENTS.md`) |
| `types/` | 统一的 TypeScript 接口与类型声明 (见 `types/AGENTS.md`) |
| `utils/` | 业务适配器、网络同步、本地数据库管理器及日历计算引擎 (见 `utils/AGENTS.md`) |
| `views/` | 包含主要页面视图（日程大视图、分类管理视图） (见 `views/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 严格遵循 Vue 3 Composition API（`<script setup lang="ts">`）的编写规范。
- 样式修改：本目录下的 `styles.css` 是 Tailwind CSS v4 的主入口，支持新版的 CSS `@theme` 样式配置，请勿尝试在此之外创建 `tailwind.config.js` 的配置。
- 路由跳转应使用 `vue-router`，状态共享使用 Pinia。

### Testing Requirements
- 修改 `utils/` 或 `stores/` 时，必须运行 `npx vitest run --root .` 确保通过全部 15 项核心单元测试。

### Common Patterns
- 采用 Adapters 隔离层，在 `utils/` 中根据平台类型调用 Tauri API 或 Fallback 内存存储，使得渲染层完全不关心底层是 Tauri 桌面版还是普通 Web 浏览器。

## Dependencies

### Internal
- `src/utils/` - 全局核心工具及适配器
- `src/stores/` - 全局日程状态管理
- `src/types/` - 全局类型系统

### External
- `vue` - 前端核心框架
- `pinia` - 状态管理
- `vue-router` - 路由管理器
- `tailwindcss` - 编译样式系统

<!-- MANUAL: -->
