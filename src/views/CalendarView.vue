<template>
  <div class="page active">
    <div class="content-panel active calendar-layout">
      <section class="calendar-area" @wheel.prevent="handleCalendarWheel">
        <div class="calendar-header">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="icon-button" @click="navigatePrev" type="button">&lt;</button>
          <div class="month-picker-label" style="color: var(--foreground); display: flex; align-items: center; margin: 0 10px;">
            <h3 style="margin: 0;">{{ viewTitle }}</h3>
          </div>
            <button class="icon-button" @click="navigateNext" type="button">&gt;</button>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <template v-if="viewMode !== 'day'">
              <button v-if="viewMode === 'month'" class="plain-button" @click="calendarViewMode = calendarViewMode === 'dots' ? 'names' : 'dots'" type="button">
                视图: {{ calendarViewMode === 'dots' ? '圆点' : '标题' }}
              </button>
              <button class="plain-button" @click="showLunar = !showLunar" type="button">
                农历: {{ showLunar ? '显示' : '隐藏' }}
              </button>
            </template>
            <button class="plain-button" @click="goToToday" type="button">今天</button>
            <div class="view-switch">
              <button class="view-switch-btn" :class="{ active: viewMode === 'month' }" @click="switchView('month')" type="button">月</button>
              <button class="view-switch-btn" :class="{ active: viewMode === 'week' }" @click="switchView('week')" type="button">周</button>
              <button class="view-switch-btn" :class="{ active: viewMode === 'day' }" @click="switchView('day')" type="button">日</button>
            </div>
          </div>
        </div>
        <!-- 月视图 -->
        <template v-if="viewMode === 'month'">
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
                 :style="calendarViewMode === 'dots' ? { minHeight: '64px' } : {}"
                 @click="selectDate(cell.dateKey)">
              <div class="day-number">
                <div style="display: flex; align-items: baseline; gap: 4px;">
                  <span style="font-size: 16px; font-weight: 700;">{{ cell.date.getDate() }}</span>
                  <span class="lunar-txt" v-if="showLunar" :class="{ festival: getLunarInfo(cell.date).isFestival }">
                    {{ getLunarInfo(cell.date).text }}
                  </span>
                </div>
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
                  <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; justify-content: center;">
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
        </template>

        <!-- 周视图（支持跨天拖拽） -->
        <template v-else-if="viewMode === 'week'">
          <div class="week-row">
            <span>一</span>
            <span>二</span>
            <span>三</span>
            <span>四</span>
            <span>五</span>
            <span>六</span>
            <span>日</span>
          </div>
          <div class="calendar-grid week-grid">
            <div v-for="cell in weekCells" :key="cell.dateKey" class="calendar-day"
                 :class="{ today: cell.isToday, selected: cell.dateKey === selectedDateKey, 'drag-over': cell.dateKey === weekDragOverKey }"
                 @click="selectDate(cell.dateKey)"
                 @dragover.prevent="onWeekDragOver(cell.dateKey)"
                 @dragleave="weekDragOverKey = ''"
                 @drop.prevent="onWeekDrop(cell.dateKey)">
              <div class="day-number">
                <div style="display: flex; align-items: baseline; gap: 4px;">
                  <span style="font-size: 16px; font-weight: 700;">{{ cell.date.getDate() }}</span>
                  <span class="lunar-txt" v-if="showLunar" :class="{ festival: getLunarInfo(cell.date).isFestival }">
                    {{ getLunarInfo(cell.date).text }}
                  </span>
                </div>
              </div>
              <div class="day-events">
                <div v-for="(slot, idx) in cell.slots" :key="idx">
                  <div v-if="slot" class="day-item week-item"
                       :class="{ important: slot.important, locked: isRecurring(slot) }"
                       :style="{ backgroundColor: getCategoryColor(slot.categoryId) || 'var(--primary)' }"
                       :title="slot.title"
                       :draggable="!isRecurring(slot)"
                       @dragstart="onWeekDragStart($event, slot)"
                       @dragend="onWeekDragEnd">
                    <Icon v-if="isRecurring(slot)" icon="lucide:repeat" width="10" height="10" style="margin-right: 2px; vertical-align: middle;" />
                    {{ slot.title }}
                  </div>
                  <div v-else style="height: 20px; margin-top: 4px;"></div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 日视图：24 小时时间轴 -->
        <template v-else-if="viewMode === 'day'">
          <div class="timeline-scroll">
            <div class="timeline">
              <div class="timeline-hours">
                <div v-for="h in 24" :key="h" class="timeline-hour-label" :style="{ top: (h - 1) * 60 + 'px' }">
                  {{ padHour(h - 1) }}
                </div>
              </div>
              <div class="timeline-body" ref="timelineBodyRef"
                   @pointermove="onTimelinePointerMove"
                   @pointerup="onTimelinePointerUp"
                   @pointercancel="onTimelinePointerUp">
                <div v-for="h in 24" :key="h" class="timeline-hour-line" :style="{ top: (h - 1) * 60 + 'px' }"></div>
                <div class="timeline-now-line" v-if="isToday(dayAnchor)" :style="{ top: nowPercent + '%' }"></div>
                <template v-for="(group, gi) in groupedTimeline" :key="gi">
                  <div class="timeline-group" :style="groupStyle(group)">
                    <div v-for="entry in group.items" :key="entry.inst.id"
                         class="timeline-event"
                         :class="{ locked: isRecurring(entry.inst), dragging: dragPreviewId === entry.inst.id }"
                         :style="eventStyle(entry.inst)"
                         @pointerdown="onTimelinePointerDown($event, entry.inst)">
                      <span class="timeline-event-time">{{ formatEventTime(entry.inst) }}</span>
                      <span class="timeline-event-title">{{ entry.inst.title }}</span>
                      <span v-if="!isRecurring(entry.inst)" class="timeline-resize-handle" title="拖动调整时长"></span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </section>
      <aside class="day-detail" style="display: flex; flex-direction: column;">
        <div class="day-detail-header" style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <p class="eyebrow" style="margin: 0; font-size: 14px; font-weight: 700; color: var(--foreground);">当天内容</p>
            <span class="count-badge" v-if="selectedDateSchedules.length > 0">
              共 {{ selectedDateSchedules.length }} 个日程
            </span>
          </div>
          <h3 style="margin: 0;">{{ selectedDateKey }}</h3>
          <p v-if="showLunar && selectedDateObj" style="font-size: 11px; color: var(--muted-foreground); margin: 0; font-weight: 500;">
            农历 {{ getDetailedLunarString(selectedDateObj) }}
          </p>
        </div>
        <div class="day-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;">
          <div v-if="selectedDateSchedules.length > 0" style="display: grid; gap: 10px;">
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
          </div>
          <div v-else class="empty-state" style="flex: 1;">
            <Icon icon="lucide:calendar-heart" class="empty-icon" />
            <span>今日无日程安排</span>
          </div>
        </div>

        <!-- 快速添加：仅限选中日期当天，仅保留时间/分类 -->
        <QuickAddBar :categories="categories" :fixed-date="selectedDateKey" hide-recurrence hide-reminder hide-important />
      </aside>
    </div>

    <!-- 表单 Dialog -->
    <ScheduleFormDialog ref="scheduleFormDialogRef" :categories="categories" />

    <!-- 自定义删除确认弹窗 -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">移入回收站</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            确认将此日程移入回收站吗？可在回收站中恢复。
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showDeleteConfirm = false">取消</Button>
          <Button variant="destructive" @click="executeDeleteSchedule">移入回收站</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Solar, Lunar } from 'lunar-javascript';
import {
  CalendarEngine,
  CalendarDaySlot,
  ScheduleInstance,
  snapToMinutes,
  minutesToTop,
  moveToDate,
  toDateKey as engineToDateKey
} from '../utils/calendarEngine';
import { Schedule, Category } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import ScheduleFormDialog from '../components/ScheduleFormDialog.vue';
import QuickAddBar from '../components/QuickAddBar.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default defineComponent({
  name: 'CalendarView',
  components: {
    Icon,
    ScheduleFormDialog,
    QuickAddBar,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Button
  },
  setup() {
    const store = useScheduleStore();

    // 日历特有状态
    const calendarYear = ref(new Date().getFullYear());
    const calendarMonth = ref(new Date().getMonth());
    const calendarViewMode = ref<'dots' | 'names'>('names');
    const selectedDateKey = ref(toDateKey(new Date()));
    const showLunar = ref(localStorage.getItem('show_lunar') === 'true');

    watch(showLunar, (newVal) => {
      localStorage.setItem('show_lunar', String(newVal));
    });

    // 视图模式与锚点
    const viewMode = ref<'month' | 'week' | 'day'>('month');
    const weekAnchor = ref(new Date());   // 周视图锚点（本周内任意一天）
    const dayAnchor = ref(new Date());    // 日视图锚点
    const nowTick = ref(0);               // 每分钟心跳，驱动"当前时间线"刷新

    let nowTickTimer: ReturnType<typeof setInterval> | null = null;
    onMounted(() => {
      nowTickTimer = setInterval(() => { nowTick.value++; }, 60 * 1000);
    });
    onUnmounted(() => {
      if (nowTickTimer) clearInterval(nowTickTimer);
    });

    const viewTitle = computed(() => {
      if (viewMode.value === 'month') return `${calendarYear.value} 年 ${calendarMonth.value + 1} 月`;
      if (viewMode.value === 'week') {
        const mon = weekCells.value[0]?.date;
        const sun = weekCells.value[6]?.date;
        if (mon && sun) {
          return `${mon.getMonth() + 1}月${mon.getDate()}日 - ${sun.getMonth() + 1}月${sun.getDate()}日`;
        }
        return '';
      }
      return `${dayAnchor.value.getFullYear()}年${dayAnchor.value.getMonth() + 1}月${dayAnchor.value.getDate()}日`;
    });

    const weekCells = computed<CalendarDaySlot[]>(() =>
      CalendarEngine.generateWeekGrid(store.schedules, weekAnchor.value)
    );

    // 日视图时间轴分组：同一时间段重叠的日程归为一组（组内 flex 流式排列，一行放不下换行）
    const groupedTimeline = computed(() => {
      const raw = CalendarEngine.getDayInstances(store.schedules, dayAnchor.value);
      // 拖拽预览：用预览时间覆盖被拖拽实例
      const drag = timelineDrag.value;
      const instances = raw.map(inst => {
        if (drag && drag.id === inst.id) {
          return { ...inst, instanceStart: drag.previewStart, instanceEnd: drag.previewEnd };
        }
        return inst;
      });
      const sorted = [...instances].sort(
        (a, b) => a.instanceStart.getTime() - b.instanceStart.getTime()
      );
      const dayStart = startOfDay(dayAnchor.value).getTime();
      const dayEnd = endOfDay(dayAnchor.value).getTime();

      // 裁剪到当日并换算成当日分钟
      const clipped = sorted.map(inst => {
        const s = Math.max(inst.instanceStart.getTime(), dayStart);
        const e = Math.min(inst.instanceEnd.getTime(), dayEnd);
        return {
          inst,
          startMin: (s - dayStart) / 60000,
          endMin: (e - dayStart) / 60000
        };
      });

      // 按 30 分钟时段分组：同一时段的日程横排一行，行间红线分隔
      const groups: { topMin: number; durationMin: number; items: typeof clipped }[] = [];
      for (const c of clipped) {
        const slotStart = Math.floor(c.startMin / 30) * 30;
        const last = groups[groups.length - 1];
        if (!last || last.topMin !== slotStart) {
          groups.push({ topMin: slotStart, durationMin: 30, items: [c] });
        } else {
          last.items.push(c);
        }
      }
      return groups;
    });

    // 当前时间百分比（0-100），驱动日视图"现在线"
    const nowPercent = computed(() => {
      void nowTick.value; // 依赖心跳刷新
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      return (minutes / 1440) * 100;
    });

    function isToday(date: Date): boolean {
      return engineToDateKey(date) === engineToDateKey(new Date());
    }

    function isRecurring(item: Schedule): boolean {
      return !!item.recurrence && item.recurrence !== 'none';
    }

    function padHour(h: number): string {
      return `${String(h).padStart(2, '0')}:00`;
    }

    function startOfDay(date: Date): Date {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function endOfDay(date: Date): Date {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    }

    // 组容器样式：按组最早开始时间定位，高度容纳组内最长日程
    function groupStyle(group: { topMin: number; durationMin: number }): Record<string, string> {
      return {
        top: (group.topMin / 1440) * 100 + '%',
        minHeight: Math.max(group.durationMin, 26) + 'px'
      };
    }

    // 日程块样式：宽度自适应内容，背景按分类色
    function eventStyle(item: ScheduleInstance): Record<string, string> {
      return {
        backgroundColor: getCategoryColor(item.categoryId) || 'var(--primary)'
      };
    }

    // 事件块时间文案（跨天实例按当日显示起止）
    function formatEventTime(item: ScheduleInstance): string {
      const dayStart = startOfDay(dayAnchor.value).getTime();
      const dayEnd = endOfDay(dayAnchor.value).getTime();
      const startMs = Math.max(item.instanceStart.getTime(), dayStart);
      const endMs = Math.min(item.instanceEnd.getTime(), dayEnd);
      const fmt = (ms: number) => {
        const d = new Date(ms);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };
      return `${fmt(startMs)}-${fmt(endMs)}`;
    }

    // 视图切换：以当前选中日为新视图锚点
    function selectedDateToDate(): Date {
      if (!selectedDateKey.value) return new Date();
      const parts = selectedDateKey.value.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return new Date();
    }

    function switchView(mode: 'month' | 'week' | 'day') {
      viewMode.value = mode;
      if (mode === 'week') {
        weekAnchor.value = selectedDateToDate();
      } else if (mode === 'day') {
        dayAnchor.value = selectedDateToDate();
        selectedDateKey.value = engineToDateKey(dayAnchor.value);
      }
    }

    function navigatePrev() {
      if (viewMode.value === 'month') changeMonth(-1);
      else if (viewMode.value === 'week') changeWeek(-1);
      else changeDay(-1);
    }

    function navigateNext() {
      if (viewMode.value === 'month') changeMonth(1);
      else if (viewMode.value === 'week') changeWeek(1);
      else changeDay(1);
    }

    function changeWeek(offset: number) {
      const d = new Date(weekAnchor.value);
      d.setDate(d.getDate() + offset * 7);
      weekAnchor.value = d;
    }

    function changeDay(offset: number) {
      const d = new Date(dayAnchor.value);
      d.setDate(d.getDate() + offset);
      dayAnchor.value = d;
      selectedDateKey.value = engineToDateKey(d);
    }

    // ---- 周视图跨天拖拽 ----
    const weekDragScheduleId = ref('');
    const weekDragOverKey = ref('');

    function onWeekDragOver(dateKey: string) {
      weekDragOverKey.value = dateKey;
    }

    function onWeekDragStart(event: DragEvent, slot: ScheduleInstance) {
      weekDragScheduleId.value = slot.id;
      if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', slot.id);
        event.dataTransfer.effectAllowed = 'move';
      }
    }

    function onWeekDragEnd() {
      weekDragScheduleId.value = '';
      weekDragOverKey.value = '';
    }

    async function onWeekDrop(dateKey: string) {
      const id = weekDragScheduleId.value;
      weekDragScheduleId.value = '';
      weekDragOverKey.value = '';
      if (!id) return;
      const target = await store.schedules.find(s => s.id === id);
      if (!target) return;
      const parts = dateKey.split('-');
      const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (engineToDateKey(targetDate) === engineToDateKey(new Date(target.startTime))) {
        return; // 未跨天，忽略
      }
      try {
        const moved = moveToDate(target, targetDate);
        await store.updateSchedule(id, moved);
      } catch (error: any) {
        console.error("Failed to move schedule:", error);
        await platform.showError("移动日程失败", error.message || String(error));
      }
    }

    // ---- 日视图时间轴拖拽 ----
    const timelineBodyRef = ref<HTMLElement | null>(null);
    const timelineDrag = ref<null | {
      id: string;
      mode: 'move' | 'resize';
      startY: number;
      origStart: Date;
      origEnd: Date | null;
      previewStart: Date;
      previewEnd: Date;
    }>(null);

    const dragPreviewId = computed(() => timelineDrag.value?.id || '');

    function onTimelinePointerDown(event: PointerEvent, item: ScheduleInstance) {
      if (isRecurring(item)) return;
      event.preventDefault();
      const isResize = (event.target as HTMLElement)?.classList?.contains('timeline-resize-handle');
      const origStart = new Date(item.instanceStart);
      const origEnd = item.instanceEnd ? new Date(item.instanceEnd) : new Date(origStart);
      timelineDrag.value = {
        id: item.id,
        mode: isResize ? 'resize' : 'move',
        startY: event.clientY,
        origStart,
        origEnd,
        previewStart: new Date(origStart),
        previewEnd: new Date(origEnd)
      };
    }

    function onTimelinePointerMove(event: PointerEvent) {
      const drag = timelineDrag.value;
      const body = timelineBodyRef.value;
      if (!drag || !body) return;
      const bodyRect = body.getBoundingClientRect();
      // 时间轴高 1440px（1px = 1 分钟），换算成当日 0 点起的目标分钟
      const dayStart = startOfDay(dayAnchor.value).getTime();
      const deltaPx = event.clientY - drag.startY;
      const deltaMin = deltaPx; // 1px == 1min
      const MIN_STEP = 15 * 60 * 1000;

      if (drag.mode === 'move') {
        const origStartMin = drag.origStart.getTime() - dayStart;
        const newStart = new Date(dayStart + snapToMinutes(origStartMin + deltaMin * 60000, MIN_STEP));
        const duration = drag.origEnd.getTime() - drag.origStart.getTime();
        drag.previewStart = newStart;
        drag.previewEnd = new Date(newStart.getTime() + duration);
      } else {
        const origEndMin = drag.origEnd.getTime() - dayStart;
        const newEnd = new Date(dayStart + snapToMinutes(origEndMin + deltaMin * 60000, MIN_STEP));
        const minEnd = drag.previewStart.getTime() + MIN_STEP;
        drag.previewEnd = new Date(Math.max(newEnd.getTime(), minEnd));
      }
    }

    async function onTimelinePointerUp() {
      const drag = timelineDrag.value;
      timelineDrag.value = null;
      if (!drag) return;
      const payload: { startTime: string; endTime?: string } = {
        startTime: drag.previewStart.toISOString()
      };
      if (drag.origEnd) {
        payload.endTime = drag.previewEnd.toISOString();
      }
      // 时间未变化时不触发更新
      const changed =
        payload.startTime !== drag.origStart.toISOString() ||
        (payload.endTime && payload.endTime !== drag.origEnd?.toISOString());
      if (!changed) return;
      try {
        await store.updateSchedule(drag.id, payload);
      } catch (error: any) {
        console.error("Failed to update schedule time:", error);
        await platform.showError("调整时间失败", error.message || String(error));
      }
    }

    // 表单子组件 Ref
    const scheduleFormDialogRef = ref<InstanceType<typeof ScheduleFormDialog> | null>(null);

    // 删除弹窗状态
    const showDeleteConfirm = ref(false);
    const scheduleIdToDelete = ref('');

    const categories = computed(() => store.categories);

    // 辅助格式化
    function toDateKey(date: Date): string {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    // 分类样式和属性获取（含回收站分类：已删除分类仍被日程引用，需正常显示）
    function getCategoryName(catId: string): string {
      const cat = store.allCategories.find(c => c.id === catId);
      return cat ? cat.name : '未分类';
    }

    function getCategoryColor(catId: string): string {
      const cat = store.allCategories.find(c => c.id === catId);
      return cat ? cat.color : '#8E8E93';
    }

    // 分类样式
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
      weekAnchor.value = now;
      dayAnchor.value = now;
    }

    let lastWheelTime = 0;
    function handleCalendarWheel(event: WheelEvent) {
      const now = Date.now();
      if (now - lastWheelTime < 500) return;
      if (event.deltaY > 0) {
        navigateNext();
        lastWheelTime = now;
      } else if (event.deltaY < 0) {
        navigatePrev();
        lastWheelTime = now;
      }
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
    const selectedDateObj = computed(() => {
      if (!selectedDateKey.value) return null;
      const parts = selectedDateKey.value.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return null;
    });

    const getLunarInfo = (date: Date) => {
      const solar = Solar.fromDate(date);
      const lunar = solar.getLunar();

      // 1. 农历节日优先
      const lunarFestivals = lunar.getFestivals();
      if (lunarFestivals.length > 0) {
        return { text: lunarFestivals[0], isFestival: true };
      }

      // 2. 其次公历节日
      const solarFestivals = solar.getFestivals();
      if (solarFestivals.length > 0) {
        return { text: solarFestivals[0], isFestival: true };
      }

      // 3. 节气优先于普通日期
      const jieqi = lunar.getJieQi();
      if (jieqi) {
        return { text: jieqi, isFestival: true };
      }

      // 4. 初一显示月份名
      if (lunar.getDay() === 1) {
        return { text: lunar.getMonthInChinese() + '月', isFestival: false };
      }

      // 5. 默认显示农历日
      return { text: lunar.getDayInChinese(), isFestival: false };
    };

    const getDetailedLunarString = (date: Date) => {
      const solar = Solar.fromDate(date);
      const lunar = solar.getLunar();
      
      let res = `${lunar.getYearInGanZhi()}年(${lunar.getShengxiao()}) ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
      
      const term = lunar.getJieQi();
      if (term) res += ` · ${term}`;
      
      const lFest = lunar.getFestivals();
      if (lFest.length > 0) res += ` · ${lFest[0]}`;
      
      const sFest = solar.getFestivals();
      if (sFest.length > 0) res += ` · ${sFest[0]}`;
      
      return res;
    };
    return {
      categories,

      // 日历
      calendarYear,
      calendarMonth,
      calendarViewMode,
      selectedDateKey,
      calendarCells,
      selectedDateSchedules,
      showLunar,
      selectedDateObj,
      getLunarInfo,
      getDetailedLunarString,
      changeMonth,
      goToToday,
      selectDate,
      handleCalendarWheel,
      getCategoryColor,
      getCategoryName,
      getCategoryStyle,
      getStatusLabel,
      getStatusClass,

      // 周/日视图
      viewMode,
      weekAnchor,
      dayAnchor,
      viewTitle,
      weekCells,
      groupedTimeline,
      groupStyle,
      nowPercent,
      switchView,
      navigatePrev,
      navigateNext,
      isToday,
      isRecurring,
      padHour,
      formatEventTime,
      eventStyle,
      // 周视图跨天拖拽
      weekDragOverKey,
      onWeekDragStart,
      onWeekDragEnd,
      onWeekDragOver,
      onWeekDrop,
      // 日视图时间轴拖拽
      timelineBodyRef,
      dragPreviewId,
      onTimelinePointerDown,
      onTimelinePointerMove,
      onTimelinePointerUp,

      // 快捷操作
      toggleScheduleStatus,

      // Dialog
      scheduleFormDialogRef,
      openAddDialog,
      openEditDialog,
      deleteSchedule,
      executeDeleteSchedule,
      showDeleteConfirm
    };
  }
});
</script>

<style scoped>
.lunar-txt {
  font-size: 11px;
  color: var(--muted-foreground);
  font-weight: 500;
  opacity: 0.75;
  margin-left: 2px;
  user-select: none;
}
.lunar-txt.festival {
  color: #ff3b30;
  font-weight: 600;
  opacity: 1;
}

/* 视图切换 */
.view-switch {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 3px;
  border-radius: 8px;
}

.dark .view-switch {
  background: rgba(255, 255, 255, 0.06);
}

.view-switch-btn {
  background: transparent;
  border: none;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-foreground);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.view-switch-btn:hover {
  color: var(--text);
}

.view-switch-btn.active {
  background: var(--panel-strong);
  color: var(--text);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* 周视图 */
.week-item {
  cursor: grab;
  user-select: none;
}

.week-item.locked {
  cursor: default;
}

.calendar-day.drag-over {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

/* 日视图时间轴（高 1440px = 1px/分钟） */
.timeline-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 6px;
  margin-top: 4px;
}

.timeline {
  display: flex;
  height: 1440px;
  position: relative;
  user-select: none;
}

.timeline-hours {
  width: 46px;
  flex-shrink: 0;
  position: relative;
}

.timeline-hour-label {
  position: absolute;
  right: 8px;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--muted-foreground);
}

.timeline-body {
  flex: 1;
  position: relative;
  margin-left: 10px;
  border-left: 1px solid var(--line);
}

.timeline-hour-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid var(--line);
}

.timeline-now-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 2px solid #ff3b30;
  z-index: 5;
  pointer-events: none;
}

.timeline-group {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px;
  padding: 2px;
  box-sizing: border-box;
  pointer-events: none;
}

/* 行与行之间用红线分隔 */
.timeline-group + .timeline-group {
  border-top: 1px dashed rgba(255, 59, 48, 0.45);
}

.timeline-event {
  position: relative;
  border-radius: 8px;
  padding: 2px 8px 10px 8px;
  color: #fff;
  font-size: 11px;
  overflow: hidden;
  cursor: grab;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  width: fit-content;
  max-width: 100%;
  min-width: 56px;
  pointer-events: auto;
}

.timeline-event.locked {
  cursor: default;
  opacity: 0.9;
}

.timeline-event.dragging {
  z-index: 5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  outline: 2px solid var(--primary);
  outline-offset: -1px;
}

.timeline-event-time {
  display: block;
  font-size: 10px;
  opacity: 0.92;
  flex-shrink: 0;
  line-height: 1.3;
}

.timeline-event-title {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  line-height: 1.35;
}

.timeline-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
}
</style>
