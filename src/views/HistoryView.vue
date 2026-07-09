<template>
  <div class="page active">
    <header class="page-header">
      <div>
        <p class="eyebrow">Archive & Review</p>
        <h2>历史回顾</h2>
      </div>
    </header>

    <!-- 选项卡切换区 -->
    <div class="tabs-container">
      <button class="tab-btn" :class="{ active: currentTab === 'completed' }" @click="currentTab = 'completed'">
        <Icon icon="lucide:check-circle" width="16" height="16" />
        <span>已完成清单 ({{ completedSchedules.length }})</span>
      </button>
      <button class="tab-btn" :class="{ active: currentTab === 'overdue' }" @click="currentTab = 'overdue'">
        <Icon icon="lucide:alert-circle" width="16" height="16" />
        <span>逾期待整理 ({{ overdueSchedules.length }})</span>
      </button>
    </div>

    <!-- 仅在“已完成”页显示时间范围筛选器 -->
    <div v-if="currentTab === 'completed'" class="completed-filter-bar">
      <div class="range-tabs">
        <button v-for="r in rangeOptions" :key="r.value" class="range-tab-btn" :class="{ active: selectedRange === r.value }" @click="selectedRange = r.value">
          {{ r.label }}
        </button>
      </div>
      
      <!-- 使用 shadcn-vue 统一风格的日期选择器 -->
      <div v-if="selectedRange === 'custom'" class="custom-range-inputs">
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline" class="h-8 text-xs font-normal" style="color: var(--text);">
              <Icon icon="lucide:calendar" class="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {{ customStartDate ? formatDateString(customStartDate) : '开始日期' }}
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="start">
            <Calendar v-model="customStartDate" />
          </PopoverContent>
        </Popover>
        <span class="sep-text">至</span>
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline" class="h-8 text-xs font-normal" style="color: var(--text);">
              <Icon icon="lucide:calendar" class="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {{ customEndDate ? formatDateString(customEndDate) : '结束日期' }}
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="start">
            <Calendar v-model="customEndDate" />
          </PopoverContent>
        </Popover>
      </div>
      <span class="filtered-count-tip" v-if="filteredCompletedSchedules.length !== completedSchedules.length">
        (已筛选出 {{ filteredCompletedSchedules.length }} 项)
      </span>

      <!-- 复制按钮移入到和时间/筛选器同一行，靠右对齐 -->
      <div style="margin-left: auto;" v-if="filteredCompletedSchedules.length > 0">
        <button class="header-copy-btn" @click="copyWeeklyReport" type="button" title="一键复制周报格式文本">
          <Icon icon="lucide:copy" width="16" height="16" />
        </button>
      </div>
    </div>

    <!-- 列表展示区 -->
    <div class="history-content">
      <div v-if="currentTab === 'completed'" class="completed-section">
        <div v-if="filteredCompletedSchedules.length > 0" class="history-grid">
          <article v-for="s in filteredCompletedSchedules" :key="s.id" class="history-card completed">
            <div class="history-card-header">
              <span class="category-indicator" :style="getCategoryStyle(s.categoryId)"></span>
              <span class="category-name">{{ getCategoryName(s.categoryId) }}</span>
              <span class="date-badge">{{ formatDateShort(s.startTime) }}</span>
            </div>
            <h3 class="history-title">{{ s.title }}</h3>
            <p class="history-desc" v-if="s.content">{{ s.content }}</p>
            <div v-if="s.subtasks && s.subtasks.length > 0" class="history-subtasks">
              <div class="subtask-progress-text">子任务: {{ getCompletedSubtaskCount(s) }}/{{ s.subtasks.length }} 已完成</div>
              <ul class="subtask-history-list">
                <li v-for="st in s.subtasks" :key="st.id" class="subtask-history-item" :class="{ done: st.completed }">
                  <Icon :icon="st.completed ? 'lucide:check' : 'lucide:circle'" width="12" height="12" />
                  <span>{{ st.title }}</span>
                </li>
              </ul>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <Icon icon="lucide:archive" class="empty-icon" />
          <span>该时间范围内暂无已完成日程</span>
        </div>
      </div>

      <div v-else-if="currentTab === 'overdue'" class="overdue-section">
        <div v-if="overdueSchedules.length > 0" class="history-grid">
          <article v-for="s in overdueSchedules" :key="s.id" class="history-card overdue">
            <div class="history-card-header">
              <span class="category-indicator" :style="getCategoryStyle(s.categoryId)"></span>
              <span class="category-name">{{ getCategoryName(s.categoryId) }}</span>
              <span class="overdue-date-badge">{{ formatOverdueDays(s.startTime) }}</span>
            </div>
            <h3 class="history-title">{{ s.title }}</h3>
            <p class="history-desc" v-if="s.content">{{ s.content }}</p>
            
            <div class="history-card-actions">
              <button class="action-btn reschedule" @click="moveToToday(s)">
                <Icon icon="lucide:calendar-range" width="14" height="14" />
                <span>移至今天</span>
              </button>
              <button class="action-btn delete" @click="deleteSchedule(s.id)">
                <Icon icon="lucide:trash-2" width="14" height="14" />
                <span>删除</span>
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <Icon icon="lucide:shield-check" class="empty-icon" style="color: #34c759;" />
          <span style="color: #34c759; font-weight: 600;">所有过去日程都已按期清空</span>
        </div>
      </div>
    </div>

    <!-- 自定义删除确认弹窗 -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">删除确认</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            确定要彻底删除这个已经逾期的日程吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showDeleteConfirm = false">取消</Button>
          <Button variant="destructive" @click="confirmDelete">删除</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 复制成功 Toast 反馈 -->
    <div class="toast" :class="{ show: showToast }">
      <Icon icon="lucide:check-circle-2" width="18" height="18" />
      <span>已成功复制筛选范围内的周报文本！</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Schedule } from '../types';
import { Icon } from '@iconify/vue';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDate } from '@internationalized/date';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default defineComponent({
  name: 'HistoryView',
  components: {
    Icon,
    Calendar,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
  },
  setup() {
    const store = useScheduleStore();
    const currentTab = ref<'completed' | 'overdue'>('completed');
    const showToast = ref(false);

    // 删除弹窗状态
    const showDeleteConfirm = ref(false);
    const idToDelete = ref('');

    // 时间范围筛选状态
    const selectedRange = ref<'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'>('all');
    
    // 初始化自定义日期范围为当前日期
    const now = new Date();
    const customStartDate = ref<any>(new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate()));
    const customEndDate = ref<any>(new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate()));

    const rangeOptions = [
      { label: '全部', value: 'all' },
      { label: '本周', value: 'this_week' },
      { label: '上周', value: 'last_week' },
      { label: '本月', value: 'this_month' },
      { label: '上月', value: 'last_month' },
      { label: '自定义', value: 'custom' }
    ];

    // 全量已完成日程 (按开始时间降序)
    const completedSchedules = computed(() => {
      return store.schedules
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    // 过滤后的已完成日程
    const filteredCompletedSchedules = computed(() => {
      const base = completedSchedules.value;
      if (selectedRange.value === 'all') return base;

      const baseNow = new Date();
      let startBound: Date | null = null;
      let endBound: Date | null = null;

      if (selectedRange.value === 'this_week') {
        const day = baseNow.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(baseNow);
        monday.setDate(baseNow.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        
        startBound = monday;
        
        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);
        endBound = nextMonday;
      } else if (selectedRange.value === 'last_week') {
        const day = baseNow.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(baseNow);
        monday.setDate(baseNow.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const lastMonday = new Date(monday);
        lastMonday.setDate(monday.getDate() - 7);
        const lastSundayEnd = new Date(monday);

        startBound = lastMonday;
        endBound = lastSundayEnd;
      } else if (selectedRange.value === 'this_month') {
        startBound = new Date(baseNow.getFullYear(), baseNow.getMonth(), 1, 0, 0, 0, 0);
        endBound = new Date(baseNow.getFullYear(), baseNow.getMonth() + 1, 1, 0, 0, 0, 0);
      } else if (selectedRange.value === 'last_month') {
        startBound = new Date(baseNow.getFullYear(), baseNow.getMonth() - 1, 1, 0, 0, 0, 0);
        endBound = new Date(baseNow.getFullYear(), baseNow.getMonth(), 1, 0, 0, 0, 0);
      } else if (selectedRange.value === 'custom') {
        if (customStartDate.value) {
          startBound = new Date(customStartDate.value.year, customStartDate.value.month - 1, customStartDate.value.day, 0, 0, 0, 0);
        }
        if (customEndDate.value) {
          endBound = new Date(customEndDate.value.year, customEndDate.value.month - 1, customEndDate.value.day, 23, 59, 59, 999);
        }
      }

      return base.filter(s => {
        const time = new Date(s.startTime);
        if (startBound && time < startBound) return false;
        if (endBound && time >= endBound) return false;
        return true;
      });
    });

    // 已逾期日程 (截止在今天零点前，且未完成)
    const overdueSchedules = computed(() => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      return store.schedules
        .filter(s => {
          const end = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
          return end < startOfToday && s.status !== 'completed';
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    // 辅助格式化
    function getCategoryName(catId: string): string {
      const cat = store.categories.find(c => c.id === catId);
      return cat ? cat.name : '未分类';
    }

    function getCategoryColor(catId: string): string {
      const cat = store.categories.find(c => c.id === catId);
      return cat ? cat.color : '#8E8E93';
    }

    function getCategoryStyle(catId: string) {
      return { backgroundColor: getCategoryColor(catId) };
    }

    function formatDateShort(val: string): string {
      const d = new Date(val);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function formatDateString(calDate: any): string {
      if (!calDate) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${calDate.year}-${pad(calDate.month)}-${pad(calDate.day)}`;
    }

    function formatOverdueDays(val: string): string {
      const d = new Date(val);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const diffTime = startOfToday.getTime() - d.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `已逾期 ${diffDays} 天 (${d.getMonth() + 1}月${d.getDate()}日)`;
    }

    function getCompletedSubtaskCount(s: Schedule): number {
      if (!s.subtasks) return 0;
      return s.subtasks.filter(st => st.completed).length;
    }

    // 动作一：移至今天
    const moveToToday = async (schedule: Schedule) => {
      try {
        const baseNow = new Date();
        baseNow.setHours(9, 0, 0, 0);
        const timeISO = baseNow.toISOString();
        await store.updateSchedule(schedule.id, {
          startTime: timeISO,
          endTime: timeISO,
          status: 'pending'
        });
      } catch(e) {
        console.error(e);
      }
    };

    // 打开删除确认弹窗
    const deleteSchedule = (id: string) => {
      idToDelete.value = id;
      showDeleteConfirm.value = true;
    };

    // 执行删除
    const confirmDelete = async () => {
      if (idToDelete.value) {
        try {
          await store.deleteSchedule(idToDelete.value);
        } catch(e) {
          console.error(e);
        } finally {
          showDeleteConfirm.value = false;
          idToDelete.value = '';
        }
      }
    };

    // 动作三：根据筛选内容复制周报
    const copyWeeklyReport = async () => {
      if (filteredCompletedSchedules.value.length === 0) return;

      // 组装时间段头部描述
      let rangeDesc = '全量历史已完成';
      if (selectedRange.value === 'this_week') rangeDesc = '本周已完成';
      else if (selectedRange.value === 'last_week') rangeDesc = '上周已完成';
      else if (selectedRange.value === 'this_month') rangeDesc = '本月已完成';
      else if (selectedRange.value === 'last_month') rangeDesc = '上月已完成';
      else if (selectedRange.value === 'custom') {
        const startStr = formatDateString(customStartDate.value);
        const endStr = formatDateString(customEndDate.value);
        rangeDesc = `自定义时间段 [${startStr || '始'} 至 ${endStr || '终'}]`;
      }

      let text = `📅 【${rangeDesc}】工作日程汇报：\n\n`;
      filteredCompletedSchedules.value.forEach((s, idx) => {
        const catName = getCategoryName(s.categoryId);
        const dateStr = formatDateShort(s.startTime);
        text += `${idx + 1}. [${catName}] ${s.title} (${dateStr} 归档)\n`;
        if (s.content) {
          text += `   - 详情: ${s.content}\n`;
        }
        if (s.subtasks && s.subtasks.length > 0) {
          const compNames = s.subtasks.filter(st => st.completed).map(st => st.title).join('、');
          if (compNames) {
            text += `   - 已完成子任务: ${compNames}\n`;
          }
        }
      });

      try {
        await navigator.clipboard.writeText(text);
        showToast.value = true;
        setTimeout(() => {
          showToast.value = false;
        }, 2000);
      } catch(err) {
        console.error("Failed to copy clipboard", err);
      }
    };

    return {
      currentTab,
      showToast,
      showDeleteConfirm,
      selectedRange,
      customStartDate,
      customEndDate,
      rangeOptions,
      completedSchedules,
      filteredCompletedSchedules,
      overdueSchedules,
      getCategoryName,
      getCategoryStyle,
      formatDateShort,
      formatDateString,
      formatOverdueDays,
      getCompletedSubtaskCount,
      moveToToday,
      deleteSchedule,
      confirmDelete,
      copyWeeklyReport
    };
  }
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-copy-btn {
  background: var(--panel-strong);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.header-copy-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* 选项卡容器 */
.tabs-container {
  display: flex;
  gap: 8px;
  padding: 0 24px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text);
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px 6px 0 0;
}

.dark .tab-btn:hover {
  background: rgba(255, 255, 255, 0.04);
}

.tab-btn.active {
  color: var(--primary);
  font-weight: 600;
  border-bottom-color: var(--primary);
}

/* 筛选工具栏 */
.completed-filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 24px;
  margin-bottom: 16px;
  flex-shrink: 0;
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

.custom-range-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
  animation: fadeIn 0.2s ease-out;
}

.sep-text {
  font-size: 12px;
  color: var(--muted-foreground);
}

.filtered-count-tip {
  font-size: 12px;
  color: var(--muted-foreground);
}

/* 内容区 */
.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px 24px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* 历史卡片 */
.history-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  transition: all 0.2s;
}

.history-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.history-card.completed {
  border-left: 4px solid #34c759;
}

.history-card.overdue {
  border-left: 4px solid #ff3b30;
}

.history-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.category-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.category-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-foreground);
  flex: 1;
}

.date-badge, .overdue-date-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.date-badge {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.overdue-date-badge {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.history-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
  line-height: 1.4;
  word-break: break-all;
}

.history-desc {
  font-size: 13px;
  color: var(--muted-foreground);
  margin-bottom: 12px;
  line-height: 1.5;
  word-break: break-all;
  white-space: pre-wrap;
}

/* 子任务显示 */
.history-subtasks {
  margin-top: auto;
  border-top: 1px dashed var(--line);
  padding-top: 10px;
}

.subtask-progress-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-foreground);
  margin-bottom: 6px;
}

.subtask-history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.subtask-history-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.subtask-history-item.done {
  color: var(--text);
  text-decoration: line-through;
  opacity: 0.6;
}

.subtask-history-item.done svg {
  color: #34c759;
}

/* 逾期卡片快捷操作 */
.history-card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: var(--panel-strong);
  color: var(--text);
  transition: all 0.2s;
}

.action-btn.reschedule:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.action-btn.delete:hover {
  background: #ff3b30;
  color: white;
  border-color: #ff3b30;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  color: var(--muted-foreground);
}

.empty-icon {
  width: 48px;
  height: 48px;
  opacity: 0.3;
  margin-bottom: 12px;
}

/* Toast 反馈 */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--panel-strong);
  border: 1px solid #34c759;
  color: var(--text);
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  font-size: 13px;
  font-weight: 500;
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  z-index: 9999;
}

.toast.show {
  transform: translateY(0);
  opacity: 1;
}

.toast svg {
  color: #34c759;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
