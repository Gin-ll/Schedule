<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# types

## Purpose
公共 TypeScript 类型声明目录。定义了日程、日程状态、重复频率、子任务、分类等项目核心数据模型的 TypeScript 接口，确保各层级（UI、Store、Repository、Adapters、Tests）之间的静态类型一致性。

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | 导出 `Schedule`, `Category`, `Subtask`, `RecurrenceType`, `ScheduleStatus` 等核心接口与字面量联合类型 |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 该目录是整个应用数据模型的单一可信源。在修改此处接口（例如为 `Schedule` 接口添加新属性）时，必须同时：
  1. 修改 SQLite 数据库迁移脚本（`src-tauri/src/lib.rs` 中的建表语句）
  2. 修改或适配测试用例中的 Mock 数据对象。
  3. 检查 UI 对话框与适配器序列化方法以兼容新字段。

### Testing Requirements
- 暂无单独的单元测试，任何对类型的修改都会通过 TypeScript 编译器报错得到反馈。修改后请确保运行 `npm run build` 以校验全局 TypeScript 编译通过。

### Common Patterns
- 采用规范的 TypeScript `interface` 与 `type` 语法。
- 时间戳字段（如 `startTime`, `endTime`, `createdAt`, `updatedAt`）要求统一采用 ISO 8601 格式的字符串。

## Dependencies

### Internal
- 暂无。

### External
- 暂无。

<!-- MANUAL: -->
