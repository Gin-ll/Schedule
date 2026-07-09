<template>
  <div class="page active">
    <header class="page-header">
      <div>
        <p class="eyebrow">Monthly view</p>
        <h2>日历</h2>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="primary-icon-btn" @click="openAddDialog" type="button" aria-label="新增日程" title="新增日程">
          <Icon icon="lucide:plus" width="20" height="20" />
        </button>
      </div>
    </header>

    <div class="content-panel active calendar-layout">
      <section class="calendar-area" @wheel.prevent="handleCalendarWheel">
        <div class="calendar-header">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="icon-button" @click="changeMonth(-1)" type="button">&lt;</button>
          <div class="month-picker-label" style="color: var(--foreground); display: flex; align-items: center; margin: 0 10px;">
            <h3 style="margin: 0;">{{ calendarYear }} 年 {{ calendarMonth + 1 }} 月</h3>
          </div>
            <button class="icon-button" @click="changeMonth(1)" type="button">&gt;</button>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="plain-button" @click="calendarViewMode = calendarViewMode === 'dots' ? 'names' : 'dots'" type="button">
              视图: {{ calendarViewMode === 'dots' ? '圆点' : '标题' }}
            </button>
            <button class="plain-button" @click="showLunar = !showLunar" type="button">
              农历: {{ showLunar ? '显示' : '隐藏' }}
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
      </aside>
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
import { defineComponent, ref, computed, watch } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Solar, Lunar } from 'lunar-javascript';
import { CalendarEngine, CalendarDaySlot } from '../utils/calendarEngine';
import { Schedule, Category } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import ScheduleFormDialog from '../components/ScheduleFormDialog.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default defineComponent({
  name: 'CalendarView',
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

    // 日历特有状态
    const calendarYear = ref(new Date().getFullYear());
    const calendarMonth = ref(new Date().getMonth());
    const calendarViewMode = ref<'dots' | 'names'>('names');
    const selectedDateKey = ref(toDateKey(new Date()));
    const showLunar = ref(localStorage.getItem('show_lunar') === 'true');

    watch(showLunar, (newVal) => {
      localStorage.setItem('show_lunar', String(newVal));
    });

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

    // 分类样式和属性获取
    function getCategoryName(catId: string): string {
      const cat = store.categories.find(c => c.id === catId);
      return cat ? cat.name : '未分类';
    }

    function getCategoryColor(catId: string): string {
      const cat = store.categories.find(c => c.id === catId);
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
    }

    let lastWheelTime = 0;
    function handleCalendarWheel(event: WheelEvent) {
      const now = Date.now();
      if (now - lastWheelTime < 500) return;
      if (event.deltaY > 0) {
        changeMonth(1);
        lastWheelTime = now;
      } else if (event.deltaY < 0) {
        changeMonth(-1);
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
</style>
