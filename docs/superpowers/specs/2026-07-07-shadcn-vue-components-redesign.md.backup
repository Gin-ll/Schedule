# Schedule 视图表单组件 Shadcn-vue 重构规格书

本项目已成功配置了 TailwindCSS v4 和 Shadcn-vue 组件库底座。为提升用户界面视觉一致度、交互无障碍体验（A11y）以及优化前端代码架构，我们将全面替换原生的表单输入与对话框。本规格书定义了此次组件重构的模块分流设计及技术指标。

---

## 1. 目标与重构范围

### 1.1 交互组件替换清单
*   **Dialog (对话框)**：替换 `SchedulesView.vue` 和 `CategoriesView.vue` 中原生的 HTML5 `<dialog>` 标签及其 `.showModal()`/`.close()` 动作，改用 Shadcn 的 `Dialog`。
*   **Select (下拉选择)**：替换页面中关于“分类”、“循环规则”、“状态”、“提醒”等原生 `<select>` 标签，改用 Shadcn 的带动画过渡的 `Select` 组件。
*   **Input / Textarea (文本输入)**：替换标题、备注、子任务等原生 `<input>` 和 `<textarea>`，改用具有统一样式的 Shadcn `Input` 及 `Textarea`。
*   **Checkbox (复选框)**：替换重点日程的原生 `<input type="checkbox">`，改用具有无障碍焦点的 Shadcn `Checkbox`。

### 1.2 架构分流瘦身指标
*   将表单逻辑完全内聚至两个高内聚的子组件，从主视图中剥离。
*   主视图 `SchedulesView.vue` 模板大小减少 90+ 行，逻辑代码减少 150+ 行。

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
    // Props
    defineProps<{
      categories: Category[]
    }>();

    // Emits
    const emit = defineEmits<{
      (e: 'saved'): void
    }>();

    // Expose 方法 (供父组件调用打开)
    defineExpose({
      open: (scheduleId?: string) => void
    });
    ```
*   **状态设计**：
    *   `openState: boolean`：绑定到 Shadcn Dialog 的 `v-model:open`。
    *   `isEditing: boolean` 与 `editingId: string | null`：用于区分新增与编辑态。
    *   `form: Ref<FormPayload>`：包括 `title`, `content`, `startTime`, `endTime`, `recurrence`, `categoryId`, `status`, `reminder`, `important`, `subtasks`。
*   **事件处理与异常捕获**：
    *   内置 `addSubtask()` 与 `removeSubtask()` 的日程特有动作。
    *   `saveSchedule()` 方法使用 `try...catch` 进行包装。保存成功后调用内部的 `close()` 重置状态，并触发 `emit('saved')`；保存失败时，调用 `platform.showError` 弹出原生报错窗口。

#### 2.2.2 分类表单组件 (`CategoryFormDialog.vue`)
*   **文件路径**：`src/components/CategoryFormDialog.vue`
*   **组件契约 (API)**:
    ```typescript
    // Emits
    const emit = defineEmits<{
      (e: 'saved'): void
    }>();

    // Expose 方法
    defineExpose({
      open: (categoryId?: string) => void
    });
    ```
*   **状态设计**：
    *   `openState: boolean`：控制 Dialog 显示。
    *   `form: Ref<{ name: string; color: string; note: string }>`。
*   **内置逻辑**：
    *   `saveCategory()` 方法。若保存异常调用 `platform.showError` 提示，保存成功后 `emit('saved')` 并关闭。

---

### 2.3 容器页面 (Container) 重构逻辑

#### 2.3.1 `SchedulesView.vue` 重构
1.  **模板清理**：
    删除 `<dialog ref="scheduleDialogRef">` 及其子节点，替换引入：
    ```html
    <ScheduleFormDialog ref="scheduleFormDialogRef" :categories="categories" @saved="loadAll" />
    ```
2.  **逻辑清理**：
    *   移出 `scheduleDialogRef` 变量。
    *   移出 `form`、`isEditing`、`editingId`、`newSubtaskTitle` 等响应式状态。
    *   移出 `addSubtask`、`removeSubtask`、`saveSchedule` 方法。
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

#### 2.3.2 `CategoriesView.vue` 重构
1.  **模板清理**：
    删除 `<dialog ref="categoryDialogRef">` 段落，替换引入：
    ```html
    <CategoryFormDialog ref="categoryFormDialogRef" @saved="loadAll" />
    ```
2.  **逻辑清理**：
    *   移出表单变量及 `saveCategory` 方法。
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
*   **测试稳健**：全量运行 `npx vitest run --root .`，已有的 15 个用例（包括 Store 读写和 platform 提示）必须 100% 绿灯。
*   **防止占位符**：禁止在子组件模板与 TS 逻辑中使用任何 `TODO`、`TBD` 等代码块。
