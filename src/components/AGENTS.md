<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# components

## Purpose
公共及业务 Vue 组件目录。负责日程大视图中的事件编辑、分类新增与管理等弹出对话框组件。

## Key Files
| File | Description |
|------|-------------|
| `CategoryFormDialog.vue` | 分类新增及编辑表单对话框，支持设置颜色（12色板）、名称与备注，并包含必填校验 |
| `ScheduleFormDialog.vue` | 日程新增与编辑表单对话框，支持设置日程标题、类别关联、时间区间、重复规则、重要度及备忘内容 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `ui/` | 经过解耦和二次封装的 Shadcn UI 基础组件库 (见 `ui/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- 所有的表单修改对话框应通过 `defineExpose` 暴露出 `open(id?: string)` 方法，以供父视图直接调用。
- 组件内部需要 watch 自身的 openState，在弹窗关闭时自动触发 resetForm 释放数据，以防止跨对象编辑造成的脏缓存。
- 原生交互适配：如果涉及到 Tauri 独有功能（如原生 Dialog 消息），需要通过平台适配层逻辑处理。
- 组件规范：**禁止自己手动开发封装基础 UI 组件**。如需新增或修改底层 UI 元素，必须调用 `shadcn` MCP 工具或遵循 [@.agents/skills/shadcn-vue](file:///Users/aohan/aohan_dev_self_project/Schedule/.agents/skills/shadcn-vue) 引入标准组件。

### Testing Requirements
- 暂未对 Vue 组件编写挂载测试。前端交互修改后请手动运行 `npm run dev` 验证对话框是否能够正常呼出、保存和取消，并检测必填项（如分类名、日程名）拦截是否生效。

### Common Patterns
- 采用 `<script setup lang="ts">` Composition 语法编写。
- 引入基础 UI 原生库均在 `ui/` 下进行，不要直接跨模块直接引入第三方繁重的 UI 库。

## Dependencies

### Internal
- `src/stores/scheduleStore.ts` - 用来保存或读取当前所有日程和分类
- `src/components/ui/` - 基础组件支持

### External
- `vue` - 响应式核心与生命周期
- `reka-ui` - shadcn 底层无样式组件库

<!-- MANUAL: -->
