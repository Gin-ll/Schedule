<template>
  <div class="page active">
    <header class="page-header">
      <div>
        <p class="eyebrow">Today board</p>
        <h2>日程</h2>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="primary-icon-btn" @click="openAddDialog" type="button" aria-label="新增日程" title="新增日程">
          <Icon icon="lucide:plus" width="20" height="20" />
        </button>
      </div>
    </header>

    <div class="toolbar">
      <input type="search" v-model="searchQuery" placeholder="搜索日程名称或内容...." class="search-input" style="max-width: none; width: 100%;" />
    </div>

    <!-- 列表视图 -->
    <div class="content-panel active list-layout-with-sidebar">
      <aside class="smart-sidebar">
        <ul class="smart-list-filters">
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'today' }" @click="selectListFilter('today')">
            <Icon icon="lucide:clock" width="16" height="16" />
            今天
            <span class="count-badge">{{ counts.today }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'tomorrow' }" @click="selectListFilter('tomorrow')">
            <Icon icon="lucide:home" width="16" height="16" />
            明天
            <span class="count-badge">{{ counts.tomorrow }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'next7days' }" @click="selectListFilter('next7days')">
            <Icon icon="lucide:zap" width="16" height="16" />
            未来 7 天
            <span class="count-badge">{{ counts.next7days }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'all' }" @click="selectListFilter('all')">
            <Icon icon="lucide:calendar-days" width="16" height="16" />
            全部日程
            <span class="count-badge">{{ counts.all }}</span>
          </li>
          <div class="sidebar-divider"></div>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'overdue' }" @click="selectListFilter('overdue')">
            <Icon icon="lucide:alert-triangle" width="16" height="16" style="color: #ff3b30;" />
            已逾期
            <span class="count-badge" style="background-color: rgba(255, 59, 48, 0.1); color: #ff3b30;">{{ counts.overdue }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'completed' }" @click="selectListFilter('completed')">
            <Icon icon="lucide:check-check" width="16" height="16" style="color: #34c759;" />
            已完成
            <span class="count-badge" style="background-color: rgba(52, 199, 89, 0.1); color: #34c759;">{{ counts.completed }}</span>
          </li>
        </ul>
        <div class="sidebar-divider"></div>
        <ul class="smart-list-filters">
          <li v-for="cat in categories" :key="cat.id" :class="{ active: activeFilterSection === 'category' && categoryFilter === cat.id }" @click="selectCategoryFilter(cat.id)">
            <span class="category-dot" :style="{ backgroundColor: cat.color }"></span>
            {{ cat.name }}
            <span class="count-badge">{{ getCategoryCount(cat.id) }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'category' && categoryFilter === '' }" @click="selectCategoryFilter('')">
            <span class="category-dot" style="background-color: #8E8E93;"></span>
            未分类
            <span class="count-badge">{{ getCategoryCount('') }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'category' && categoryFilter === 'all' }" @click="selectCategoryFilter('all')">
            <span class="category-dot" style="background-color: var(--primary);"></span>
            所有分类
            <span class="count-badge">{{ counts.catAll }}</span>
          </li>
        </ul>
      </aside>
      <div class="schedule-list-container" style="display: flex; flex-direction: column;">
        <div class="schedule-list" v-if="visibleSchedules.length > 0" style="display: flex; flex-direction: column; gap: 0;">
          <!-- 未完成日程区块 -->
          <div v-if="pendingSchedules.length > 0" style="display: flex; flex-direction: column; margin-bottom: 16px;">
            <div class="section-toggle-header" @click="isPendingExpanded = !isPendingExpanded" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; margin-bottom: 12px; transition: color 0.2s;">
              <Icon :icon="isPendingExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" width="16" height="16" />
              <span style="font-size: 13px; font-weight: 600; tracking: 0.05em;">未完成</span>
              <span class="count-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 9999px; background: var(--border); color: var(--text); font-weight: bold; line-height: 1;">{{ pendingSchedules.length }}</span>
              <div class="divider-line" style="flex-grow: 1; border-top: 1px dashed var(--border); margin-left: 8px; opacity: 0.6; transition: opacity 0.2s;"></div>
            </div>
            
            <div v-show="isPendingExpanded" style="display: flex; flex-direction: column; gap: 12px;">
              <article v-for="schedule in pendingSchedules" :key="schedule.id" class="schedule-card">
                <div class="schedule-title-row" style="align-items: center; gap: 10px;">
                  <input type="checkbox" :checked="schedule.status === 'completed'" @change="toggleScheduleStatus(schedule)" style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0; margin: 0;" />
                  <h3 :style="{ textDecoration: schedule.status === 'completed' ? 'line-through' : 'none' }" style="flex: 1; word-break: break-all;">
                    {{ schedule.title }}
                  </h3>
                  <div class="card-actions" style="display: flex; gap: 4px;">
                    <button class="action-icon-btn" type="button" @click="openEditDialog(schedule)" aria-label="编辑" title="编辑">
                      <Icon icon="lucide:edit-3" width="16" height="16" />
                    </button>
                    <button class="action-icon-btn danger" type="button" @click="deleteSchedule(schedule.id)" aria-label="删除" title="删除">
                      <Icon icon="lucide:trash-2" width="16" height="16" />
                    </button>
                  </div>
                </div>
                <p class="schedule-content" v-if="schedule.content">{{ schedule.content }}</p>
                
                <!-- 子任务展开展示 -->
                <details v-if="schedule.subtasks && schedule.subtasks.length > 0" class="subtasks-details">
                  <summary class="subtasks-summary">
                    <span style="display:inline-block; margin-left: 4px;">子任务 ({{ getCompletedSubtaskCount(schedule) }}/{{ schedule.subtasks.length }})</span>
                  </summary>
                  <div class="card-subtasks">
                    <label v-for="st in schedule.subtasks" :key="st.id" class="card-subtask-item" :class="{ completed: st.completed }">
                      <input type="checkbox" :checked="st.completed" @change="toggleSubtask(schedule, st.id)" />
                      <span>{{ st.title }}</span>
                    </label>
                  </div>
                </details>

                <div class="schedule-meta" style="margin-top: 10px;">
                  <span class="tag">{{ formatInterval(schedule.startTime, schedule.endTime, schedule.recurrence) }}</span>
                  <span class="tag" :style="getCategoryStyle(schedule.categoryId)">
                    {{ getCategoryName(schedule.categoryId) }}
                  </span>
                  <span class="tag" :class="getStatusClass(schedule)">{{ getStatusLabel(schedule) }}</span>
                  <span class="tag important" v-if="schedule.important">重点</span>
                </div>
              </article>
            </div>
          </div>

          <!-- 已完成日程区块 -->
          <div v-if="completedSchedules.length > 0" style="display: flex; flex-direction: column; margin-top: 8px;">
            <div class="section-toggle-header" @click="isCompletedExpanded = !isCompletedExpanded" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; margin-bottom: 12px; transition: color 0.2s;">
              <Icon :icon="isCompletedExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" width="16" height="16" />
              <span style="font-size: 13px; font-weight: 600; tracking: 0.05em;">已完成</span>
              <span class="count-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 9999px; background: var(--border); color: var(--text); font-weight: bold; line-height: 1;">{{ completedSchedules.length }}</span>
              <div class="divider-line" style="flex-grow: 1; border-top: 1px dashed var(--border); margin-left: 8px; opacity: 0.6; transition: opacity 0.2s;"></div>
            </div>
            
            <div v-show="isCompletedExpanded" style="display: flex; flex-direction: column; gap: 12px;">
              <article v-for="schedule in completedSchedules" :key="schedule.id" class="schedule-card" style="opacity: 0.8;">
                <div class="schedule-title-row" style="align-items: center; gap: 10px;">
                  <input type="checkbox" :checked="schedule.status === 'completed'" @change="toggleScheduleStatus(schedule)" style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0; margin: 0;" />
                  <h3 :style="{ textDecoration: schedule.status === 'completed' ? 'line-through' : 'none' }" style="flex: 1; word-break: break-all;">
                    {{ schedule.title }}
                  </h3>
                  <div class="card-actions" style="display: flex; gap: 4px;">
                    <button class="action-icon-btn" type="button" @click="openEditDialog(schedule)" aria-label="编辑" title="编辑">
                      <Icon icon="lucide:edit-3" width="16" height="16" />
                    </button>
                    <button class="action-icon-btn danger" type="button" @click="deleteSchedule(schedule.id)" aria-label="删除" title="删除">
                      <Icon icon="lucide:trash-2" width="16" height="16" />
                    </button>
                  </div>
                </div>
                <p class="schedule-content" v-if="schedule.content">{{ schedule.content }}</p>
                
                <!-- 子任务展开展示 -->
                <details v-if="schedule.subtasks && schedule.subtasks.length > 0" class="subtasks-details">
                  <summary class="subtasks-summary">
                    <span style="display:inline-block; margin-left: 4px;">子任务 ({{ getCompletedSubtaskCount(schedule) }}/{{ schedule.subtasks.length }})</span>
                  </summary>
                  <div class="card-subtasks">
                    <label v-for="st in schedule.subtasks" :key="st.id" class="card-subtask-item" :class="{ completed: st.completed }">
                      <input type="checkbox" :checked="st.completed" @change="toggleSubtask(schedule, st.id)" />
                      <span>{{ st.title }}</span>
                    </label>
                  </div>
                </details>

                <div class="schedule-meta" style="margin-top: 10px;">
                  <span class="tag">{{ formatInterval(schedule.startTime, schedule.endTime, schedule.recurrence) }}</span>
                  <span class="tag" :style="getCategoryStyle(schedule.categoryId)">
                    {{ getCategoryName(schedule.categoryId) }}
                  </span>
                  <span class="tag" :class="getStatusClass(schedule)">{{ getStatusLabel(schedule) }}</span>
                  <span class="tag important" v-if="schedule.important">重点</span>
                </div>
              </article>
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="flex: 1;">
          <Icon icon="lucide:calendar-x" class="empty-icon" />
          <span>暂无日程</span>
        </div>
      </div>
    </div>

    <!-- 表单 Dialog -->
    <ScheduleFormDialog ref="scheduleFormDialogRef" :categories="categories" />

    <!-- 自定义删除确认弹窗 -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">删除确认</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            确认要彻底删除此日程吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showDeleteConfirm = false">取消</Button>
          <Button variant="destructive" @click="executeDeleteSchedule">删除</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Schedule, Category } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import ScheduleFormDialog from '../components/ScheduleFormDialog.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default defineComponent({
  name: 'SchedulesView',
  components: {
    Icon,
    ScheduleFormDialog,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Button
  },
  setup() {
    const store = useScheduleStore();

    // 基础视图状态
    const searchQuery = ref('');
    const listFilter = ref<'today' | 'tomorrow' | 'next7days' | 'completed' | 'overdue' | 'all'>('today');
    const categoryFilter = ref<string>('all');
    const activeFilterSection = ref<'time' | 'category'>('time');

    // 删除弹窗状态
    const showDeleteConfirm = ref(false);
    const scheduleIdToDelete = ref('');

    // 表单子组件 Ref
    const scheduleFormDialogRef = ref<InstanceType<typeof ScheduleFormDialog> | null>(null);

    const categories = computed(() => store.categories);

    // 互斥的过滤操作函数
    const selectListFilter = (filter: 'today' | 'tomorrow' | 'next7days' | 'completed' | 'overdue' | 'all') => {
      listFilter.value = filter;
      categoryFilter.value = 'all';
      activeFilterSection.value = 'time';
    };

    const selectCategoryFilter = (catId: string) => {
      categoryFilter.value = catId;
      listFilter.value = 'all';
      activeFilterSection.value = 'category';
    };

    // 辅助格式化
    function toDateKey(date: Date): string {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function formatDateTime(value: string | Date): string {
      const date = new Date(value);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function formatInterval(startTime: string, endTime?: string, recurrence?: string): string {
      const start = formatDateTime(startTime);
      let res = start;
      if (endTime && endTime !== startTime) {
        const end = formatDateTime(endTime);
        res = `${start} 至 ${end}`;
      }
      if (recurrence && recurrence !== 'none') {
        const recMap: Record<string, string> = { daily: "每天", weekly: "每周", monthly: "每月" };
        res += ` (${recMap[recurrence] || recurrence})`;
      }
      return res;
    }

    // 列表的日程分类计数与时间段计数
    const counts = computed(() => {
      const now = new Date();
      const todayK = toDateKey(now);
      
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowK = toDateKey(tomorrow);

      const next7DaysEnd = new Date(now);
      next7DaysEnd.setDate(now.getDate() + 7);
      const endK = toDateKey(next7DaysEnd);

      let todayCount = 0;
      let tomorrowCount = 0;
      let next7Count = 0;
      let completedCount = 0;
      let overdueCount = 0;

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

      store.schedules.forEach(schedule => {
        const startK = toDateKey(new Date(schedule.startTime));
        const end = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
        const scheduleEndK = toDateKey(end);
        
        if (startK <= todayK && scheduleEndK >= todayK) {
          todayCount++;
        }
        if (startK <= tomorrowK && scheduleEndK >= tomorrowK) {
          tomorrowCount++;
        }
        if (startK <= endK && scheduleEndK >= todayK) {
          next7Count++;
        }
        if (schedule.status === 'completed') {
          completedCount++;
        } else {
          if (end < startOfToday) {
            overdueCount++;
          }
        }
      });

      return {
        today: todayCount,
        tomorrow: tomorrowCount,
        next7days: next7Count,
        completed: completedCount,
        overdue: overdueCount,
        all: store.schedules.length,
        catAll: store.schedules.length
      };
    });

    function getCategoryCount(catId: string): number {
      return store.schedules.filter(s => (s.categoryId || '') === catId).length;
    }

    // 分类样式和属性获取
    function getCategoryName(catId: string): string {
      const cat = store.categories.find(c => c.id === catId);
      return cat ? cat.name : '未分类';
    }

    function getCategoryColor(catId: string): string {
      const cat = store.categories.find(c => c.id === catId);
      return cat ? cat.color : '';
    }

    function getCategoryStyle(catId: string) {
      const color = getCategoryColor(catId);
      return color ? { backgroundColor: color, color: '#fff' } : {};
    }

    // 日程状态文案与样式
    function getStatusLabel(schedule: Schedule): string {
      if (schedule.status === "completed") return "已完成";
      const endTime = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
      const startTime = new Date(schedule.startTime);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const now = new Date();
      if (endTime < startOfToday) return "已逾期";
      if (schedule.status === "pending" && startTime <= now) return "进行中";
      if (schedule.status === "in-progress") return "进行中";
      if (schedule.status === "delayed") return "已逾期";
      return "未开始";
    }

    function getStatusClass(schedule: Schedule): string {
      if (schedule.status === "completed") return "done";
      const endTime = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
      const startTime = new Date(schedule.startTime);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const now = new Date();
      if (endTime < startOfToday) return "overdue";
      if (schedule.status === "pending" && startTime <= now) return "in-progress";
      return schedule.status; // pending, in-progress, delayed
    }

    // 过滤后的日程列表（列表视图）
    const visibleSchedules = computed(() => {
      let filtered = store.schedules;

      // 1. 时间段过滤
      const now = new Date();
      const todayK = toDateKey(now);
      
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowK = toDateKey(tomorrow);

      const next7DaysEnd = new Date(now);
      next7DaysEnd.setDate(now.getDate() + 7);
      const endK = toDateKey(next7DaysEnd);

      if (listFilter.value === 'today') {
        filtered = filtered.filter(s => {
          const startK = toDateKey(new Date(s.startTime));
          const end = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
          const scheduleEndK = toDateKey(end);
          return startK <= todayK && scheduleEndK >= todayK;
        });
      } else if (listFilter.value === 'tomorrow') {
        filtered = filtered.filter(s => {
          const startK = toDateKey(new Date(s.startTime));
          const end = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
          const scheduleEndK = toDateKey(end);
          return startK <= tomorrowK && scheduleEndK >= tomorrowK;
        });
      } else if (listFilter.value === 'next7days') {
        filtered = filtered.filter(s => {
          const startK = toDateKey(new Date(s.startTime));
          const end = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
          const scheduleEndK = toDateKey(end);
          return startK <= endK && scheduleEndK >= todayK;
        });
      } else if (listFilter.value === 'completed') {
        filtered = filtered.filter(s => s.status === 'completed');
      } else if (listFilter.value === 'overdue') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        filtered = filtered.filter(s => {
          const end = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
          return end < startOfToday && s.status !== 'completed';
        });
      }

      // 2. 分类过滤
      if (categoryFilter.value !== 'all') {
        filtered = filtered.filter(s => (s.categoryId || '') === categoryFilter.value);
      }

      // 3. 搜索过滤
      const q = searchQuery.value.trim().toLowerCase();
      if (q) {
        filtered = filtered.filter(s => 
          s.title.toLowerCase().includes(q) || 
          s.content.toLowerCase().includes(q)
        );
      }

      return [...filtered].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    const isPendingExpanded = ref(true);
    const isCompletedExpanded = ref(true);

    const pendingSchedules = computed(() => {
      const list = visibleSchedules.value.filter(s => s.status !== 'completed');
      return [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    const completedSchedules = computed(() => {
      const list = visibleSchedules.value.filter(s => s.status === 'completed');
      return [...list].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    // 快捷状态切换
    async function toggleScheduleStatus(schedule: Schedule) {
      const nextStatus = schedule.status === 'completed' ? 'pending' : 'completed';
      const updatedSubtasks = schedule.subtasks 
        ? schedule.subtasks.map(st => ({ ...st, completed: nextStatus === 'completed' }))
        : [];
      
      await store.updateSchedule(schedule.id, { 
        status: nextStatus,
        subtasks: updatedSubtasks
      });
    }

    // 子任务快捷修改
    async function toggleSubtask(schedule: Schedule, subtaskId: string) {
      if (!schedule.subtasks) return;
      
      const updatedSubtasks = schedule.subtasks.map(st => {
        if (st.id === subtaskId) {
          return { ...st, completed: !st.completed };
        }
        return st;
      });

      const allCompleted = updatedSubtasks.every(st => st.completed);
      const nextStatus = (allCompleted && updatedSubtasks.length > 0) ? 'completed' : schedule.status;

      await store.updateSchedule(schedule.id, {
        subtasks: updatedSubtasks,
        status: nextStatus
      });
    }

    function getCompletedSubtaskCount(schedule: Schedule): number {
      if (!schedule.subtasks) return 0;
      return schedule.subtasks.filter(st => st.completed).length;
    }

    // Dialog 操作
    function openAddDialog() {
      scheduleFormDialogRef.value?.open();
    }

    function openEditDialog(schedule: Schedule) {
      scheduleFormDialogRef.value?.open(schedule.id);
    }

    function deleteSchedule(id: string) {
      scheduleIdToDelete.value = id;
      showDeleteConfirm.value = true;
    }

    async function executeDeleteSchedule() {
      if (scheduleIdToDelete.value) {
        try {
          await store.deleteSchedule(scheduleIdToDelete.value);
        } catch (error: any) {
          console.error("Failed to delete schedule:", error);
          await platform.showError("删除日程失败", error.message || String(error));
        } finally {
          showDeleteConfirm.value = false;
          scheduleIdToDelete.value = '';
        }
      }
    }

    return {
      searchQuery,
      listFilter,
      categoryFilter,
      activeFilterSection,
      categories,
      counts,
      getCategoryCount,
      visibleSchedules,
      pendingSchedules,
      completedSchedules,
      isPendingExpanded,
      isCompletedExpanded,
      getCategoryName,
      getCategoryColor,
      getCategoryStyle,
      getStatusLabel,
      getStatusClass,
      formatInterval,
      selectListFilter,
      selectCategoryFilter,

      // 快捷操作
      toggleScheduleStatus,
      toggleSubtask,
      getCompletedSubtaskCount,

      // Dialog
      scheduleFormDialogRef,
      showDeleteConfirm,
      openAddDialog,
      openEditDialog,
      deleteSchedule,
      executeDeleteSchedule,
    };
  }
});
</script>

<style scoped>
.section-toggle-header {
  color: var(--muted-foreground);
}
.section-toggle-header:hover {
  color: var(--text) !important;
}
.section-toggle-header:hover .divider-line {
  opacity: 0.95 !important;
}
</style>
