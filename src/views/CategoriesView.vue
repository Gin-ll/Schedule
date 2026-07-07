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
    <CategoryFormDialog ref="categoryFormDialogRef" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Category } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import CategoryFormDialog from '../components/CategoryFormDialog.vue';

export default defineComponent({
  name: 'CategoriesView',
  components: {
    Icon,
    CategoryFormDialog
  },
  setup() {
    const store = useScheduleStore();
    
    const categoryFormDialogRef = ref<InstanceType<typeof CategoryFormDialog> | null>(null);

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
      categoryFormDialogRef.value?.open();
    }

    function openEditDialog(category: Category) {
      categoryFormDialogRef.value?.open(category.id);
    }

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

    return {
      categories,
      getStats,
      categoryFormDialogRef,
      openAddDialog,
      openEditDialog,
      deleteCategory
    };
  }
});
</script>
