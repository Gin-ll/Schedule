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
    <dialog ref="scheduleDialogRef">
      <form method="dialog" class="dialog-form" @submit.prevent="saveSchedule" style="padding: 20px;">
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 20px; font-weight: 700;">{{ isEditing ? '编辑日程' : '新增日程' }}</h3>
          <button class="plain-button" type="button" @click="closeDialog" style="border-radius: 999px;">关闭</button>
        </header>

        <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
          标题
          <input v-model="form.title" type="text" required maxlength="60" style="width: 100%;" />
        </label>

        <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
          内容
          <textarea v-model="form.content" rows="3" maxlength="300" style="width: 100%;"></textarea>
        </label>

        <!-- 子任务容器 -->
        <div class="dialog-subtasks-container">
          <label>子任务</label>
          <div class="dialog-subtask-list">
            <div v-for="(st, index) in form.subtasks" :key="st.id" class="dialog-subtask-row" style="display: flex; align-items: center; justify-content: space-between;">
              <span style="flex: 1; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">{{ st.title }}</span>
              <button type="button" class="plain-button" @click="removeSubtask(index)" style="padding: 2px 8px; font-size: 11px; min-height: 24px; border-radius: 999px;">删除</button>
            </div>
          </div>
          <div class="dialog-subtask-input-row" style="display: flex; gap: 8px;">
            <input type="text" v-model="newSubtaskTitle" placeholder="输入子任务内容" maxlength="60" style="flex: 1;" />
            <button type="button" class="plain-button" @click="addSubtask" style="border-radius: 8px;">添加</button>
          </div>
        </div>

        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
            开始时间
            <input v-model="form.startTime" type="datetime-local" required style="width: 100%;" />
          </label>
          <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
            结束时间
            <input v-model="form.endTime" type="datetime-local" style="width: 100%;" />
          </label>
        </div>

        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px;">
          <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
            分类
            <select v-model="form.categoryId" style="width: 100%;">
              <option value="">未分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </label>
          <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
            循环规则
            <select v-model="form.recurrence" style="width: 100%;">
              <option value="none">不循环</option>
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </label>
        </div>

        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px;">
          <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
            状态
            <select v-model="form.status" style="width: 100%;">
              <option value="pending">未开始</option>
              <option value="in-progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="delayed">已延期</option>
            </select>
          </label>
          <label style="display: flex; flex-direction: column; gap: 6px; align-items: stretch;">
            提醒
            <select v-model="form.reminder" style="width: 100%;">
              <option value="none">无</option>
              <option value="10m">提前 10 分钟</option>
              <option value="30m">提前 30 分钟</option>
              <option value="1h">提前 1 小时</option>
            </select>
          </label>
        </div>

        <div class="check-row" style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
          <input id="formImportant" type="checkbox" v-model="form.important" style="width: 18px; height: 18px; cursor: pointer;" />
          <label for="formImportant" style="font-size: 13px; color: var(--text); cursor: pointer; user-select: none;">标记为重点日程</label>
        </div>

        <footer style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
          <button class="primary-button" type="submit" style="padding: 6px 20px;">保存</button>
        </footer>
      </form>
    </dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { CalendarEngine, CalendarDaySlot, ScheduleInstance } from '../utils/calendarEngine';
import { Schedule, Category, Subtask, RecurrenceType, ScheduleStatus } from '../types';
import { Icon } from '@iconify/vue';

export default defineComponent({
  name: 'SchedulesView',
  components: {
    Icon
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

    // 表单状态
    const scheduleDialogRef = ref<HTMLDialogElement | null>(null);
    const isEditing = ref(false);
    const editingId = ref<string | null>(null);
    const newSubtaskTitle = ref('');
    const form = ref({
      title: '',
      content: '',
      startTime: '',
      endTime: '',
      recurrence: 'none' as RecurrenceType,
      categoryId: '',
      status: 'pending' as ScheduleStatus,
      reminder: 'none' as 'none' | '10m' | '30m' | '1h',
      important: false,
      subtasks: [] as Subtask[]
    });

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
      isEditing.value = false;
      editingId.value = null;
      newSubtaskTitle.value = '';
      
      // 当前日期加上 1 小时的默认值
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const startLocal = new Date(now.getTime() + 60 * 60 * 1000).toLocaleString('sv').slice(0, 16).replace(' ', 'T');
      const endLocal = new Date(now.getTime() + 2 * 60 * 60 * 1000).toLocaleString('sv').slice(0, 16).replace(' ', 'T');

      form.value = {
        title: '',
        content: '',
        startTime: startLocal,
        endTime: endLocal,
        recurrence: 'none',
        categoryId: '',
        status: 'pending',
        reminder: 'none',
        important: false,
        subtasks: []
      };

      scheduleDialogRef.value?.showModal();
    }

    function openEditDialog(schedule: Schedule) {
      isEditing.value = true;
      editingId.value = schedule.id;
      newSubtaskTitle.value = '';

      const startLocal = new Date(schedule.startTime).toLocaleString('sv').slice(0, 16).replace(' ', 'T');
      const endLocal = schedule.endTime 
        ? new Date(schedule.endTime).toLocaleString('sv').slice(0, 16).replace(' ', 'T')
        : '';

      form.value = {
        title: schedule.title,
        content: schedule.content || '',
        startTime: startLocal,
        endTime: endLocal,
        recurrence: schedule.recurrence,
        categoryId: schedule.categoryId || '',
        status: schedule.status,
        reminder: schedule.reminder || 'none',
        important: schedule.important,
        subtasks: schedule.subtasks ? JSON.parse(JSON.stringify(schedule.subtasks)) : []
      };

      scheduleDialogRef.value?.showModal();
    }

    function closeDialog() {
      scheduleDialogRef.value?.close();
    }

    // 表单子任务操作
    function addSubtask() {
      const title = newSubtaskTitle.value.trim();
      if (!title) return;
      const newSt: Subtask = {
        id: `st-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        title,
        completed: false
      };
      form.value.subtasks.push(newSt);
      newSubtaskTitle.value = '';
    }

    function removeSubtask(index: number) {
      form.value.subtasks.splice(index, 1);
    }

    // 提交日程表单
    async function saveSchedule() {
      const payload = {
        title: form.value.title,
        content: form.value.content,
        startTime: new Date(form.value.startTime).toISOString(),
        endTime: form.value.endTime ? new Date(form.value.endTime).toISOString() : undefined,
        recurrence: form.value.recurrence,
        categoryId: form.value.categoryId,
        status: form.value.status,
        reminder: form.value.reminder,
        important: form.value.important,
        subtasks: form.value.subtasks
      };

      if (isEditing.value && editingId.value) {
        await store.updateSchedule(editingId.value, payload);
      } else {
        await store.addSchedule(payload);
      }
      closeDialog();
    }

    async function deleteSchedule(id: string) {
      if (confirm('确认删除此日程？')) {
        await store.deleteSchedule(id);
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
      scheduleDialogRef,
      isEditing,
      newSubtaskTitle,
      form,
      openAddDialog,
      openEditDialog,
      closeDialog,
      addSubtask,
      removeSubtask,
      saveSchedule,
      deleteSchedule
    };
  }
});
</script>
