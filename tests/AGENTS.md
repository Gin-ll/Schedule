<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# tests

## Purpose
项目自动化测试目录。基于 Vitest 运行，主要覆盖前端日程排布算法、数据库适配器驱动、平台解耦隔离、Pinia 状态同步及修订号同步冲突解决逻辑等。

## Key Files
| File | Description |
|------|-------------|
| `calendarScheduler.test.ts` | 验证 `CalendarEngine` 42宫格日历日程渲染算法与多天重叠日程的位置排布逻辑 |
| `databaseManager.test.ts` | 验证 `DatabaseManager` 的底层数据库适配器切换与分类、日程基础 CRUD 的集成逻辑 |
| `platformAdapter.test.ts` | 验证 `PlatformAdapter` 的执行环境检测，判断是纯 Web 浏览器还是 Tauri 桌面环境 |
| `repositoryAdapter.test.ts` | 验证 `RepositoryAdapter` 屏蔽物理介质的具体实现层，实现上层无感的数据操作 |
| `scheduleStore.test.ts` | 验证 Pinia 日程状态管理器中的日程载入、增删改查动作与状态变更同步 |
| `syncService.test.ts` | 验证修订版本修订号同步算法，测试双向数据合并、删除标记处理及网络同步修订冲突解决策略 |
| `tauriSqliteAdapter.test.ts` | 验证基于 Tauri 原生 SQLite 驱动的适配器方法与 SQL 执行正确性 |

## Subdirectories
暂无子目录。

## For AI Agents

### Working In This Directory
- 所有的测试文件格式应命名为 `*.test.ts`，以便 Vitest 自动发现。
- 引入新功能或修改已有工具类（utils）时，必须在此处编写对应的单元测试进行验证。
- 编写测试时应尽量隔离 Tauri 环境，使用 Mock 或者 Fallback Memory 适配器以保证测试能在标准 Node 环境（无 Rust/Tauri 依赖）中快速运行。

### Testing Requirements
- 运行测试命令：在项目根目录下运行 `npx vitest run --root .`。
- 测试覆盖标准：新写的核心业务逻辑覆盖率应尽可能接近 100%。

### Common Patterns
- 采用 `vitest` 的 `describe`, `it`, `expect` 断言体系。
- 测试数据准备：每次测试均应当使用独立的 Mock 数据或全新的内存适配器，避免测试用例间的数据污染。

## Dependencies

### Internal
- `src/utils/` - 测试所验证的各种业务工具类
- `src/types/` - 日程和分类等数据模型类型

### External
- `vitest` - 现代化单元测试运行器

<!-- MANUAL: -->
