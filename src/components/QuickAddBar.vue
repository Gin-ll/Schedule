<template>
  <div class="quick-add">
    <div class="quick-add-row">
      <Icon icon="lucide:circle-plus" class="quick-add-icon" width="18" height="18" />
      <input
        v-model="title"
        class="quick-add-input"
        placeholder="添加日程，输入标题后回车…"
        maxlength="60"
        @keyup.enter="add"
      />

      <!-- 已选设置标签 -->
      <template v-for="chip in selectedChips" :key="chip.key">
        <span class="quick-chip" :style="chip.style">
          {{ chip.label }}
          <button type="button" class="quick-chip-x" @click="chip.clear" aria-label="移除">
            <Icon icon="lucide:x" width="11" height="11" />
          </button>
        </span>
      </template>

      <!-- 功能圆钮：时间 -->
      <Popover v-model:open="timeOpen">
        <PopoverTrigger as-child>
          <button class="quick-round-btn" :class="{ active: hasCustomTime }" type="button" title="设置时间">
            <Icon icon="lucide:calendar" width="16" height="16" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="end" side="bottom">
          <div class="p-2.5 bg-popover rounded-lg">
            <Calendar v-if="!fixedDate" v-model="startCalendarDate" class="rounded-t-md" />
            <div class="flex items-center justify-between p-2.5" :class="fixedDate ? '' : 'border-t border-border'">
              <span class="text-xs text-muted-foreground">时间</span>
              <div class="flex items-center gap-1">
                <select v-model="startHour" class="w-[64px] h-7 border border-input rounded bg-popover px-1 text-xs outline-none" style="color: var(--text); background: var(--background);">
                  <option v-for="h in hoursList" :key="h" :value="h">{{ h }}</option>
                </select>
                <span class="text-xs">:</span>
                <select v-model="startMinute" class="w-[64px] h-7 border border-input rounded bg-popover px-1 text-xs outline-none" style="color: var(--text); background: var(--background);">
                  <option v-for="m in minutesList" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>
            <button v-if="!fixedDate" class="quick-plain-link" type="button" @click="clearTime">清除时间（用当前时刻）</button>
          </div>
        </PopoverContent>
      </Popover>

      <!-- 功能圆钮：分类 -->
      <Popover v-model:open="categoryOpen">
        <PopoverTrigger as-child>
          <button class="quick-round-btn" :class="{ active: !!form.categoryId }" type="button" title="选择分类">
            <Icon icon="lucide:tag" width="16" height="16" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-[160px] p-1.5" align="end" side="bottom">
          <button class="quick-opt" :class="{ selected: form.categoryId === '' }" type="button" @click="pickCategory('')">未分类</button>
          <button v-for="cat in selectableCategories" :key="cat.id" class="quick-opt" :class="{ selected: form.categoryId === cat.id }" type="button" @click="pickCategory(cat.id)">
            <span class="quick-dot" :style="{ backgroundColor: cat.color }"></span>
            {{ cat.name }}
          </button>
        </PopoverContent>
      </Popover>

      <!-- 功能圆钮：循环 -->
      <Popover v-if="!hideRecurrence" v-model:open="recurrenceOpen">
        <PopoverTrigger as-child>
          <button class="quick-round-btn" :class="{ active: form.recurrence !== 'none' }" type="button" title="循环规则">
            <Icon icon="lucide:repeat" width="16" height="16" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-[150px] p-1.5" align="end" side="bottom">
          <button v-for="r in recurrenceOptions" :key="r.value" class="quick-opt" :class="{ selected: form.recurrence === r.value }" type="button" @click="pickRecurrence(r.value)">
            {{ r.label }}
          </button>
        </PopoverContent>
      </Popover>

      <!-- 功能圆钮：提醒 -->
      <Popover v-if="!hideReminder" v-model:open="reminderOpen">
        <PopoverTrigger as-child>
          <button class="quick-round-btn" :class="{ active: form.reminder !== 'none' }" type="button" title="提醒">
            <Icon icon="lucide:bell" width="16" height="16" />
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-[150px] p-1.5" align="end" side="bottom">
          <button v-for="r in reminderOptions" :key="r.value" class="quick-opt" :class="{ selected: form.reminder === r.value }" type="button" @click="pickReminder(r.value)">
            {{ r.label }}
          </button>
        </PopoverContent>
      </Popover>

      <!-- 功能圆钮：重点（直接切换） -->
      <button v-if="!hideImportant" class="quick-round-btn" :class="{ active: form.important }" type="button" title="标记为重点" @click="form.important = !form.important">
        <Icon icon="lucide:star" width="16" height="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { CalendarDate } from '@internationalized/date';
import { Icon } from '@iconify/vue';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Category, RecurrenceType } from '../types';

const props = defineProps<{
  categories: Category[];
  /** 固定日期（YYYY-MM-DD）：传入后隐藏日期选择，仅可在该日期内新增 */
  fixedDate?: string;
  /** 隐藏循环规则圆钮 */
  hideRecurrence?: boolean;
  /** 隐藏提醒圆钮 */
  hideReminder?: boolean;
  /** 隐藏重点圆钮 */
  hideImportant?: boolean;
}>();

const store = useScheduleStore();

const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutesList = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const pad = (n: number) => String(n).padStart(2, '0');
function toCalendarDate(d: Date): CalendarDate {
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function parseDateKey(key: string): CalendarDate {
  const [y, m, d] = key.split('-').map(Number);
  return new CalendarDate(y, m, d);
}

const now = new Date();
const startCalendarDate = ref<any>(
  props.fixedDate ? parseDateKey(props.fixedDate) : toCalendarDate(now)
);
const startHour = ref(pad(now.getHours()));
const startMinute = ref(pad(Math.floor(now.getMinutes() / 5) * 5));
const hasCustomTime = ref(false);

// 固定日期变化时同步日期（日历页选中日期切换）
watch(
  () => props.fixedDate,
  (v) => {
    if (v) startCalendarDate.value = parseDateKey(v);
  }
);

const title = ref('');
const timeOpen = ref(false);
const categoryOpen = ref(false);
const recurrenceOpen = ref(false);
const reminderOpen = ref(false);

const form = ref({
  content: '',
  recurrence: 'none' as RecurrenceType,
  categoryId: '',
  reminder: 'none' as 'none' | '10m' | '30m' | '1h',
  important: false,
  matterId: ''
});

const categories = computed(() => props.categories);
const categoryMap = computed(() => new Map(categories.value.map(c => [c.id, c])));
// 可选择的分类：仅显示未隐藏的
const selectableCategories = computed(() => categories.value.filter(c => !c.hidden));

const recurrenceOptions = [
  { label: '不循环', value: 'none' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' }
];

const reminderOptions = [
  { label: '不提醒', value: 'none' },
  { label: '提前 10 分钟', value: '10m' },
  { label: '提前 30 分钟', value: '30m' },
  { label: '提前 1 小时', value: '1h' }
];

function formatDateTime(calDate: CalendarDate | null, hour: string, minute: string): string {
  if (!calDate) return '';
  return `${calDate.year}/${String(calDate.month).padStart(2, '0')}/${String(calDate.day).padStart(2, '0')} ${hour}:${minute}`;
}

function selectedTimeText(): string {
  return `${String(startCalendarDate.value.month).padStart(2, '0')}/${String(startCalendarDate.value.day).padStart(2, '0')} ${startHour.value}:${startMinute.value}`;
}

// 已选设置标签（chips）
const selectedChips = computed(() => {
  const chips: { key: string; label: string; style?: Record<string, string>; clear: () => void }[] = [];
  if (form.value.categoryId) {
    const cat = categoryMap.value.get(form.value.categoryId);
    if (cat) {
      chips.push({
        key: 'cat',
        label: cat.name,
        style: { backgroundColor: cat.color + '18', color: cat.color, borderColor: cat.color + '40' },
        clear: () => { form.value.categoryId = ''; }
      });
    }
  }
  if (hasCustomTime.value) {
    chips.push({
      key: 'time',
      label: selectedTimeText(),
      clear: clearTime
    });
  }
  if (form.value.recurrence !== 'none') {
    const label = recurrenceOptions.find(r => r.value === form.value.recurrence)?.label || form.value.recurrence;
    chips.push({ key: 'recur', label, clear: () => { form.value.recurrence = 'none'; } });
  }
  if (form.value.reminder !== 'none') {
    const label = reminderOptions.find(r => r.value === form.value.reminder)?.label || form.value.reminder;
    chips.push({ key: 'remind', label, clear: () => { form.value.reminder = 'none'; } });
  }
  if (form.value.important) {
    chips.push({ key: 'imp', label: '重点', style: { backgroundColor: '#ff9f0a18', color: '#ff9f0a', borderColor: '#ff9f0a40' }, clear: () => { form.value.important = false; } });
  }
  return chips;
});

function pickCategory(id: string) {
  form.value.categoryId = id;
  categoryOpen.value = false;
}

function pickRecurrence(v: RecurrenceType) {
  form.value.recurrence = v;
  recurrenceOpen.value = false;
}

function pickReminder(v: 'none' | '10m' | '30m' | '1h') {
  form.value.reminder = v;
  reminderOpen.value = false;
}

function clearTime() {
  hasCustomTime.value = false;
  const d = new Date();
  startCalendarDate.value = toCalendarDate(d);
  startHour.value = pad(d.getHours());
  startMinute.value = pad(Math.floor(d.getMinutes() / 5) * 5);
  timeOpen.value = false;
}

async function add() {
  const t = title.value.trim();
  if (!t) return;
  let startTime: string;
  if (props.fixedDate) {
    // 固定日期：仅用选中日期 + 时分
    startTime = new Date(
      startCalendarDate.value.year,
      startCalendarDate.value.month - 1,
      startCalendarDate.value.day,
      Number(startHour.value),
      Number(startMinute.value)
    ).toISOString();
  } else if (hasCustomTime.value) {
    startTime = new Date(
      startCalendarDate.value.year,
      startCalendarDate.value.month - 1,
      startCalendarDate.value.day,
      Number(startHour.value),
      Number(startMinute.value)
    ).toISOString();
  } else {
    // 未设置时间：用当前时刻
    const d = new Date();
    startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).toISOString();
  }

  await store.addSchedule({
    title: t,
    content: form.value.content,
    startTime,
    recurrence: form.value.recurrence,
    categoryId: form.value.categoryId,
    status: 'pending',
    reminder: form.value.reminder,
    important: form.value.important,
    matterId: form.value.matterId
  });
  title.value = '';
  // 设置保留，便于批量连续录入；时间重置为当前时刻
  clearTime();
}
</script>

<style scoped>
.quick-add {
  margin-top: 10px;
  margin-bottom: 0;
  flex-shrink: 0;
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

/* 已选设置标签 */
.quick-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--background);
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  flex-shrink: 0;
}

.quick-chip-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
}

.quick-chip-x:hover {
  opacity: 1;
}

/* 功能圆钮 */
.quick-round-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.quick-round-btn:hover {
  background: var(--panel-strong);
  color: var(--text);
}

.quick-round-btn.active {
  background: rgba(0, 122, 255, 0.12);
  color: var(--primary);
}

/* 弹窗内选项 */
.quick-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
}

.quick-opt:hover {
  background: var(--panel-strong);
}

.quick-opt.selected {
  background: rgba(0, 122, 255, 0.1);
  color: var(--primary);
  font-weight: 600;
}

.quick-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.quick-plain-link {
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 11px;
  cursor: pointer;
  margin-top: 4px;
  padding: 2px 4px;
}

.quick-plain-link:hover {
  color: var(--primary);
}
</style>
