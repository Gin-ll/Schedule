<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# src

## Purpose
Tauri 桌面端应用 Rust 侧的核心业务逻辑目录。定义了应用运行入口、SQLite 数据库驱动初始化、表结构的首次迁移配置，以及桌面日志与系统通知插件的安装注册。

## Key Files
| File | Description |
|------|-------------|
| `lib.rs` | Tauri 核心引导库。包含 `run()` 函数，定义了 SQLite 迁移机制（创建 `categories` 与 `schedules` 物理表），注册了日志、通知和 SQL 插件 |
| `main.rs` | 桌面端可执行程序的主入口，仅仅负责调用 `app_lib::run()` |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 数据库表变更：如果前端修改了数据模型（`src/types/index.ts`），必须在此处的 `lib.rs` 中的 `migrations` 数组里追加 SQL 变更语句。
- 严禁删除已有的 migration 历史记录或降低其 `version` 版本号，这会导致已有用户的本地数据库迁移损坏。必须采用追加版本（递增 version）的方式在 vectors 中添加新 Migration。
- 应用配置：可以在 `tauri::Builder::default()` 链中挂载自定义的 Rust `#[tauri::command]` 原生方法并暴露给前端调用。

### Testing Requirements
- 修改 Rust 代码后，需运行 `cargo check` 或通过 `npm run tauri dev` 确认其能正常完成 Rust 编译并运行。

### Common Patterns
- 采用 Tauri v2 的模块化架构（将 main.rs 作为浅入口，核心逻辑均写入 lib.rs 以利于单元测试与重用）。
- 使用 `tauri_plugin_sql::Migration` 方式自动控制本地 SQLite 表版本的迁移与迭代。

## Dependencies

### Internal
- 暂无。

### External
- `tauri` - 宿主运行框架
- `tauri-plugin-sql` - 数据库持久化及表迁移插件
- `tauri-plugin-notification` - 桌面端推送插件
- `tauri-plugin-log` - 日志打印插件

<!-- MANUAL: -->
