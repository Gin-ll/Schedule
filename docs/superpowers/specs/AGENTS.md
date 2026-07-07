<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# specs

## Purpose
项目各模块架构设计、技术选型与协议规格说明书目录。重点关注日历位置计算理论、同步冲突合并逻辑（LWW）和实体关系建模。

## Key Files
| File | Description |
|------|-------------|
| `2026-07-07-schedule-architecture-refactor-design.md` | 针对日程核心适配器、仓储及依赖注入机制重构的设计规格书 |
| `2026-07-07-shadcn-vue-components-redesign.md` | 基于 Radix 与 Tailwind v4 设计的高档感主题交互美化设计规范 |
| `2026-07-07-vue3-migration-p2p-sync-design.md` | 本地 SQLite 增量同步修订号（Revision）同步模型与冲突化解机制的设计规格书 |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 设计文档用于阐释复杂系统的“为什么”而非单纯的“是什么”。在调整如 `syncService.ts` 的冲突解决算法时，必须确保其实现符合 `2026-07-07-vue3-migration-p2p-sync-design.md` 的规范。
- 备份文件（`*.backup`）在此目录中可能会有，编辑时以主 `.md` 为准。

### Testing Requirements
- 暂无。

### Common Patterns
- 包含数据库 ER 图、逻辑拓扑图及算法公式。

## Dependencies

### Internal
- 暂无。

### External
- 暂无。

<!-- MANUAL: -->
