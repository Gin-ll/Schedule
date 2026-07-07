# Schedule 视图表单组件 Shadcn-vue 重构规格书

本项目已成功配置了 TailwindCSS v4 和 Shadcn-vue 组件库底座。为提升用户界面视觉一致度、交互无障碍体验（A11y）以及优化前端代码架构，我们将全面替换原生的表单输入与对话框。本规格书定义了此次组件重构的模块分流设计及技术指标。

---

## 1. 目标与重构范围

### 1.1 交互组件替换清单
*   **Dialog (对话框)**：替换 `SchedulesView.vue` 和 `CategoriesView.vue` 中原生的 HTML5 `<dialog>` 标签及其 `.showModal()`/`.close()` 动作，改用 Shadcn 的 `Dialog`。
*   **Select (下拉选择)**：替换页面中关于“分类”、“循环规则”、“状态”、“提醒”等原生 `<select>` 标签，改用 Shadcn 的带动画过渡的 `Select` 组件。
*   **Input / Textarea (文本输入)**：替换标题、备注、子任务等原生 `<input>` 和 `<textarea>`，改用具有统一样式的 Shadcn `Input` 及 `Textarea`。
*   **Checkbox (复选框)**：替换重点日程的原生 `<input type="checkbox">`，改用具有无障碍焦点的 Shadcn `Checkbox`。

### 1.2 架构分流补妥指标
*   **彻底消除父子组件数据泄露**：子组件对从 Store 引入的编辑对象在赋值时必须做深度拷贝（Deep Copy），防止修改中途污染外部 Store 状态。
*   **主视图瘦身**：主视图 `SchedulesView.vue` 模板大小减少 90+ 行，逻辑代码减少 150+ 行，业务表单完全解耦内聚。

---

## 2. 详细技术设计

### 2.1 UI 依赖组件库安装
通过 CLI 下载并安装以下底层 Shadcn UI 组件：
```bash
npx shadcn-vue@latest add button dialog select checkbox input textarea label
```

### 2.2 子组件设计

#### 2.2.1 日程表单组件 (`ScheduleFormDialog.vue`)
*   **文件路径**：`src/components/ScheduleFormDialog.vue`
*   **组件契约 (API)**:
    ```typescript
    // Emits
    const emit = defineEmits<{
      (e: 'saved'): void
    }>();

    // Expose 方法 (供父组件编程式打开)
    defineExpose({
      open: (scheduleId?: string) => void
    });
    ```
*   **数据流高内聚设计**：
    组件不再通过 Props 传参获取日程列表。在组件内部直接通过 `import { useScheduleStore } from '@/stores/scheduleStore'` 引入 Store，并在内部动态提取和回显数据：
    *   **编辑模式**：`open(scheduleId)` 被调用时，若 `scheduleId` 存在：
        1. 执行 `const item = store.schedules.find(s => s.id === scheduleId)`；
        2. 若 `item` 未找到，调用 `platform.showError("错误", "未找到该日程数据")` 并提前 return；
        3. 进行**深拷贝** `JSON.parse(JSON.stringify(item))` 赋给本地的 `form`。同时，将 ISO 时间字符串转换并格式化为前端 `<input type="datetime-local">` 期望的 `YYYY-MM-DDTHH:mm` 字符串（ Sweden 本地 sv 格式截取格式化）。
    *   **新增模式**：`open()` 被调用且无 ID 时，执行表单重置。默认将开始时间设为当前整点+1小时的 `YYYY-MM-DDTHH:mm`，结束时间+2小时。
*   **状态设计**：
    *   `openState: boolean`：绑定到 Shadcn Dialog 的 `v-model:open`。
    *   `isSaving: boolean`：防重复提交锁定状态，提交时置为 `true` 并在 UI 上对按钮进行 `disabled` 锁定。
    *   `isEditing: boolean` 与 `editingId: string | null`。
    *   `form: Ref<FormPayload>`：绑定表单各项。
*   **Dialog 被动关闭与脏数据清理**：
    必须监听（`watch`）`openState` 的变更。当 `openState` 由 `true` 变为 `false`（涵盖用户通过点击遮罩层、按 `Esc` 键等被动关闭动作），**必须触发 `resetForm()`**，清空子任务、文本框及状态缓存，保证下一次重新打开时数据不残留。
*   **表单约束校验**：
    *   在保存提交 `saveSchedule()` 时，对 `title` 字段执行 `.trim()`。若为空白或仅空格，抛出校验异常并拦截。
    *   对时间段进行业务校验：若 `startTime >= endTime`，拦截提交并提示用户。
    *   在添加子任务 `addSubtask()` 时，过滤纯空格添加，且去除重复子任务名称。
    *   在异步保存成功后，关闭弹窗并触发 `emit('saved')`；若保存失败，则调用 `platform.showError` 并重置 `isSaving = false`，**保留当前表单输入值**供用户重试。

#### 2.2.2 分类表单组件 (`CategoryFormDialog.vue`)
*   **文件路径**：`src/components/CategoryFormDialog.vue`
*   **组件契约 (API)**:
    ```typescript
    const emit = defineEmits<{
      (e: 'saved'): void
    }>();

    defineExpose({
      open: (categoryId?: string) => void
    });
    ```
*   **状态设计**：
    *   `openState: boolean`。
    *   `isSaving: boolean`。
    *   `isEditing: boolean` 与 `editingId: string | null`。
    *   `form: Ref<{ name: string; color: string; note: string }>`。
*   **内置逻辑**：
    *   组件内部直接引入 `useScheduleStore`。`open(categoryId)` 时根据 ID 提取分类行做深拷贝。
    *   `saveCategory()` 执行提交。必填项 `name` 在保存前进行 `trim()` 拦截。保存期间将提交按钮置为 `disabled` 状态，报错时通过 `platform.showError` 弹出 OS 原生对话框。

---

## 2.3 样式冲突与 HSL/Oklch 色彩失效修复

由于新版 `shadcn-vue` 会自动更新 [styles.css](file:///Users/aohan/aohan_dev_self_project/Schedule/src/styles.css) 并在底部注册 `oklch(...)` 变量，而原有 TailwindCSS v4 在 `@theme` 中默认包含了 `hsl(...)` 包装，这会导致浏览器解析出非法的 `hsl(oklch(...))` 而发生色彩坍塌。

**修复方案**：
必须在 `styles.css` 的 `@theme inline` 声明块中，将颜色映射从包含 `hsl` 包装修改为**直接变量映射**：
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}
```

同时，为防止暗黑模式下原 Vanilla CSS 中的文字与背景色彩对比度过低，确保在 `.dark` 控制器中对 `--text` 变量追加重置：
```css
.dark {
  --text: oklch(0.985 0 0); /* 对应明亮模式下的 #1d1d1f */
}
```

---

## 2.4 无障碍 (A11y) 语义化增强要求
在子组件的 Dialog 模板中，**必须**配齐以下 A11y 标签元素以防控制台抛错并确保读屏软件正常识别：
1.  **DialogHeader 内必须包含标题与描述**：
    ```html
    <DialogHeader>
      <DialogTitle>{{ isEditing ? '编辑日程' : '新增日程' }}</DialogTitle>
      <DialogDescription class="sr-only">
        请在下方输入表单内容以保存您的日程安排。
      </DialogDescription>
    </DialogHeader>
    ```
    （注：`sr-only` 样式由 Tailwind 提供，仅供屏幕阅读器朗读，不影响视觉呈现）。
2.  **Checkbox 无障碍联动**：
    在 Checkbox 组件上显式指定 `id="formImportant"`，并配合 `<Label for="formImportant">` 以支持点击焦点联动与朗读关联。

---

## 2.5 容器页面 (Container) 重构逻辑

#### 2.5.1 `SchedulesView.vue` 重构
1.  **模板清理**：
    删除 `<dialog ref="scheduleDialogRef">` 及其子节点，替换引入（因为视图会自动响应式侦听 Store 更新，父组件无需手动重新 load，故移除 `@saved` 事件）：
    ```html
    <ScheduleFormDialog ref="scheduleFormDialogRef" />
    ```
2.  **逻辑清理**：
    *   清理 `scheduleDialogRef` 变量、原生的 `closeDialog` 方法。
    *   清理 `form`、`isEditing`、`editingId`、`newSubtaskTitle` 等表单专属状态。
    *   清理 `addSubtask`、`removeSubtask`、`saveSchedule` 方法。
    *   重构 `openAddDialog` 和 `openEditDialog`：
        ```typescript
        const scheduleFormDialogRef = ref<InstanceType<typeof ScheduleFormDialog> | null>(null);

        function openAddDialog() {
          scheduleFormDialogRef.value?.open();
        }
        function openEditDialog(schedule: Schedule) {
          scheduleFormDialogRef.value?.open(schedule.id);
        }
        ```

#### 2.5.2 `CategoriesView.vue` 重构
1.  **模板清理**：
    删除 `<dialog ref="categoryDialogRef">` 模板段落，替换引入：
    ```html
    <CategoryFormDialog ref="categoryFormDialogRef" />
    ```
2.  **逻辑清理**：
    *   清理原生的 `closeDialog` 方法、表单变量及 `saveCategory` 方法。
    *   重构 `openAddDialog` 和 `openEditDialog`：
        ```typescript
        const categoryFormDialogRef = ref<InstanceType<typeof CategoryFormDialog> | null>(null);

        function openAddDialog() {
          categoryFormDialogRef.value?.open();
        }
        function openEditDialog(category: Category) {
          categoryFormDialogRef.value?.open(category.id);
        }
        ```

---

## 3. 约束与测试准则
*   **构建无错**：所有修改完成及新文件建立后，执行 `npx vue-tsc --noEmit` 静态类型检查必须为 0 Error。
*   **测试稳健**：全量运行 `npx vitest run --root .`，已有的 15 个用例必须 100% 绿灯。
*   **防止占位符**：禁止在子组件模板与 TS 逻辑中使用任何 `TODO`、`TBD` 等代码块。
