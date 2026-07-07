<template>
  <div class="page active">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ activeView === 'list' ? 'Today board' : 'Monthly view' }}</p>
        <h2>{{ activeView === 'list' ? '日程' : '日历' }}</h2>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <div class="segmented">
          <button :class="{ active: activeView === 'list' }" @click="activeView = 'list'" type="button">列表</button>
          <button :class="{ active: activeView === 'calendar' }" @click="activeView = 'calendar'" type="button">日历</button>
        </div>
        <button class="primary-icon-btn" @click="openAddDialog" type="button" aria-label="新增日程" title="新增日程">
          <Icon icon="lucide:plus" width="20" height="20" />
        </button>
      </div>
    </header>

    <div class="toolbar" v-if="activeView === 'list'">
      <input type="search" v-model="searchQuery" placeholder="搜索日程名称或内容...." class="search-input" style="max-width: none; width: 100%;" />
    </div>

    <!-- 列表视图 -->
    <div v-if="activeView === 'list'" class="content-panel active list-layout-with-sidebar">
      <aside class="smart-sidebar">
        <ul class="smart-list-filters">
          <li :class="{ active: listFilter === 'today' }" @click="listFilter = 'today'">
            <Icon icon="lucide:clock" width="16" height="16" />
            今天
            <span class="count-badge">{{ counts.today }}</span>
          </li>
          <li :class="{ active: listFilter === 'tomorrow' }" @click="listFilter = 'tomorrow'">
            <Icon icon="lucide:home" width="16" height="16" />
            明天
            <span class="count-badge">{{ counts.tomorrow }}</span>
          </li>
          <li :class="{ active: listFilter === 'next7days' }" @click="listFilter = 'next7days'">
            <Icon icon="lucide:zap" width="16" height="16" />
            未来 7 天
            <span class="count-badge">{{ counts.next7days }}</span>
          </li>
          <li :class="{ active: listFilter === 'all' }" @click="listFilter = 'all'">
            <Icon icon="lucide:calendar-days" width="16" height="16" />
            全部日程
            <span class="count-badge">{{ counts.all }}</span>
          </li>
        </ul>
        <div class="sidebar-divider"></div>
        <ul class="smart-list-filters">
          <li :class="{ active: categoryFilter === 'all' }" @click="categoryFilter = 'all'">
            <span class="category-dot" style="background-color: var(--primary);"></span>
            所有分类
            <span class="count-badge">{{ counts.catAll }}</span>
          </li>
          <li v-for="cat in categories" :key="cat.id" :class="{ active: categoryFilter === cat.id }" @click="categoryFilter = cat.id">
            <span class="category-dot" :style="{ backgroundColor: cat.color }"></span>
            {{ cat.name }}
            <span class="count-badge">{{ getCategoryCount(cat.id) }}</span>
          </li>
        </ul>
      </aside>
      <div class="schedule-list-container">
        <div class="schedule-list">
          <article v-for="schedule in visibleSchedules" :key="schedule.id" class="schedule-card">
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
          <div v-if="visibleSchedules.length === 0" class="empty-state">暂无日程</div>
        </div>
      </div>
    </div>

    <!-- 日历视图 -->
    <div v-if="activeView === 'calendar'" class="content-panel active calendar-layout">
      <section class="calendar-area">
        <div class="calendar-header">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="icon-button" @click="changeMonth(-1)" type="button">&lt;</button>
            <label class="month-picker-label">
              <h3>{{ calendarYear }} 年 {{ calendarMonth + 1 }} 月</h3>
            </label>
            <button class="icon-button" @click="changeMonth(1)" type="button">&gt;</button>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="plain-button" @click="calendarViewMode = calendarViewMode === 'dots' ? 'names' : 'dots'" type="button">
              视图: {{ calendarViewMode === 'dots' ? '圆点' : '标题' }}
            </button>
            <button class="plain-button" @click="goToToday" type="button">今天</button>
          </div>
        </div>
        <div class="week-row">
          <span>一</span>
          <span>二</span>
          <span>三</span>
          <span>四</span>
          <span>五</span>
          <span>六</span>
          <span>日</span>
        </div>
        <div class="calendar-grid">
          <div v-for="cell in calendarCells" :key="cell.dateKey" class="calendar-day" 
               :class="{ muted: !cell.isCurrentMonth, selected: cell.dateKey === selectedDateKey }"
               @click="selectDate(cell.dateKey)">
            <div class="day-number">
              <span>{{ cell.date.getDate() }}</span>
              <span class="day-count" v-if="cell.allInstances.length > 0">{{ cell.allInstances.length }} 个日程</span>
            </div>
            <div class="day-events">
              <template v-if="calendarViewMode === 'names'">
                <div v-for="(slot, idx) in cell.slots" :key="idx">
                  <div v-if="slot" class="day-item" :class="{ important: slot.important }"
                       :style="{ backgroundColor: getCategoryColor(slot.categoryId) || 'var(--primary)' }"
                       :title="slot.title">
                    {{ slot.title }}
                  </div>
                  <div v-else style="height: 20px; margin-top: 4px;"></div>
                </div>
              </template>
              <template v-else>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px;">
                  <span v-for="inst in cell.allInstances" :key="inst.id" 
                        class="category-dot" 
                        :style="{ backgroundColor: getCategoryColor(inst.categoryId) || 'var(--primary)', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }"
                        :title="inst.title">
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </section>
      <aside class="day-detail" style="display: flex; flex-direction: column;">
        <div class="day-detail-header">
          <p class="eyebrow">当天内容</p>
          <h3>{{ selectedDateKey }}</h3>
        </div>
        <div class="day-list" style="flex: 1; overflow-y: auto;">
          <article v-for="schedule in selectedDateSchedules" :key="schedule.id" class="schedule-card">
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
            <div class="schedule-meta" style="margin-top: 10px;">
              <span class="tag" :style="getCategoryStyle(schedule.categoryId)">
                {{ getCategoryName(schedule.categoryId) }}
              </span>
              <span class="tag" :class="getStatusClass(schedule)">{{ getStatusLabel(schedule) }}</span>
              <span class="tag important" v-if="schedule.important">重点</span>
            </div>
          </article>
          <div v-if="selectedDateSchedules.length === 0" class="empty-state">今日无日程安排</div>
        </div>
      </aside>
    </div>

    <!-- 表单 Dialog -->
    <ScheduleFormDialog ref="scheduleFormDialogRef" :categories="categories" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { CalendarEngine, CalendarDaySlot, ScheduleInstance } from '../utils/calendarEngine';
import { Schedule, Category, Subtask, RecurrenceType, ScheduleStatus } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import ScheduleFormDialog from '../components/ScheduleFormDialog.vue';

export default defineComponent({
  name: 'SchedulesView',
  components: {
    Icon,
    ScheduleFormDialog
  },
  setup() {
    const store = useScheduleStore();

    // 基础视图状态
    const activeView = ref<'list' | 'calendar'>('list');
    const searchQuery = ref('');
    const listFilter = ref<'today' | 'tomorrow' | 'next7days' | 'all'>('today');
    const categoryFilter = ref<string>('all');

    // 日历特有状态
    const calendarYear = ref(new Date().getFullYear());
    const calendarMonth = ref(new Date().getMonth());
    const calendarViewMode = ref<'dots' | 'names'>('names');
    const selectedDateKey = ref(toDateKey(new Date()));

    // 表单子组件 Ref
    const scheduleFormDialogRef = ref<InstanceType<typeof ScheduleFormDialog> | null>(null);

    const categories = computed(() => store.categories);

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
      });

      return {
        today: todayCount,
        tomorrow: tomorrowCount,
        next7days: next7Count,
        all: store.schedules.length,
        catAll: store.schedules.length
      };
    });

    function getCategoryCount(catId: string): number {
      return store.schedules.filter(s => s.categoryId === catId).length;
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
      const now = new Date();
      if (endTime < now) return "已逾期";
      if (schedule.status === "pending" && startTime <= now) return "进行中";
      if (schedule.status === "in-progress") return "进行中";
      if (schedule.status === "delayed") return "已延期";
      return "未开始";
    }

    function getStatusClass(schedule: Schedule): string {
      if (schedule.status === "completed") return "done";
      const endTime = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
      const startTime = new Date(schedule.startTime);
      const now = new Date();
      if (endTime < now) return "overdue";
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
      }

      // 2. 分类过滤
      if (categoryFilter.value !== 'all') {
        filtered = filtered.filter(s => s.categoryId === categoryFilter.value);
      }

      // 3. 搜索过滤
      const q = searchQuery.value.trim().toLowerCase();
      if (q) {
        filtered = filtered.filter(s => 
          s.title.toLowerCase().includes(q) || 
          s.content.toLowerCase().includes(q)
        );
      }

      return [...filtered].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    // 日历格子生成
    const activeMonthDate = computed(() => new Date(calendarYear.value, calendarMonth.value, 1));
    const calendarCells = computed<CalendarDaySlot[]>(() => {
      return CalendarEngine.generateGrid(store.schedules, activeMonthDate.value);
    });

    // 选中日期的日程实例
    const selectedDateSchedules = computed(() => {
      const cell = calendarCells.value.find(c => c.dateKey === selectedDateKey.value);
      return cell ? cell.allInstances : [];
    });

    // 日历月份操作
    function changeMonth(offset: number) {
      let m = calendarMonth.value + offset;
      let y = calendarYear.value;
      if (m < 0) {
        m = 11;
        y--;
      } else if (m > 11) {
        m = 0;
        y++;
      }
      calendarMonth.value = m;
      calendarYear.value = y;
    }

    function goToToday() {
      const now = new Date();
      calendarYear.value = now.getFullYear();
      calendarMonth.value = now.getMonth();
      selectedDateKey.value = toDateKey(now);
    }

    function selectDate(dateKey: string) {
      selectedDateKey.value = dateKey;
    }

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
        status: nextStatus as ScheduleStatus
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

    async function deleteSchedule(id: string) {
      if (confirm('确认删除此日程？')) {
        try {
          await store.deleteSchedule(id);
        } catch (error: any) {
          console.error("Failed to delete schedule:", error);
          await platform.showError("删除日程失败", error.message || String(error));
        }
      }
    }

    return {
      activeView,
      searchQuery,
      listFilter,
      categoryFilter,
      categories,
      counts,
      getCategoryCount,
      visibleSchedules,
      getCategoryName,
      getCategoryColor,
      getCategoryStyle,
      getStatusLabel,
      getStatusClass,
      formatInterval,

      // 日历
      calendarYear,
      calendarMonth,
      calendarViewMode,
      selectedDateKey,
      calendarCells,
      selectedDateSchedules,
      changeMonth,
      goToToday,
      selectDate,

      // 快捷操作
      toggleScheduleStatus,
      toggleSubtask,
      getCompletedSubtaskCount,

      // Dialog
      scheduleFormDialogRef,
      openAddDialog,
      openEditDialog,
      deleteSchedule
    };
  }
});
</script>
