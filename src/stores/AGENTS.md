<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# stores

## Purpose
Pinia 响应式状态管理目录。负责维护内存中的日程（Schedules）和分类（Categories）列表，管理加载状态（loading），并同步调度本地数据库（SQLite/LocalStorage/Memory）的读写和网络数据同步（Sync）操作。

## Key Files
| File | Description |
|------|-------------|
| `scheduleStore.ts` | 核心日程与分类 Pinia Store。封装了加载、增加、修改、删除及触发网络修订版本同步等操作。在内存状态变更的同时，调用底层 Repository 自动写入物理介质 |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 日程的删除、修改动作不仅需要更新 Pinia 中的 `schedules` 数组状态，也必须同时触发底层的 `scheduleRepo` 异步保存或删除操作，确保内存状态与物理数据库持久化保持一致。
- 逻辑依赖：本目录下的 Store 强烈依赖 `utils/databaseManager` 中暴露的 `scheduleRepo` 与 `categoryRepo` 单例。
- 异步锁：在涉及批量更新或网络同步 `syncWithRemote` 操作时，需切换 `loading` 状态，防止上层组件在此期间发生二次写操作造成脏数据。

### Testing Requirements
- 修改 Actions 逻辑后，需运行 `npx vitest run tests/scheduleStore.test.ts` 以验证 Store 的行为是否符合预期。

### Common Patterns
- 使用 Pinia 的 `defineStore` 方法。
- ID 生成规则：新日程 ID 使用 `sch-${Date.now()}-${random}` 格式；新分类 ID 使用 `cat-${Date.now()}-${random}` 格式。

## Dependencies

### Internal
- `src/types/` - 日程与分类模型定义
- `src/utils/databaseManager.ts` - 本地持久化接口适配层
- `src/utils/syncService.ts` - 网络数据修订合并处理器

### External
- `pinia` - 前端全局状态管理系统

<!-- MANUAL: -->
