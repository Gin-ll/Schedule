<template>
  <div class="page active">
    <!-- 大类 Tab + 清空 -->
    <div class="trash-tabs">
      <div class="tabs-container">
        <button class="tab-btn" :class="{ active: currentTab === 'schedule' }" @click="switchTab('schedule')" type="button">
          <Icon icon="lucide:list-todo" width="15" height="15" />
          <span>日程 ({{ store.trash.length }})</span>
        </button>
        <button class="tab-btn" :class="{ active: currentTab === 'category' }" @click="switchTab('category')" type="button">
          <Icon icon="lucide:folder" width="15" height="15" />
          <span>分类 ({{ store.categoryTrash.length }})</span>
        </button>
      </div>
      <button
        v-if="currentTab === 'schedule' ? store.trash.length > 0 : store.categoryTrash.length > 0"
        class="plain-button header-add-btn"
        type="button"
        aria-label="清空回收站"
        title="清空当前回收站"
        @click="confirmEmpty"
      >
        <Icon icon="lucide:trash" width="15" height="15" />
        清空
      </button>
    </div>

    <!-- 日程回收站 -->
    <template v-if="currentTab === 'schedule'">
      <div class="trash-filter-bar">
        <input type="search" v-model="searchQuery" placeholder="搜索标题或内容..." class="search-input" style="max-width: none; width: 100%;" />
        <NativeSelect v-model="categoryFilter" class="w-[150px] shrink-0">
          <option value="all">全部分类</option>
          <option value="">未分类</option>
          <option v-for="cat in visibleCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </NativeSelect>
        <div class="range-tabs shrink-0">
          <button v-for="t in timeFilterOptions" :key="t.value" class="range-tab-btn" :class="{ active: timeFilter === t.value }" @click="timeFilter = t.value" type="button">
            {{ t.label }}
          </button>
        </div>
      </div>

      <div v-if="groupedTrash.length > 0" class="trash-list">
        <template v-for="g in groupedTrash" :key="g.key">
          <!-- 日期时间轴节点 -->
          <div class="trash-date-divider">
            <span class="trash-date-line"></span>
            <span class="trash-date-label">
              <Icon icon="lucide:calendar-days" width="13" height="13" />
              {{ g.label }}
            </span>
            <span class="trash-date-line"></span>
          </div>
          <article v-for="item in g.items" :key="item.id" class="trash-item">
          <div class="trash-item-main">
            <div class="trash-item-title-row">
              <span
                v-if="visibleCategoryOf(item)"
                class="color-dot"
                :style="{ backgroundColor: visibleCategoryOf(item)!.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }"
              ></span>
              <h3 class="trash-item-title">{{ item.title }}</h3>
              <span
                v-if="item.status === 'completed'"
                class="trash-item-badge"
                style="color: var(--muted-foreground);"
              >已完成</span>
            </div>
            <p class="trash-item-meta">
              删除于 {{ formatDateTime(item.updatedAt) }}
              <template v-if="visibleCategoryOf(item)"> · {{ visibleCategoryOf(item)!.name }}</template>
              <template v-else> · 未分类</template>
              <template v-if="item.recurrence && item.recurrence !== 'none'"> · {{ recurrenceLabel(item.recurrence) }}</template>
            </p>
            <p v-if="item.content" class="trash-item-content">{{ item.content }}</p>
          </div>
          <div class="card-actions" style="display: flex; gap: 4px; flex-shrink: 0;">
            <button class="action-icon-btn" type="button" aria-label="恢复" title="恢复" @click="confirmRestore(item)">
              <Icon icon="lucide:rotate-ccw" width="16" height="16" />
            </button>
            <button class="action-icon-btn danger" type="button" aria-label="永久删除" title="永久删除" @click="confirmPurgeSchedule(item)">
              <Icon icon="lucide:trash-2" width="16" height="16" />
            </button>
          </div>
        </article>
        </template>
      </div>
      <div v-else class="empty-state" style="flex: 1;">
        <Icon :icon="store.trash.length > 0 ? 'lucide:search-x' : 'lucide:trash-2'" class="empty-icon" />
        <span>{{ store.trash.length > 0 ? '没有符合查询条件的日程' : '回收站暂无日程' }}</span>
      </div>
    </template>

    <!-- 分类回收站 -->
    <template v-else>
      <div v-if="groupedCategoryTrash.length > 0" class="trash-list">
        <template v-for="g in groupedCategoryTrash" :key="g.key">
          <!-- 日期时间轴节点 -->
          <div class="trash-date-divider">
            <span class="trash-date-line"></span>
            <span class="trash-date-label">
              <Icon icon="lucide:folder" width="13" height="13" />
              {{ g.label }}
            </span>
            <span class="trash-date-line"></span>
          </div>
          <article v-for="c in g.items" :key="c.id" class="trash-item">
          <div class="trash-item-main">
            <div class="trash-item-title-row">
              <span class="color-dot" :style="{ backgroundColor: c.color, width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }"></span>
              <h3 class="trash-item-title">{{ c.name }}</h3>
            </div>
            <p class="trash-item-meta">删除于 {{ formatDateTime(c.updatedAt || '') }}</p>
            <p v-if="c.note" class="trash-item-content">{{ c.note }}</p>
          </div>
          <div class="card-actions" style="display: flex; gap: 4px; flex-shrink: 0;">
            <button class="action-icon-btn" type="button" aria-label="恢复分类" title="恢复分类" @click="confirmRestoreCategory(c)">
              <Icon icon="lucide:rotate-ccw" width="16" height="16" />
            </button>
            <button class="action-icon-btn danger" type="button" aria-label="永久删除分类" title="永久删除" @click="confirmPurgeCategory(c)">
              <Icon icon="lucide:trash-2" width="16" height="16" />
            </button>
          </div>
        </article>
        </template>
      </div>
      <div v-else class="empty-state" style="flex: 1;">
        <Icon icon="lucide:folder-open" class="empty-icon" />
        <span>回收站暂无分类</span>
      </div>
    </template>

    <!-- 恢复确认（日程） -->
    <Dialog v-model:open="showRestoreConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">恢复确认</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            即将恢复「{{ pendingRestoreTitle }}」到日程列表，确定恢复吗？
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showRestoreConfirm = false">取消</Button>
          <Button @click="executeRestore">恢复</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 恢复确认（分类） -->
    <Dialog v-model:open="showRestoreCategoryConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">恢复分类</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            即将恢复分类「{{ pendingRestoreTitle }}」，恢复后可在添加与筛选中继续使用，确定恢复吗？
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showRestoreCategoryConfirm = false">取消</Button>
          <Button @click="executeRestoreCategory">恢复</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 永久删除确认 -->
    <Dialog v-model:open="showPurgeConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">永久删除确认</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            即将永久删除「{{ pendingPurgeTitle }}」，此操作无法撤销。确定继续吗？
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showPurgeConfirm = false">取消</Button>
          <Button variant="destructive" @click="executePurge">永久删除</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 清空回收站确认 -->
    <Dialog v-model:open="showEmptyConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">清空回收站</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            将永久删除{{ currentTab === 'schedule' ? '回收站中的 ' + store.trash.length + ' 条日程' : '回收站中的 ' + store.categoryTrash.length + ' 个分类' }}，此操作无法撤销。确定继续吗？
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showEmptyConfirm = false">取消</Button>
          <Button variant="destructive" @click="executeEmpty">清空</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Schedule, Category } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default defineComponent({
  name: 'TrashView',
  components: {
    Icon,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Button,
    NativeSelect
  },
  setup() {
    const store = useScheduleStore();
    const currentTab = ref<'schedule' | 'category'>('schedule');

    // 恢复确认状态
    const showRestoreConfirm = ref(false);
    const showRestoreCategoryConfirm = ref(false);
    const pendingRestoreId = ref('');
    const pendingRestoreTitle = ref('');
    const pendingRestoreIsCategory = ref(false);

    const showPurgeConfirm = ref(false);
    const pendingPurgeId = ref('');
    const pendingPurgeTitle = ref('');
    const showEmptyConfirm = ref(false);

    // 查询条件状态
    const searchQuery = ref('');
    const categoryFilter = ref<'all' | string>('all');
    const timeFilter = ref<'all' | 'today' | 'this_week' | 'this_month'>('all');

    const timeFilterOptions = [
      { label: '全部', value: 'all' as const },
      { label: '今天', value: 'today' as const },
      { label: '本周', value: 'this_week' as const },
      { label: '本月', value: 'this_month' as const }
    ];

    const visibleCategories = computed(() => store.categories.filter(c => !c.hidden));
    const trash = computed(() => store.trash);

    function visibleCategoryOf(item: Schedule) {
      // 含回收站分类：已删除分类仍被日程引用，需正常显示名称/颜色
      return store.allCategories.find(c => c.id === item.categoryId);
    }

    // 按删除时间（updatedAt）判断是否落在时间范围内
    function inTimeRange(iso: string, range: string): boolean {
      if (range === 'all') return true;
      const d = new Date(iso);
      const now = new Date();
      if (range === 'today') {
        return d.getFullYear() === now.getFullYear()
          && d.getMonth() === now.getMonth()
          && d.getDate() === now.getDate();
      }
      if (range === 'this_week') {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        return d >= monday && d < new Date(monday.getTime() + 7 * 86400000);
      }
      if (range === 'this_month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      return true;
    }

    const filteredTrash = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      return trash.value
        .filter(item => {
          if (q
            && !item.title.toLowerCase().includes(q)
            && !(item.content || '').toLowerCase().includes(q)) {
            return false;
          }
          if (categoryFilter.value !== 'all' && item.categoryId !== categoryFilter.value) return false;
          if (!inTimeRange(item.updatedAt, timeFilter.value)) return false;
          return true;
        })
        // 按删除时间倒序：日期近的排上面
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    });

    // 日期时间轴：把日程按删除日期分组（近→远），组内按删除时间倒序
    function dateKey(iso: string): string {
      return iso ? iso.slice(0, 10) : 'unknown';
    }

    function dateLabel(iso: string): string {
      if (!iso) return '未知日期';
      const d = new Date(iso);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const same = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
      if (same(d, today)) return '今天';
      if (same(d, yesterday)) return '昨天';
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    }

    const groupedTrash = computed(() => {
      const groups: { key: string; label: string; items: Schedule[] }[] = [];
      for (const item of filteredTrash.value) {
        const key = dateKey(item.updatedAt);
        const last = groups[groups.length - 1];
        if (last && last.key === key) {
          last.items.push(item);
        } else {
          groups.push({ key, label: dateLabel(item.updatedAt), items: [item] });
        }
      }
      return groups;
    });

    // 分类回收站同样按删除时间倒序并分组
    const sortedCategoryTrash = computed(() =>
      store.categoryTrash
        .slice()
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    );

    const groupedCategoryTrash = computed(() => {
      const groups: { key: string; label: string; items: Category[] }[] = [];
      for (const c of sortedCategoryTrash.value) {
        const key = dateKey(c.updatedAt);
        const last = groups[groups.length - 1];
        if (last && last.key === key) {
          last.items.push(c);
        } else {
          groups.push({ key, label: dateLabel(c.updatedAt), items: [c] });
        }
      }
      return groups;
    });

    function formatDateTime(iso: string): string {
      if (!iso) return '';
      const d = new Date(iso);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function recurrenceLabel(type: string): string {
      switch (type) {
        case 'daily': return '每天';
        case 'weekly': return '每周';
        case 'monthly': return '每月';
        default: return type;
      }
    }

    function switchTab(tab: 'schedule' | 'category') {
      currentTab.value = tab;
    }

    // ---- 恢复 ----
    function confirmRestore(item: Schedule) {
      pendingRestoreId.value = item.id;
      pendingRestoreTitle.value = item.title;
      pendingRestoreIsCategory.value = false;
      showRestoreConfirm.value = true;
    }

    function confirmRestoreCategory(c: Category) {
      pendingRestoreId.value = c.id;
      pendingRestoreTitle.value = c.name;
      pendingRestoreIsCategory.value = true;
      showRestoreCategoryConfirm.value = true;
    }

    async function executeRestore() {
      if (!pendingRestoreId.value) return;
      try {
        if (pendingRestoreIsCategory.value) {
          await store.restoreCategory(pendingRestoreId.value);
        } else {
          await store.restoreSchedule(pendingRestoreId.value);
        }
      } catch (error: any) {
        console.error("Failed to restore:", error);
        await platform.showError("恢复失败", error.message || String(error));
      } finally {
        showRestoreConfirm.value = false;
        showRestoreCategoryConfirm.value = false;
        pendingRestoreId.value = '';
        pendingRestoreTitle.value = '';
      }
    }

    async function executeRestoreCategory() {
      await executeRestore();
    }

    // ---- 永久删除 ----
    function confirmPurgeSchedule(item: Schedule) {
      pendingPurgeId.value = item.id;
      pendingPurgeTitle.value = item.title;
      showPurgeConfirm.value = true;
    }

    function confirmPurgeCategory(c: Category) {
      pendingPurgeId.value = c.id;
      pendingPurgeTitle.value = c.name;
      showPurgeConfirm.value = true;
    }

    async function executePurge() {
      if (!pendingPurgeId.value) return;
      try {
        if (currentTab.value === 'category') {
          await store.purgeCategory(pendingPurgeId.value);
        } else {
          await store.purgeSchedule(pendingPurgeId.value);
        }
      } catch (error: any) {
        console.error("Failed to purge:", error);
        await platform.showError("永久删除失败", error.message || String(error));
      } finally {
        showPurgeConfirm.value = false;
        pendingPurgeId.value = '';
        pendingPurgeTitle.value = '';
      }
    }

    // ---- 清空 ----
    function confirmEmpty() {
      showEmptyConfirm.value = true;
    }

    async function executeEmpty() {
      try {
        if (currentTab.value === 'category') {
          await store.emptyCategoryTrash();
        } else {
          await store.emptyTrash();
        }
      } catch (error: any) {
        console.error("Failed to empty trash:", error);
        await platform.showError("清空回收站失败", error.message || String(error));
      } finally {
        showEmptyConfirm.value = false;
      }
    }

    onMounted(async () => {
      await Promise.all([store.loadTrash(), store.loadCategoryTrash()]);
    });

    return {
      store,
      currentTab,
      switchTab,
      trash,
      groupedTrash,
      groupedCategoryTrash,
      visibleCategories,
      visibleCategoryOf,
      searchQuery,
      categoryFilter,
      timeFilter,
      timeFilterOptions,
      formatDateTime,
      recurrenceLabel,
      confirmRestore,
      confirmRestoreCategory,
      executeRestore,
      executeRestoreCategory,
      confirmPurgeSchedule,
      confirmPurgeCategory,
      executePurge,
      confirmEmpty,
      executeEmpty,
      showRestoreConfirm,
      showRestoreCategoryConfirm,
      showPurgeConfirm,
      showEmptyConfirm,
      pendingRestoreTitle,
      pendingPurgeTitle
    };
  }
});
</script>

<style scoped>
.trash-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.tabs-container {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.04);
  padding: 3px;
  border-radius: 8px;
}

.dark .tabs-container {
  background: rgba(255, 255, 255, 0.06);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-foreground);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  background: var(--panel-strong);
  color: var(--text);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.trash-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.range-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 3px;
  border-radius: 8px;
}

.dark .range-tabs {
  background: rgba(255, 255, 255, 0.06);
}

.range-tab-btn {
  background: transparent;
  border: none;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-foreground);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.range-tab-btn:hover {
  color: var(--text);
}

.range-tab-btn.active {
  background: var(--panel-strong);
  color: var(--text);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.trash-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 6px 12px 2px;
}

/* 日期时间轴节点 */
.trash-date-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 2px;
}

.trash-date-divider:first-child {
  margin-top: 0;
}

.trash-date-line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.trash-date-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  background: var(--panel-strong);
  padding: 3px 12px;
  border-radius: 999px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.trash-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
}

.trash-item-main {
  min-width: 0;
}

.trash-item-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.trash-item-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trash-item-badge {
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 8px;
  flex-shrink: 0;
}

.trash-item-meta {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 12px;
}

.trash-item-content {
  margin: 6px 0 0 0;
  color: var(--muted-foreground);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
