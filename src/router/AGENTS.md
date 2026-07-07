<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# router

## Purpose
前端路由管理器配置目录。负责定义单页应用（SPA）中各个主要视图（日程、分类等）的 URL 映射关系及导航跳转。

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | 实例化 Vue Router，映射 `/` (重定向至 `/schedules`)、`/schedules` (日程视图)、`/categories` (分类视图) 等页面组件 |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 每次新增视图或页面时，需要在此处的 `routes` 数组中添加对应的映射关系，并配置合理的路由名称与懒加载（`import(...)`）。

### Testing Requirements
- 暂无独立路由测试。手动进行页面切换检查页面是否能正常流转，无 404 或死循环重定向。

### Common Patterns
- 路由表配置，使用 `createRouter` 与 `createWebHistory`。

## Dependencies

### Internal
- `src/views/` - 路由的目标组件页面

### External
- `vue-router` - 核心路由组件

<!-- MANUAL: -->
