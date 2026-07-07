<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# ui

## Purpose
基础 UI 组件库封装目录（Shadcn UI Vue 风格实现）。提供按钮、输入框、下拉框、弹出层、对话框、多行文本域等高复用性、支持可访问性（a11y）标准的基础无样式组件封装。

## Key Files
本目录下仅包含 UI 组件子目录，跳过了对各独立叶子目录创建 `AGENTS.md` 的冗余配置，各组件功能如下：

| Directory/Component | Description |
|---------------------|-------------|
| `button/` | 基础按钮组件，封装了 `class-variance-authority` (cva) 的各种样式变体（主、次、危险、幽灵等） |
| `calendar/` | 日历小面板与日期选择底座组件 |
| `checkbox/` | 复选框组件，基于 Radix / Reka 的 Checkbox 实现 |
| `dialog/` | 模态对话框遮罩及内容包裹体组件 |
| `input/` | 基础单行文本输入框组件 |
| `label/` | 输入标签组件，支持点击关联与不可点击变灰 |
| `native-select/` | 基于原生 H5 select 包装的高性能下拉框组件 |
| `popover/` | 气泡悬浮窗定位组件 |
| `select/` | 自定义修饰的高档感下拉框组件 |
| `textarea/` | 自适应或固定高度的多行备忘输入框组件 |

## Subdirectories
上述表格所包含的 10 个子目录均为基础组件实现，此处跳过单独为它们生成 AGENTS.md 文件的步骤以简化项目结构。

## For AI Agents

### Working In This Directory
- 此处的全部组件均为**纯视觉与底层交互基类**，不要在这些组件中导入或调用任何特定的业务状态（Pinia Store）、数据库（Repository）或路由行为，必须保持其纯净的 Dumb Component 特性。
- 样式定制：采用 Tailwind CSS v4 与 Class Variance Authority (`cva`) 配合类合并工具 `cn(...)` 执行样式覆盖，所有参数（Variant、Size等）需要有默认值配置。
- 如果需要调整样式，直接修改各组件目录下的 `.vue` 主渲染文件。
- 组件库与封装规范：**在此目录下禁止手动封装新的基础 UI 原语**。AI 代理在添加新底层 UI 时，应当通过调用 `shadcn` MCP 工具或应用 [@.agents/skills/shadcn-vue](file:///Users/aohan/aohan_dev_self_project/Schedule/.agents/skills/shadcn-vue) 技能来管理和拉取 shadcn-vue 组件，以保证组件库的统一性。

### Testing Requirements
- 暂无单独的单元测试。但在每次重构、升级 Tailwind v4 编译环境时，必须在前端交互页面中逐一呼出并校验这些基础组件是否发生样式跑飞。

### Common Patterns
- 采用 Radix UI Vue (通过 `reka-ui` 导出) 无样式交互原语。
- 使用 `index.ts` 将组件统一导出（Barrel exports），以便在其他模块中以 `import { Button } from '@/components/ui/button'` 格式精简引用。

## Dependencies

### Internal
- `src/lib/utils.ts` - 核心类名合并方法 `cn`

### External
- `reka-ui` - 无样式 UI 骨架库
- `class-variance-authority` - 组件多风格变体声明库
- `clsx` / `tailwind-merge` - 样式融合底座

<!-- MANUAL: -->
