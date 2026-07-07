<template>
  <div class="page active">
    <header class="page-header">
      <div>
        <p class="eyebrow">Color labels</p>
        <h2>分类</h2>
      </div>
      <button class="primary-icon-btn" @click="openAddDialog" type="button" aria-label="新增分类" title="新增分类">
        <Icon icon="lucide:plus" width="20" height="20" />
      </button>
    </header>

    <div class="category-list">
      <article v-for="category in categories" :key="category.id" class="category-card" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; margin: 0 0 6px 0;">
            <span class="color-dot" :style="{ backgroundColor: category.color, width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block' }"></span>
            {{ category.name }}
          </h3>
          <p style="margin: 0; color: var(--muted); font-size: 13px;">{{ category.note || "无备注" }}</p>
          
          <div class="category-stats" style="display: flex; gap: 16px; margin-top: 10px;">
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" style="font-weight: 700; font-size: 14px;">{{ getStats(category.id).total }}</span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted);">总数</span>
            </div>
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" style="font-weight: 700; font-size: 14px;">{{ getStats(category.id).completed }}</span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted);">已完成</span>
            </div>
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" :class="{ danger: getStats(category.id).overdue > 0 }" style="font-weight: 700; font-size: 14px;">
                {{ getStats(category.id).overdue }}
              </span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted);">逾期</span>
            </div>
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" style="font-weight: 700; font-size: 14px;">{{ getStats(category.id).rate }}%</span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted);">完成率</span>
            </div>
          </div>
        </div>
        <div class="card-actions" style="display: flex; gap: 4px;">
          <button class="action-icon-btn" type="button" @click="openEditDialog(category)" aria-label="编辑" title="编辑">
            <Icon icon="lucide:edit-3" width="16" height="16" />
          </button>
          <button class="action-icon-btn danger" type="button" @click="deleteCategory(category.id)" aria-label="删除" title="删除">
            <Icon icon="lucide:trash-2" width="16" height="16" />
          </button>
        </div>
      </article>
      <div v-if="categories.length === 0" class="empty-state">暂无分类</div>
    </div>

    <!-- 表单 Dialog -->
    <dialog ref="categoryDialogRef">
      <form method="dialog" class="dialog-form" @submit.prevent="saveCategory" style="padding: 20px; width: 320px;">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700;">{{ isEditing ? '编辑分类' : '新增分类' }}</h3>
          <button class="plain-button" type="button" @click="closeDialog" style="border-radius: 999px;">关闭</button>
        </header>

        <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch; margin-bottom: 12px;">
          名称
          <input v-model="form.name" type="text" required maxlength="20" style="width: 100%;" />
        </label>

        <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch; margin-bottom: 12px;">
          背景颜色
          <input v-model="form.color" type="color" required style="width: 100%; height: 38px; padding: 0; border: none; cursor: pointer;" />
        </label>

        <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch; margin-bottom: 12px;">
          备注
          <input v-model="form.note" type="text" maxlength="100" style="width: 100%;" />
        </label>

        <footer style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 15px;">
          <button class="primary-button" type="submit" style="padding: 6px 20px;">保存</button>
        </footer>
      </form>
    </dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Category } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';

export default defineComponent({
  name: 'CategoriesView',
  components: {
    Icon
  },
  setup() {
    const store = useScheduleStore();
    
    const categoryDialogRef = ref<HTMLDialogElement | null>(null);
    const isEditing = ref(false);
    const editingId = ref<string | null>(null);
    
    const form = ref({
      name: '',
      color: '#007aff',
      note: ''
    });

    const categories = computed(() => store.categories);

    function getStats(catId: string) {
      const catSchedules = store.schedules.filter(s => s.categoryId === catId);
      const total = catSchedules.length;
      const completed = catSchedules.filter(s => s.status === 'completed').length;
      
      const now = new Date();
      const overdue = catSchedules.filter(s => {
        if (s.status === 'completed') return false;
        if (s.status === 'delayed') return true;
        const endTime = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
        return endTime < now;
      }).length;

      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        total,
        completed,
        overdue,
        rate
      };
    }

    function openAddDialog() {
      isEditing.value = false;
      editingId.value = null;
      form.value = {
        name: '',
        color: '#007aff',
        note: ''
      };
      categoryDialogRef.value?.showModal();
    }

    function openEditDialog(category: Category) {
      isEditing.value = true;
      editingId.value = category.id;
      form.value = {
        name: category.name,
        color: category.color,
        note: category.note || ''
      };
      categoryDialogRef.value?.showModal();
    }

    function closeDialog() {
      categoryDialogRef.value?.close();
    }

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

    async function deleteCategory(id: string) {
      if (confirm('确认删除分类？属于该分类的日程将变为未分类状态。')) {
        await store.deleteCategory(id);
      }
    }

    return {
      categories,
      getStats,
      categoryDialogRef,
      isEditing,
      form,
      openAddDialog,
      openEditDialog,
      closeDialog,
      saveCategory,
      deleteCategory
    };
  }
});
</script>
