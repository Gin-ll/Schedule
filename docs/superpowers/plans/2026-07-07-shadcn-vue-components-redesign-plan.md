# Schedule 视图表单组件 Shadcn-vue 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按照重构设计规格书，在项目中拉取所有的 Shadcn UI 基础组件。然后将日程与分类的新增和编辑表单彻底从 `SchedulesView` 和 `CategoriesView` 视图页面中解耦，提炼为两个高内聚的 Vue 业务子组件。同时修复 Tailwind v4 的 oklch 颜色解析冲突，补齐 Dialog 无障碍（A11y）元素，拦截边界数据，防止数据污染和状态死锁。

---

### Task 1: 拉取 UI 基础组件并修复 styles.css 颜色坍塌

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: 安装依赖并拉取基础 UI 组件**

运行命令自动拉取组件源码（生成在 `src/components/ui/` 目录下）：
```bash
npx shadcn-vue@latest add button dialog select checkbox input textarea label
```

- [ ] **Step 2: 修复 styles.css 色彩冲突**

修改 `src/styles.css`，将 `@theme inline` 块内关于颜色映射的包装全部替换为不带 `hsl()` 包装的原生代理。同时，在 `.dark` 控制器中对 `--text` 追加重置：

修改前：
```css
@theme inline {
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  /* ... */
}
```

修改后：
```css
@theme inline {
  --font-sans: 'Geist Variable', sans-serif;
  --font-heading: var(--font-sans);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-foreground: var(--foreground);
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

.dark {
  --text: oklch(0.985 0 0);
  /* 原有 shadcn-vue 生成的 dark oklch 变量保持不动 */
}
```

- [ ] **Step 3: 验证**

运行 `npx vue-tsc --noEmit` 检查语法及构建是否正常。

---

### Task 2: 实现分类表单子组件 CategoryFormDialog.vue

**Files:**
- Create: `src/components/CategoryFormDialog.vue`

- [ ] **Step 1: 建立 CategoryFormDialog.vue 文件结构**

使用 `<Dialog>`、`<DialogContent>`、`<DialogHeader>`、`<DialogTitle>`、`<Input>` 等组件。

- [ ] **Step 2: 实现数据提取与回显逻辑**

* 引入 `useScheduleStore` 并提取分类数据。
* 编写 `open(categoryId?: string)` 接口：
  * 若有 ID，通过 `store.categories.find(...)` 获取行数据并进行 `JSON.parse(JSON.stringify(...))` 深拷贝；
  * 若无，重置表单为默认值（name 为空，color 默认 `#007aff`，note 为空）。

- [ ] **Step 3: 绑定 openState 的 watch 监听以防脏残留**

```typescript
watch(openState, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});
```

- [ ] **Step 4: 实现 saveCategory() 动作与拦截**

* 校验必填项 `name`，执行 `trim()` 并判断是否为空格。
* 点击保存时将 `isSaving` 置为 `true`，并将按钮设为禁用。保存失败时，调用 `platform.showError` 弹出错误窗并重置 `isSaving = false`（保留当前输入）；保存成功后触发 `emit('saved')` 并关闭。

---

### Task 3: 重构 CategoriesView.vue 页面

**Files:**
- Modify: `src/views/CategoriesView.vue`

- [ ] **Step 1: 修改模板结构**

删除原 `<dialog ref="categoryDialogRef">` 全部原生标签，引入并注册：
```html
<CategoryFormDialog ref="categoryFormRef" />
```

- [ ] **Step 2: 移出表单逻辑**

* 删除 setup 中的 `categoryDialogRef`、`form`、`isEditing` 等临时状态。
* 删除 `saveCategory` 方法。
* 重构 `openAddDialog` 和 `openEditDialog`：
```typescript
const categoryFormRef = ref<InstanceType<typeof CategoryFormDialog> | null>(null);

function openAddDialog() {
  categoryFormRef.value?.open();
}
function openEditDialog(category: Category) {
  categoryFormRef.value?.open(category.id);
}
```

- [ ] **Step 3: 类型校验**

运行 `npx vue-tsc --noEmit` 确认无类型报错。

---

### Task 4: 实现日程表单子组件 ScheduleFormDialog.vue

**Files:**
- Create: `src/components/ScheduleFormDialog.vue`

- [ ] **Step 1: 建立 ScheduleFormDialog.vue 结构与 A11y 支持**

* 配齐 `<DialogTitle>` 和 `<DialogDescription class="sr-only">`（包含隐藏说明）。
* 将 Checkbox 与 Label 使用 `id="formImportant"` 和 `for="formImportant"` 显式关联。
* 分类、循环规则、状态、提醒使用 Shadcn 的 `<Select>` 系列标签构建。

- [ ] **Step 2: 实现状态初始化与时间字符串映射**

* 引入 `useScheduleStore`。
* `open(scheduleId)` 被调用时：
  * 若有 ID：在 Store 中加载行，在深拷贝后，将 ISO 开始/结束时间字符串通过本地 `toLocaleString('sv').slice(0, 16).replace(' ', 'T')` 转换赋给 `form` 进行回显；
  * 若无：执行 `resetForm()` 重置，默认设置开始时间为整点后 1 小时，结束时间 +2 小时。

- [ ] **Step 3: 绑定 watch 监听以清除脏状态**

侦听 `openState`。一旦为 `false`，重置所有 `form` 字段和子任务。

- [ ] **Step 4: 实现 saveSchedule() 业务拦截与防重复提交**

* 对标题 `title` 执行 `trim()` 拦截非空。
* 检查开始时间与结束时间：若 `startTime >= endTime`，拦截并调用 `platform.showError` 提醒用户。
* 添加子任务 `addSubtask()` 时过滤纯空格，并判断 `title` 是否重复。
* 保存时通过 `isSaving` 状态锁定 UI。异步保存成功后 `emit('saved')`；保存报错时通过 `platform.showError` 报错。

---

### Task 5: 重构 SchedulesView.vue 页面

**Files:**
- Modify: `src/views/SchedulesView.vue`

- [ ] **Step 1: 清理模板**

删除原有 90 行的 `<dialog ref="scheduleDialogRef">` 及其子节点，引入并注册：
```html
<ScheduleFormDialog ref="scheduleFormRef" />
```

- [ ] **Step 2: 清理逻辑**

* 移出 `scheduleDialogRef` 变量、原生的 `closeDialog` 方法。
* 移出表单相关的 `form`、`newSubtaskTitle` 等状态。
* 移出 `addSubtask`、`removeSubtask`、`saveSchedule` 方法。
* 重构 `openAddDialog` 和 `openEditDialog` 接口：
```typescript
const scheduleFormRef = ref<InstanceType<typeof ScheduleFormDialog> | null>(null);

function openAddDialog() {
  scheduleFormRef.value?.open();
}
function openEditDialog(schedule: Schedule) {
  scheduleFormRef.value?.open(schedule.id);
}
```

---

### Task 6: 编译与测试回归验证

- [ ] **Step 1: 运行类型校验与全量测试**

运行命令：
```bash
npx vue-tsc --noEmit && npx vitest run --root .
```
Expected: PASS (类型检查无错，所有 15 个用例全部绿灯通过)

- [ ] **Step 2: Commit 代码**

```bash
git add .
git commit -m "refactor: upgrade schedules and categories view forms using high-end shadcn-vue decoupled components"
```
