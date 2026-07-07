# 删除操作逻辑异常捕获与弹窗保护实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解决删除日程和分类时的静默失败隐患。在 `SchedulesView` 和 `CategoriesView` 的删除逻辑中引入 `try...catch` 异常保护，并对接 `PlatformAdapter` 报错弹窗，彻底避免因底层报错（如先前权限阻碍）而导致的静默失效。

---

### Task 1: 改造 View 层删除逻辑（try...catch 弹窗）

**Files:**
- Modify: `src/views/SchedulesView.vue`
- Modify: `src/views/CategoriesView.vue`

**Interfaces:**
- Consumes: `platform.showError`
- Produces: 健壮的删除操作报错反馈

- [ ] **Step 1: 重构 SchedulesView 中的 deleteSchedule**

修改 `src/views/SchedulesView.vue` 中的 `deleteSchedule`。

修改前：
```typescript
    async function deleteSchedule(id: string) {
      if (confirm('确认删除此日程？')) {
        await store.deleteSchedule(id);
      }
    }
```

修改后：
```typescript
    async function deleteSchedule(id: string) {
      if (confirm('确认删除此日程？')) {
        try {
          await store.deleteSchedule(id);
        } catch (error: any) {
          console.error("Failed to delete schedule:", error);
          await platform.showError("删除日程失败", error.message || String(error));
        }
      }
    }
```

- [ ] **Step 2: 重构 CategoriesView 中的 deleteCategory**

修改 `src/views/CategoriesView.vue` 中的 `deleteCategory`。

修改前：
```typescript
    async function deleteCategory(id: string) {
      if (confirm('确认删除分类？属于该分类 of 日程将变为未分类状态。')) {
        await store.deleteCategory(id);
      }
    }
```

修改后：
```typescript
    async function deleteCategory(id: string) {
      if (confirm('确认删除分类？属于该分类的日程将变为未分类状态。')) {
        try {
          await store.deleteCategory(id);
        } catch (error: any) {
          console.error("Failed to delete category:", error);
          await platform.showError("删除分类失败", error.message || String(error));
        }
      }
    }
```

---

### Task 2: 静态类型检查与测试验证

- [ ] **Step 1: 执行静态编译与类型校验**

运行命令：`npx vue-tsc --noEmit && npx vitest run --root .`
Expected: PASS (0 Error, 所有 15 个 Vitest 用例全部通过)

- [ ] **Step 2: Commit 代码**

```bash
git add src/views/SchedulesView.vue src/views/CategoriesView.vue
git commit -m "refactor: wrap delete operations inside try-catch block for premium error reporting"
```
