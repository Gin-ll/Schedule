# Dialog 保存逻辑异常捕获与原生弹窗实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解决新增/编辑日程及分类对话框在保存失败时静默锁死的问题。通过在 `PlatformAdapter` 中引入多端多态错误展示接口 `showError`，以在 Tauri 桌面端调用系统原生 Dialog 报错，在 Web 浏览器端调用 `alert` 报错，并重构 Views 提交表单逻辑实现安全对话框关闭。

**Architecture:** 
1. 扩展 `PlatformAdapter` 声明并升级 `WebPlatformAdapter` 与 `TauriPlatformAdapter`；
2. 为 Views 层 (`SchedulesView.vue`, `CategoriesView.vue`) 添加 `try...catch` 块；
3. 确保任何保存时的运行时 Error 均能被弹窗妥善捕获显示，防范执行中断导致的 Dialog 不关闭 Bug。

**Tech Stack:** Vue 3, TypeScript, Tauri Plugin Dialog, Vitest

## Global Constraints
- 测试运行器：使用 Vitest 且必须附带 `--root .` 运行。
- 类型安全性：在重构过程中，所有文件必须通过 `vue-tsc --noEmit` 静态类型检查。
- 代码库规范：禁止使用 `TODO` 或任何伪代码占位符。

---

### Task 1: 扩展 PlatformAdapter 接口并实现 showError 逻辑

**Files:**
- Modify: `src/utils/platformAdapter.ts`
- Modify: `tests/platformAdapter.test.ts`

**Interfaces:**
- Consumes: `platform` 单例
- Produces: `PlatformAdapter.showError(title, message)` 接口多态实现

- [ ] **Step 1: 编写失败测试 (断言 Web 平台调用 alert 报错)**

修改 `tests/platformAdapter.test.ts` 追加测试用例：
```typescript
import { describe, it, expect, vi } from 'vitest';
import { WebPlatformAdapter } from '../src/utils/platformAdapter';

describe('WebPlatformAdapter', () => {
  it('should fallback to browser notification API', async () => {
    const mockNotification = vi.fn() as any;
    mockNotification.permission = 'granted';
    vi.stubGlobal('Notification', mockNotification);
    vi.stubGlobal('window', { Notification: mockNotification });
    
    const adapter = new WebPlatformAdapter();
    await adapter.sendNotification('Test Title', 'Test Body');
    expect(mockNotification).toHaveBeenCalled();
  });

  it('should fallback to window.alert for showError', async () => {
    const mockAlert = vi.fn();
    vi.stubGlobal('alert', mockAlert);

    const adapter = new WebPlatformAdapter();
    await adapter.showError('Error Title', 'Something went wrong');
    expect(mockAlert).toHaveBeenCalledWith('Error Title: Something went wrong');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

运行: `npx vitest run --root . tests/platformAdapter.test.ts`
Expected: FAIL (因为 `WebPlatformAdapter` 尚未实现 `showError` 接口)

- [ ] **Step 3: 最小化实现 PlatformAdapter 变动**

修改 `src/utils/platformAdapter.ts`：
```typescript
export interface PlatformAdapter {
  initWindow(): Promise<void>;
  sendNotification(title: string, body: string): Promise<void>;
  requestPermission(): Promise<boolean>;
  showError(title: string, message: string): Promise<void>;
}

export class TauriPlatformAdapter implements PlatformAdapter {
  async initWindow() {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      await win.show();
    } catch (e) {
      console.error("Tauri initWindow error:", e);
    }
  }
  async sendNotification(title: string, body: string) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification({ title, body });
  }
  async requestPermission() {
    const { requestPermission, isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === 'granted';
    }
    return granted;
  }
  async showError(title: string, message: string) {
    try {
      const { message: tauriMessage } = await import('@tauri-apps/plugin-dialog');
      await tauriMessage(message, { title, kind: 'error' });
    } catch (e) {
      console.error("Tauri dialog error:", e);
      alert(`${title}: ${message}`);
    }
  }
}

export class WebPlatformAdapter implements PlatformAdapter {
  async initWindow() {
    console.log("Web window setup: no window layout to restore");
  }
  async sendNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else {
      console.log(`[Web Notification] ${title}: ${body}`);
    }
  }
  async requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const status = await Notification.requestPermission();
    return status === 'granted';
  }
  async showError(title: string, message: string) {
    alert(`${title}: ${message}`);
  }
}

export const platform = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ 
  ? new TauriPlatformAdapter() 
  : new WebPlatformAdapter();
```

- [ ] **Step 4: 运行测试验证通过**

运行: `npx vitest run --root . tests/platformAdapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/platformAdapter.ts tests/platformAdapter.test.ts
git commit -m "feat: add showError platform adapter interface for native and web support"
```

---

### Task 2: 改造 View 层表单提交逻辑（try...catch 弹窗）

**Files:**
- Modify: `src/views/SchedulesView.vue`
- Modify: `src/views/CategoriesView.vue`

**Interfaces:**
- Consumes: `platform.showError`
- Produces: 健壮无死锁的前端视图表单提交函数

- [ ] **Step 1: 编写静态编译类型检查**

运行: `npx vue-tsc --noEmit`
Expected: FAIL (因为 `PlatformAdapter` 接口有了变更，且有其他文件需要重新适配导入，或者直接通过编译看是否有报错)

- [ ] **Step 2: 重构 SchedulesView 提交日程**

修改 `src/views/SchedulesView.vue` 中的 `saveSchedule` 逻辑。同时需要确保导入 `platform`。

导入：
```vue
// 检查或在文件 script 头部追加导入
import { platform } from '../utils/platformAdapter';
```

修改 `saveSchedule` 提交日程函数：
```typescript
    async function saveSchedule() {
      try {
        const payload = {
          title: form.value.title,
          content: form.value.content,
          startTime: new Date(form.value.startTime).toISOString(),
          endTime: form.value.endTime ? new Date(form.value.endTime).toISOString() : undefined,
          recurrence: form.value.recurrence,
          categoryId: form.value.categoryId,
          status: form.value.status,
          reminder: form.value.reminder,
          important: form.value.important,
          subtasks: form.value.subtasks
        };

        if (isEditing.value && editingId.value) {
          await store.updateSchedule(editingId.value, payload);
        } else {
          await store.addSchedule(payload);
        }
        closeDialog();
      } catch (error: any) {
        console.error("Failed to save schedule:", error);
        await platform.showError("保存日程失败", error.message || String(error));
      }
    }
```

- [ ] **Step 3: 重构 CategoriesView 提交分类**

修改 `src/views/CategoriesView.vue` 中的 `saveCategory` 逻辑。同时确保导入 `platform`。

导入：
```vue
// 检查或在文件 script 头部追加导入
import { platform } from '../utils/platformAdapter';
```

修改 `saveCategory` 提交分类函数：
```typescript
    async function saveCategory() {
      try {
        if (isEditing.value && editingId.value) {
          await store.updateCategory(editingId.value, {
            name: form.value.name,
            color: form.value.color,
            note: form.value.note
          });
        } else {
          await store.addCategory({
            name: form.value.name,
            color: form.value.color,
            note: form.value.note
          });
        }
        closeDialog();
      } catch (error: any) {
        console.error("Failed to save category:", error);
        await platform.showError("保存分类失败", error.message || String(error));
      }
    }
```

- [ ] **Step 4: 验证类型检查与静态编译成功**

运行: `npx vue-tsc --noEmit && npx vitest run --root .`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/SchedulesView.vue src/views/CategoriesView.vue
git commit -m "refactor: wrap view form submit inside try-catch block and show premium OS error popups"
```
