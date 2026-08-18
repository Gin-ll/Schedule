<template>
  <div class="page active">
    <div class="category-list" v-if="categories.length > 0" style="flex: 1; min-height: 0; overflow-y: auto; align-content: flex-start;">
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

    <!-- 底部快速添加分类栏：输入名称回车创建 + 颜色选择 -->
    <div class="category-add-footer">
      <div class="quick-add-row">
        <Icon icon="lucide:circle-plus" class="quick-add-icon" width="18" height="18" />
        <input v-model="newName" class="quick-add-input" placeholder="添加分类，输入名称后回车…" maxlength="20" @keyup.enter="addCategoryQuick" />
        <Popover v-model:open="colorOpen">
          <PopoverTrigger as-child>
            <button class="quick-color-trigger" type="button" title="选择颜色">
              <span class="quick-color-swatch" :style="{ backgroundColor: newColor }"></span>
              <Icon icon="lucide:palette" width="15" height="15" />
            </button>
          </PopoverTrigger>
          <PopoverContent class="w-[220px] p-3 gap-3 flex flex-col" align="end" side="bottom">
            <span class="text-[10px] font-semibold text-muted-foreground/80">预设精美颜色</span>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="c in presetColors"
                :key="c"
                type="button"
                class="w-8 h-8 rounded-full border border-border cursor-pointer transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                :style="{ backgroundColor: c }"
                @click="newColor = c"
              ></button>
            </div>
            <div class="flex items-center justify-between border-t border-border pt-2 gap-2 mt-1">
              <span class="text-[10px] text-muted-foreground">自定义色彩</span>
              <input
                type="color"
                v-model="newColor"
                class="w-8 h-6 p-0 border border-input rounded cursor-pointer"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>

    <!-- 表单 Dialog（编辑用） -->
    <CategoryFormDialog ref="categoryFormDialogRef" />

    <!-- 自定义删除确认弹窗 -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">移入回收站</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            已有日程仍保留该分类，移入后将无法在新增或编辑日程时选择此分类。可在回收站中恢复。
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showDeleteConfirm = false">取消</Button>
          <Button variant="destructive" @click="executeDeleteCategory">移入回收站</Button>
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// 12 种高档柔和预设色板（与 CategoryFormDialog 保持一致）
const presetColors = [
  '#007aff', // 晴空蓝
  '#34c759', // 薄荷绿
  '#ff9500', // 橙黄
  '#ff3b30', // 浆果红
  '#af52de', // 浅熏紫
  '#5856d6', // 靛蓝
  '#ff2d55', // 桃红
  '#4cd964', // 嫩绿
  '#5ac8fa', // 湖蓝
  '#ffcc00', // 金黄
  '#8e8e93', // 石墨灰
  '#1d1d1f'  // 极客黑
];

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
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger
  },
  setup() {
    const store = useScheduleStore();
    const categoryFormDialogRef = ref<InstanceType<typeof CategoryFormDialog> | null>(null);

    // 底部快速添加状态
    const newName = ref('');
    const newColor = ref(presetColors[0]); // 默认蓝色
    const colorOpen = ref(false);

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

    async function addCategoryQuick() {
      const name = newName.value.trim();
      if (!name) return;
      try {
        await store.addCategory({ name, color: newColor.value });
        newName.value = '';
        // 颜色保留，便于连续添加
      } catch (error: any) {
        console.error("Failed to add category:", error);
        await platform.showError("新增分类失败", error.message || String(error));
      }
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
      presetColors,
      newName,
      newColor,
      colorOpen,
      addCategoryQuick,
      getStats,
      categoryFormDialogRef,
      openEditDialog,
      deleteCategory,
      executeDeleteCategory,
      showDeleteConfirm
    };
  }
});
</script>

<style scoped>
.category-add-footer {
  position: relative;
  flex-shrink: 0;
  margin: 0;
  padding: 0 0 2px;
  background: var(--card);
}

.quick-add-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--card);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.quick-add-row:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
}

.quick-add-icon {
  color: var(--muted-foreground);
  flex-shrink: 0;
}

.quick-add-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text);
}

.quick-add-input::placeholder {
  color: var(--muted-foreground);
}

.quick-color-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.quick-color-trigger:hover {
  background: var(--panel-strong);
  color: var(--text);
}

.quick-color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}
</style>
