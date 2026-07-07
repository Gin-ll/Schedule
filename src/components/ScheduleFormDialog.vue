<template>
  <Dialog v-model:open="openState">
    <DialogContent class="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-xl font-bold">{{ isEditing ? '编辑日程' : '新增日程' }}</DialogTitle>
        <DialogDescription class="sr-only">日程表单对话框，用于填写或编辑日程详情。</DialogDescription>
      </DialogHeader>

      <form class="dialog-form" @submit.prevent="saveSchedule">
        <div class="grid gap-2">
          <Label class="text-xs font-semibold text-foreground/70">标题 <span class="text-destructive">*</span></Label>
          <Input v-model="form.title" type="text" required placeholder="请输入日程标题" maxlength="60" />
        </div>

        <div class="grid gap-2">
          <Label class="text-xs font-semibold text-foreground/70">内容</Label>
          <Textarea v-model="form.content" placeholder="输入日程备注内容" rows="3" maxlength="300" />
        </div>

        <!-- 子任务容器 -->
        <div class="dialog-subtasks-container grid gap-2">
          <Label class="text-xs font-semibold text-foreground/70">子任务</Label>
          <div class="dialog-subtask-list max-h-[120px] overflow-y-auto border border-input rounded-md p-2 gap-1.5 flex flex-col empty:hidden">
            <div v-for="(st, index) in form.subtasks" :key="st.id" class="dialog-subtask-row flex items-center justify-between bg-muted/30 px-2 py-1.5 rounded-sm">
              <span class="text-sm truncate mr-2">{{ st.title }}</span>
              <Button type="button" variant="ghost" size="xs" class="h-6 text-destructive hover:bg-destructive/10" @click="removeSubtask(index)">删除</Button>
            </div>
          </div>
          <div class="dialog-subtask-input-row flex gap-2">
            <Input type="text" v-model="newSubtaskTitle" placeholder="输入子任务内容" maxlength="60" class="flex-1" />
            <Button type="button" variant="secondary" @click="addSubtask">添加</Button>
          </div>
        </div>

        <div class="form-grid">
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-foreground/70">开始时间 *</span>
            <Popover>
              <PopoverTrigger as-child>
                <Button variant="outline" class="w-full justify-start text-left font-normal h-9">
                  <Icon icon="lucide:calendar" class="mr-2 h-4 w-4 text-foreground/60" />
                  {{ formatDateTime(startCalendarDate, startHour, startMinute) }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar v-model="startCalendarDate" class="rounded-t-md" />
                <div class="flex items-center justify-between border-t border-border p-3 gap-3 bg-muted/10">
                  <span class="text-xs font-semibold text-muted-foreground">具体时间</span>
                  <div class="flex items-center gap-1.5">
                    <Select v-model="startHour">
                      <SelectTrigger class="w-[60px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="h in hoursList" :key="h" :value="h">{{ h }}</SelectItem>
                      </SelectContent>
                    </Select>
                    <span class="text-xs">:</span>
                    <Select v-model="startMinute">
                      <SelectTrigger class="w-[60px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="m in minutesList" :key="m" :value="m">{{ m }}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-foreground/70">结束时间</span>
              <button type="button" @click="hasEndTime = !hasEndTime" class="text-[10px] text-primary underline cursor-pointer select-none">
                {{ hasEndTime ? '清除结束时间' : '设定结束时间' }}
              </button>
            </div>
            <Popover v-if="hasEndTime">
              <PopoverTrigger as-child>
                <Button variant="outline" class="w-full justify-start text-left font-normal h-9">
                  <Icon icon="lucide:calendar" class="mr-2 h-4 w-4 text-foreground/60" />
                  {{ formatDateTime(endCalendarDate, endHour, endMinute) }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar v-model="endCalendarDate" class="rounded-t-md" />
                <div class="flex items-center justify-between border-t border-border p-3 gap-3 bg-muted/10">
                  <span class="text-xs font-semibold text-muted-foreground">具体时间</span>
                  <div class="flex items-center gap-1.5">
                    <Select v-model="endHour">
                      <SelectTrigger class="w-[60px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="h in hoursList" :key="h" :value="h">{{ h }}</SelectItem>
                      </SelectContent>
                    </Select>
                    <span class="text-xs">:</span>
                    <Select v-model="endMinute">
                      <SelectTrigger class="w-[60px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="m in minutesList" :key="m" :value="m">{{ m }}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button v-else variant="ghost" disabled class="w-full justify-start text-left text-muted-foreground/60 h-9 font-normal border border-dashed border-input">
              无结束时间
            </Button>
          </div>
        </div>         <input v-model="form.endTime" type="datetime-local" style="width: 100%;" />
          </label>
        </div>

        <div class="form-grid">
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-foreground/70">分类</span>
            <Select v-model="form.categoryId">
              <SelectTrigger style="width: 100%;">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">未分类</SelectItem>
                <SelectItem v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-foreground/70">循环规则</span>
            <Select v-model="form.recurrence">
              <SelectTrigger style="width: 100%;">
                <SelectValue placeholder="选择循环规则" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不循环</SelectItem>
                <SelectItem value="daily">每天</SelectItem>
                <SelectItem value="weekly">每周</SelectItem>
                <SelectItem value="monthly">每月</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="form-grid">
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-foreground/70">状态</span>
            <Select v-model="form.status">
              <SelectTrigger style="width: 100%;">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">未开始</SelectItem>
                <SelectItem value="in-progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="delayed">已延期</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold text-foreground/70">提醒</span>
            <Select v-model="form.reminder">
              <SelectTrigger style="width: 100%;">
                <SelectValue placeholder="选择提醒" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                <SelectItem value="10m">提前 10 分钟</SelectItem>
                <SelectItem value="30m">提前 30 分钟</SelectItem>
                <SelectItem value="1h">提前 1 小时</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="check-row flex items-center gap-2 mt-2">
          <Checkbox id="formImportant" v-model:checked="form.important" />
          <Label for="formImportant" class="text-xs font-normal cursor-pointer select-none text-foreground/80">标记为重点日程</Label>
        </div>

        <footer class="flex justify-end gap-2 mt-6 border-t border-border pt-4">
          <Button type="button" variant="outline" @click="openState = false">
            取消
          </Button>
          <Button type="submit" :disabled="isSaving">
            {{ isSaving ? '保存中...' : '保存' }}
          </Button>
        </footer>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDate } from '@internationalized/date';
import { Icon } from '@iconify/vue';

import { ref, watch } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { platform } from '../utils/platformAdapter';
import type { Category, Subtask, RecurrenceType, ScheduleStatus } from '../types';

defineProps<{
  categories: Category[];
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const store = useScheduleStore();

// 预设选项定义
const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutesList = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

// 组合时间选择器的状态定义
const startCalendarDate = ref<any>(new CalendarDate(2026, 7, 7));
const startHour = ref('12');
const startMinute = ref('00');

const hasEndTime = ref(false);
const endCalendarDate = ref<any>(new CalendarDate(2026, 7, 7));
const endHour = ref('13');
const endMinute = ref('00');

// 工具函数：格式化展示时间文本
function formatDateTime(calDate: CalendarDate | null, hour: string, minute: string): string {
  if (!calDate) return '';
  return `${calDate.year}/${String(calDate.month).padStart(2, '0')}/${String(calDate.day).padStart(2, '0')} ${hour}:${minute}`;
}

const openState = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const newSubtaskTitle = ref('');
const isSaving = ref(false);

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

function resetForm() {
  form.value = {
    title: '',
    content: '',
    startTime: '',
    endTime: '',
    recurrence: 'none',
    categoryId: '',
    status: 'pending',
    reminder: 'none',
    important: false,
    subtasks: []
  };
  newSubtaskTitle.value = '';
  isEditing.value = false;
  editingId.value = null;
  isSaving.value = false;
}

// 监听 openState：在 Dialog 被动关闭时触发 resetForm
watch(openState, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});

async function open(scheduleId?: string) {
  if (scheduleId) {
    const item = store.schedules.find(s => s.id === scheduleId);
    if (!item) {
      await platform.showError("错误", "未找到该日程数据");
      return;
    }
    
    openState.value = true;
    isEditing.value = true;
    editingId.value = scheduleId;
    
    // 深度拷贝数据
    const copiedItem = JSON.parse(JSON.stringify(item));
    
    // 时间转换与格式化
    const startDate = new Date(copiedItem.startTime);
    startCalendarDate.value = new CalendarDate(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
    startHour.value = String(startDate.getHours()).padStart(2, '0');
    startMinute.value = String(Math.floor(startDate.getMinutes() / 5) * 5).padStart(2, '0');
    
    if (copiedItem.endTime) {
      hasEndTime.value = true;
      const endDate = new Date(copiedItem.endTime);
      endCalendarDate.value = new CalendarDate(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate());
      endHour.value = String(endDate.getHours()).padStart(2, '0');
      endMinute.value = String(Math.floor(endDate.getMinutes() / 5) * 5).padStart(2, '0');
    } else {
      hasEndTime.value = false;
    }
    
    form.value = {
      title: copiedItem.title,
      content: copiedItem.content || '',
      startTime: copiedItem.startTime,
      endTime: copiedItem.endTime || '',
      recurrence: copiedItem.recurrence || 'none',
      categoryId: copiedItem.categoryId || '__none',
      status: copiedItem.status || 'pending',
      reminder: copiedItem.reminder || 'none',
      important: copiedItem.important === 1 || copiedItem.important === true,
      subtasks: copiedItem.subtasks || []
    };
  } else {
    openState.value = true;
    setupNewSchedule();
  }
}

function setupNewSchedule() {
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  startCalendarDate.value = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  startHour.value = String(now.getHours()).padStart(2, '0');
  startMinute.value = '00';
  
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  endCalendarDate.value = new CalendarDate(end.getFullYear(), end.getMonth() + 1, end.getDate());
  endHour.value = String(end.getHours()).padStart(2, '0');
  endMinute.value = '00';
  hasEndTime.value = true;
  
  form.value = {
    title: '',
    content: '',
    startTime: now.toISOString(),
    endTime: end.toISOString(),
    recurrence: 'none',
    categoryId: '__none',
    status: 'pending',
    reminder: 'none',
    important: false,
    subtasks: []
  };
}

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

async function saveSchedule() {
  // 组装 ISO 时间字符串
  const startYear = startCalendarDate.value.year;
  const startMonth = startCalendarDate.value.month - 1;
  const startDay = startCalendarDate.value.day;
  const startDate = new Date(startYear, startMonth, startDay, Number(startHour.value), Number(startMinute.value));
  const startTimeISO = startDate.toISOString();
  
  let endTimeISO = undefined;
  if (hasEndTime.value && endCalendarDate.value) {
    const endYear = endCalendarDate.value.year;
    const endMonth = endCalendarDate.value.month - 1;
    const endDay = endCalendarDate.value.day;
    const endDate = new Date(endYear, endMonth, endDay, Number(endHour.value), Number(endMinute.value));
    
    // 校验 startTime 必须早于 endTime
    if (startDate.getTime() >= endDate.getTime()) {
      await platform.showError("时间范围错误", "开始时间必须早于结束时间");
      return;
    }
    endTimeISO = endDate.toISOString();
  }

  // 过滤空子任务及重复名称子任务
  const seenTitles = new Set<string>();
  const filteredSubtasks: Subtask[] = [];
  for (const st of form.value.subtasks) {
    const trimmedSubTitle = st.title.trim();
    if (trimmedSubTitle && !seenTitles.has(trimmedSubTitle)) {
      seenTitles.add(trimmedSubTitle);
      filteredSubtasks.push({
        ...st,
        title: trimmedSubTitle
      });
    }
  }

  isSaving.value = true;

  try {
    const payload = {
      title: form.value.title,
      content: form.value.content,
      startTime: startTimeISO,
      endTime: endTimeISO,
      recurrence: form.value.recurrence,
      categoryId: form.value.categoryId === '__none' ? '' : form.value.categoryId,
      status: form.value.status,
      reminder: form.value.reminder,
      important: form.value.important,
      subtasks: filteredSubtasks
    };

    if (isEditing.value && editingId.value) {
      await store.updateSchedule(editingId.value, payload);
    } else {
      await store.addSchedule(payload);
    }
    
    emit('saved');
    openState.value = false;
  } catch (error: any) {
    console.error("Failed to save schedule:", error);
    await platform.showError("保存日程失败", error.message || String(error));
    isSaving.value = false;
  }
}

defineExpose({
  open
});
</script>
