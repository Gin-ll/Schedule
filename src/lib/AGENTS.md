<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-07-07 | Updated: 2026-07-07 -->

# lib

## Purpose
前端公共第三方工具二次封装或辅助库的存放目录。目前主要提供 Tailwind CSS 类合并与冲突解决的共享方法。

## Key Files
| File | Description |
|------|-------------|
| `utils.ts` | 导出合并 CSS 类名的工具函数 `cn(...inputs)`，解决动态类名与 Tailwind 原生冲突 |

## Subdirectories
暂无。

## For AI Agents

### Working In This Directory
- 该目录下的 `utils.ts` 会被绝大部分前端组件（特别是 `components/ui/` 下的 Shadcn Primitives）频繁引用。在修改或扩充此目录文件时，必须保证向后兼容性。

### Testing Requirements
- 暂无单独的单元测试，但其作为 CSS 合并工具，它的任何错误都会导致整个页面样式崩溃。任何变动请务必在运行 `npm run dev` 后检查各 UI 元素的渲染。

### Common Patterns
- 导出简单的工具函数。

## Dependencies

### Internal
- 暂无。

### External
- `clsx` - 动态条件拼接 CSS 类
- `tailwind-merge` - Tailwind CSS 合并与消歧

<!-- MANUAL: -->
