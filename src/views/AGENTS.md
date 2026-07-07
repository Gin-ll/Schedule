<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# views

## Purpose
前端主页面视图（Views）目录。定义日程视图和大日历面板，以及分类统计列表页面。通过路由挂载，作为应用的主要用户交互场景。

## Key Files
| File | Description |
|------|-------------|
| `SchedulesView.vue` | 日程大视图页面。包含主日历（42格网格）、日程新增/编辑操作按钮、重复规则过滤侧边栏、搜索功能等 |
| `CategoriesView.vue` | 分类管理视图页面。渲染所有分类卡片，并自动计算并展示各分类的日程指标统计（总日程数、已完成数、逾期数、完成率） |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 日历渲染逻辑：`SchedulesView.vue` 从 `CalendarEngine.generateGrid` 加载 42 天格网，并在循环中按插槽展示日程。在修改日历 CSS 或日程卡片样式时，应特别注意防范超出 3 个卡槽的高度挤压。
- 调用对话框：各 View 组件中通过 `ref` 绑定并调用弹窗子组件（如 `CategoryFormDialog`, `ScheduleFormDialog`）暴露的 `open(id)` 接口，以此实现新增或编辑。
- 状态同步：所有的持久化调用需通过调用 Pinia Store 的 Action 来实现，避免在 View 中直接操作 Repository 单例以维持架构清晰。

### Testing Requirements
- 组件暂未加入自动化测试。修改布局后，请使用 `npm run dev` 运行开发服务器进行手工验证。
- 确认日程拖拽、添加、删除、编辑、状态流转（pending/completed等）能在 UI 上得到立时的响应。

### Common Patterns
- 采用 Pinia 配合 Vue 的 `computed` 属性实现统计指标的自动计算。
- 统一使用 `@iconify/vue` 渲染简洁精美的图标。

## Dependencies

### Internal
- `src/stores/scheduleStore.ts` - 页面数据的底层状态中心
- `src/components/` - 页面弹窗编辑组件
- `src/utils/calendarEngine.ts` - 日程大日历的数据生成源

### External
- `vue` - 组件逻辑
- `@iconify/vue` - 渲染精美图标库

<!-- MANUAL: -->
