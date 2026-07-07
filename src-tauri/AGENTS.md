<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# src-tauri

## Purpose
Tauri 跨平台桌面壳的主宿主环境（Rust 侧），负责宿主窗口生命周期管理、本地网络访问权限配置、原生插件挂载，以及 SQLite 数据库文件的迁移与连接管理。

## Key Files
| File | Description |
|------|-------------|
| `Cargo.toml` | Rust 项目清单，包含 Rust 依赖项声明（如 tauri, tauri-plugin-sql 等） |
| `tauri.conf.json` | Tauri 全局配置文件，定义应用标识符、打包参数、捆绑包及插件权限 |
| `build.rs` | Tauri 编译辅助脚本，负责在构建时注入特定平台资源与清单 |
| `icon.png` | 桌面应用的主图标源文件 |
| `Cargo.lock` | Rust 依赖的锁定文件，保证构建可复现性 |
| `.gitignore` | 针对 Rust 编译生成物 `target` 及临时文件的 git 忽略配置 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `capabilities/` | 声明前端页面对 Tauri 各插件的权限映射配置 (见 `capabilities/AGENTS.md`) |
| `src/` | Rust 核心源码，包含启动函数 `run` 及 SQLite 数据表初始迁移 (见 `src/AGENTS.md`) |
| `icons/` | 应用跨平台各种尺寸图标（如 ICO、ICNS、Android/iOS 资产），由于均为图片资源，故跳过生成独立 AGENTS.md |
| `gen/` | Tauri 自动生成的各种类型文件和架构定义，属于构建产物，跳过生成独立 AGENTS.md |

## For AI Agents

### Working In This Directory
- 每次在 Cargo.toml 中添加 Rust 依赖或修改配置后，需要在开发环境下测试是否编译通过。
- 当向前端暴露新的 Tauri 原生功能（如文件系统、通知、对话框等）时，必须在 `capabilities/default.json` 中配置对应的允许权限，否则前端调用会抛出权限错误。
- 数据库结构变更：若需要修改日程或分类的本地存储结构，必须在 `src/lib.rs` 的 `migrations` 向量中递增版本号并追加新的 SQL 升级语句。

### Testing Requirements
- 暂无 Rust 侧的自动化单元测试。但每次修改 Rust 代码后，需通过 `npm run tauri dev` 启动应用，并检查终端是否输出构建错误或警告。

### Common Patterns
- 使用 Tauri v2 的插件体系，如 `tauri-plugin-sql` 来完成前端对 SQLite 数据库的免接口直接调用，大幅度减少 Rust 命令的编写。

## Dependencies

### External
- `tauri` - Tauri 框架底层
- `tauri-plugin-sql` - 官方 SQLite 插件，支持前端直接执行 SQL 及数据迁移
- `tauri-plugin-notification` - 桌面通知插件
- `tauri-plugin-dialog` - 原生对话框插件
- `tauri-plugin-shell` - 系统 shell 交互插件

<!-- MANUAL: -->
