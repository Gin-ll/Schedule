<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# utils

## Purpose
项目核心工具类与架构适配器目录。负责屏蔽平台物理层（Web 浏览器 localStorage 与 Tauri/SQLite 原生连接）、进行双向数据修订版本修订号同步（Sync）、计算日历格网事件冲突与重叠定位等。

## Key Files
| File | Description |
|------|-------------|
| `calendarEngine.ts` | 核心日历算法引擎，负责按月生成 42 天格网，并在多天重叠日程时分配 0-2 的垂直卡槽位置 |
| `platformAdapter.ts` | 运行宿主环境适配层，检测并在桌面端下调用原生对话框、窗口与通知，在 Web 端使用 fallback |
| `repositoryAdapter.ts` | 仓储模式抽象层接口，提供 Mock 内存及 LocalStorage 分支实现 |
| `tauriSqliteAdapter.ts` | 桌面端 Tauri SQL SQLite 驱动的具体适配实现，解决多线程写竞争（Write Queue）并增加 WAL 和超时控制 |
| `databaseManager.ts` | 数据库总协调器，负责初始化懒加载的 SQLite 数据库，并向外暴露 `scheduleRepo` 与 `categoryRepo` 单例 |
| `syncService.ts` | 双向同步管理器，负责修订冲突检测（LWW LWWConflictResolver）、同步网络退避重试（指数退避）与大块分批（100条）ACK 算法 |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 日历算法修改：`calendarEngine.ts` 返回的格子中 `slots` 卡槽被严格限制为 3 行高。如果改动此处，可能影响界面的折叠与显示逻辑。
- 数据库适配器：所有的仓储库写操作都必须通过 `DomainRepository` 完成，它会根据当前是否是 Tauri 平台自动路由至 LocalStorage 或 SQLite 读写。
- 数据库写队列：`TauriSqliteAdapter` 中包含一个串行化的 `writeQueue` 链式 Promise，用以防止 SQLite 多协程并发写冲突。在此编写异步写入操作时必须遵循这一链式队列设计。

### Testing Requirements
- 此目录是整个项目最需要测试覆盖的重点。任何修改，请在根目录下执行 `npx vitest run --root .` 运行所有测试以保证不破坏任何适配器或算法的行为。

### Common Patterns
- 采用 Repository 仓储设计模式解耦上层状态与底层数据库。
- 同步服务使用 LWW（Last-Write-Wins）修订号版本冲突解决策略。

## Dependencies

### Internal
- `src/types/` - 获取日程和分类的数据结构定义

### External
- `@tauri-apps/plugin-sql` - Tauri 官方 SQLite 底层连接驱动
- `@tauri-apps/plugin-notification` - 桌面端原生通知驱动
- `@tauri-apps/plugin-dialog` - 桌面端原生对话框驱动

<!-- MANUAL: -->
