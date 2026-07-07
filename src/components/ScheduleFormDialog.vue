<template>
  <Dialog v-model:open="openState">
    <DialogContent class="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-xl font-bold">{{ isEditing ? '编辑日程' : '新增日程' }}</DialogTitle>
        <DialogDescription class="sr-only">日程表单对话框，用于填写或编辑日程详情。</DialogDescription>
      </DialogHeader>

      <form class="dialog-form" @submit.prevent="saveSchedule">
        <label>
          标题
          <input v-model="form.title" type="text" required maxlength="60" style="width: 100%;" />
        </label>

        <label>
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

        <div class="form-grid">
          <label>
            开始时间
            <input v-model="form.startTime" type="datetime-local" required style="width: 100%;" />
          </label>
          <label>
            结束时间
            <input v-model="form.endTime" type="datetime-local" style="width: 100%;" />
          </label>
        </div>

        <div class="form-grid">
          <label>
            分类
            <select v-model="form.categoryId" style="width: 100%;">
              <option value="">未分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </label>
          <label>
            循环规则
            <select v-model="form.recurrence" style="width: 100%;">
              <option value="none">不循环</option>
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </label>
        </div>

        <div class="form-grid">
          <label>
            状态
            <select v-model="form.status" style="width: 100%;">
              <option value="pending">未开始</option>
              <option value="in-progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="delayed">已延期</option>
            </select>
          </label>
          <label>
            提醒
            <select v-model="form.reminder" style="width: 100%;">
              <option value="none">无</option>
              <option value="10m">提前 10 分钟</option>
              <option value="30m">提前 30 分钟</option>
              <option value="1h">提前 1 小时</option>
            </select>
          </label>
        </div>

        <div class="check-row flex items-center gap-2 mt-2">
          <Checkbox id="formImportant" v-model:checked="form.important" />
          <Label for="formImportant" class="text-xs font-normal cursor-pointer select-none text-foreground/80">标记为重点日程</Label>
        </div>

        <footer style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
          <button class="plain-button" type="button" @click="openState = false" style="border-radius: 999px;">取消</button>
          <button class="primary-button" type="submit" :disabled="isSaving" style="padding: 6px 20px;">
            {{ isSaving ? '保存中...' : '保存' }}
          </button>
        </footer>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { platform } from '../utils/platformAdapter';
import type { Category, Subtask, RecurrenceType, ScheduleStatus } from '../types';

defineProps<{
  categories: Category[];
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const store = useScheduleStore();

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
    
    // 打开编辑时执行 JSON.parse(JSON.stringify(item)) 深度拷贝数据
    const copiedItem = JSON.parse(JSON.stringify(item));
    
    // 时间转换：在 open 载入时将 ISO 时间字符串转换并格式化为前端 datetime-local 输入框所需的 YYYY-MM-DDTHH:mm 本地格式
    const startLocal = new Date(copiedItem.startTime).toLocaleString('sv').slice(0, 16).replace(' ', 'T');
    const endLocal = copiedItem.endTime 
      ? new Date(copiedItem.endTime).toLocaleString('sv').slice(0, 16).replace(' ', 'T')
      : '';
    
    form.value = {
      title: copiedItem.title,
      content: copiedItem.content || '',
      startTime: startLocal,
      endTime: endLocal,
      recurrence: copiedItem.recurrence || 'none',
      categoryId: copiedItem.categoryId || '',
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
  isEditing.value = false;
  editingId.value = null;
  
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
  // 必填字段 title 在保存前执行 .trim()
  const trimmedTitle = form.value.title.trim();
  if (!trimmedTitle) {
    await platform.showError("保存失败", "标题不能为空");
    return;
  }
  form.value.title = trimmedTitle;

  // 校验 startTime 必须早于 endTime，若无效则使用 platform.showError 报错拦截
  if (form.value.startTime && form.value.endTime) {
    const start = new Date(form.value.startTime);
    const end = new Date(form.value.endTime);
    if (start.getTime() >= end.getTime()) {
      await platform.showError("时间范围错误", "开始时间必须早于结束时间");
      return;
    }
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
    // 转换回 .toISOString() 标准 ISO 时间
    const startTimeISO = new Date(form.value.startTime).toISOString();
    const endTimeISO = form.value.endTime ? new Date(form.value.endTime).toISOString() : undefined;

    const payload = {
      title: form.value.title,
      content: form.value.content,
      startTime: startTimeISO,
      endTime: endTimeISO,
      recurrence: form.value.recurrence,
      categoryId: form.value.categoryId,
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
    // 保存报错时不清除数据供用户重试
    isSaving.value = false;
  }
}

defineExpose({
  open
});
</script>
