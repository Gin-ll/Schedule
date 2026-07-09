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

    <div class="category-list" v-if="categories.length > 0">
      <article v-for="category in categories" :key="category.id" class="category-card" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; margin: 0 0 6px 0;">
            <span class="color-dot" :style="{ backgroundColor: category.color, width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block' }"></span>
            {{ category.name }}
          </h3>
          <p style="margin: 0; color: var(--muted-foreground); font-size: 13px;">{{ category.note || "无备注" }}</p>
          
          <div class="category-stats" style="display: flex; gap: 16px; margin-top: 10px;">
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" style="font-weight: 700; font-size: 14px;">{{ getStats(category.id).total }}</span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted-foreground);">总数</span>
            </div>
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" style="font-weight: 700; font-size: 14px;">{{ getStats(category.id).completed }}</span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted-foreground);">已完成</span>
            </div>
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" :class="{ danger: getStats(category.id).overdue > 0 }" style="font-weight: 700; font-size: 14px;">
                {{ getStats(category.id).overdue }}
              </span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted-foreground);">逾期</span>
            </div>
            <div class="stat-item" style="display: flex; flex-direction: column;">
              <span class="stat-value" style="font-weight: 700; font-size: 14px;">{{ getStats(category.id).rate }}%</span>
              <span class="stat-label" style="font-size: 11px; color: var(--muted-foreground);">完成率</span>
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
    </div>
    <div v-else class="empty-state" style="flex: 1;">
      <Icon icon="lucide:folder-open" class="empty-icon" />
      <span>暂无分类</span>
    </div>

    <!-- 表单 Dialog -->
    <CategoryFormDialog ref="categoryFormDialogRef" />

    <!-- 自定义删除确认弹窗 -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">删除确认</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            确认要删除分类吗？属于该分类的日程将变为未分类状态。此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showDeleteConfirm = false">取消</Button>
          <Button variant="destructive" @click="executeDeleteCategory">删除</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Category } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import CategoryFormDialog from '../components/CategoryFormDialog.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default defineComponent({
  name: 'CategoriesView',
  components: {
    Icon,
    CategoryFormDialog,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Button
  },
  setup() {
    const store = useScheduleStore();
    const categoryFormDialogRef = ref<InstanceType<typeof CategoryFormDialog> | null>(null);

    // 删除弹窗状态
    const showDeleteConfirm = ref(false);
    const categoryIdToDelete = ref('');

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

    function deleteCategory(id: string) {
      categoryIdToDelete.value = id;
      showDeleteConfirm.value = true;
    }

    async function executeDeleteCategory() {
      if (categoryIdToDelete.value) {
        try {
          await store.deleteCategory(categoryIdToDelete.value);
        } catch (error: any) {
          console.error("Failed to delete category:", error);
          await platform.showError("删除分类失败", error.message || String(error));
        } finally {
          showDeleteConfirm.value = false;
          categoryIdToDelete.value = '';
        }
      }
    }

    return {
      categories,
      getStats,
      categoryFormDialogRef,
      openAddDialog,
      openEditDialog,
      deleteCategory,
      executeDeleteCategory,
      showDeleteConfirm
    };
  }
});
</script>
