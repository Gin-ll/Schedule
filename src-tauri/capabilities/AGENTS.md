<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# capabilities

## Purpose
Tauri v2 权限与能力配置目录。定义了前端渲染页面在访问 Tauri 原生桌面功能和第三方 Rust 插件（如 SQLite、通知、对话框等）时拥有的安全访问权限范围。

## Key Files
| File | Description |
|------|-------------|
| `default.json` | 默认权限映射文件。显式开启了前端对本地 SQLite 数据库读写（SELECT / EXECUTE）、桌面系统通知发送、原生系统 Dialog 弹出及监听核心窗口尺寸事件等的权限 |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 安全沙箱管理：前端如果调用了未配置在此目录下的 Tauri 原生 API（例如文件系统读取或壳程序启动），应用会发生静默拦截或抛出权限拒绝异常。
- 如果前端需要新增与 Rust 的交互或接入新的官方 Tauri 插件，必须先在 `default.json` 的 `permissions` 数组中添加对应的权限条目。

### Testing Requirements
- 修改权限后，重新编译桌面端 `npm run tauri dev` 并验证前端相应功能（如 SQLite 写入、通知弹出等）是否能正常工作，无控制台权限报错。

### Common Patterns
- 采用符合 Tauri v2 标准的能力（Capabilities）授权模型 JSON 文件。

## Dependencies

### Internal
- `src-tauri/gen/schemas/` - 强依赖其 desktop-schema.json 进行 JSON 结构校验

### External
- `tauri` - 桌面端开发底座权限系统

<!-- MANUAL: -->
