<script setup lang="ts">
import { ref, watch } from 'vue';
import { useScheduleStore } from '@/stores/scheduleStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { platform } from '@/utils/platformAdapter';

// 12 种高档柔和预设色板
const presetColors = [
  '#007aff', // 晴空蓝
  '#34c759', // 薄荷绿
  '#ff9500', // 橙黄
  '#ff3b30', // 浆果红
  '#af52de', // 浅熏紫
  '#5856d6', // 靛蓝
  '#ff2d55', // 桃红
  '#4cd964', // 嫩绿
  '#5ac8fa', // 湖蓝
  '#ffcc00', // 金黄
  '#8e8e93', // 石墨灰
  '#1d1d1f'  // 极客黑
];

// 触发 saved 事件通知父组件
const emit = defineEmits<{
  (e: 'saved'): void;
}>();

const store = useScheduleStore();

const openState = ref(false);
const isSaving = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  name: '',
  color: '#007aff',
  note: ''
});

// 重置表单方法
function resetForm() {
  form.value = {
    name: '',
    color: '#007aff',
    note: ''
  };
  editingId.value = null;
  isSaving.value = false;
}

// 监听 openState，在任何被动关闭时自动触发重置方法以清空脏缓存
watch(openState, (newVal) => {
  if (!newVal) {
    resetForm();
  }
});

// 暴露 open(categoryId?: string) 方法
function open(categoryId?: string) {
  if (categoryId) {
    const category = store.categories.find(c => c.id === categoryId);
    if (category) {
      editingId.value = categoryId;
      // 进行深拷贝
      form.value = JSON.parse(JSON.stringify({
        name: category.name || '',
        color: category.color || '#007aff',
        note: category.note || ''
      }));
    } else {
      resetForm();
    }
  } else {
    resetForm();
  }
  openState.value = true;
}

// 导出方法以供父组件调用
defineExpose({
  open
});

// 提交保存分类
async function handleSave() {
  const trimmedName = form.value.name.trim();
  // 必填字段 name 在保存前进行非空校验，若为空则拦截保存
  if (!trimmedName) {
    return;
  }

  isSaving.value = true;
  try {
    if (editingId.value) {
      await store.updateCategory(editingId.value, {
        name: trimmedName,
        color: form.value.color,
        note: form.value.note
      });
    } else {
      await store.addCategory({
        name: trimmedName,
        color: form.value.color,
        note: form.value.note
      });
    }
    // 保存成功时触发 saved 信号
    emit('saved');
    openState.value = false;
  } catch (error: any) {
    console.error('Failed to save category:', error);
    await platform.showError('保存分类失败', error.message || String(error));
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="openState">
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{{ editingId ? '编辑分类' : '新增分类' }}</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleSave" class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="category-name" class="text-sm font-medium">
            分类名称 <span class="text-destructive">*</span>
          </Label>
          <Input
            id="category-name"
            v-model="form.name"
            placeholder="请输入分类名称"
            maxlength="20"
            required
            :disabled="isSaving"
          />
        </div>

        <div class="grid gap-2">
          <Label class="text-sm font-medium">背景颜色</Label>
          <div class="flex items-center gap-3">
            <Popover>
              <PopoverTrigger as-child>
                <Button 
                  type="button" 
                  variant="outline" 
                  class="w-[130px] h-9 justify-start gap-2 border border-input"
                  :disabled="isSaving"
                >
                  <span class="w-4 h-4 rounded-full border border-border" :style="{ backgroundColor: form.color }"></span>
                  <span class="text-xs font-normal text-muted-foreground">{{ form.color }}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-[220px] p-3 gap-3 flex flex-col" align="start">
                <span class="text-[10px] font-semibold text-muted-foreground/80">预设精美颜色</span>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="color in presetColors"
                    :key="color"
                    type="button"
                    class="w-8 h-8 rounded-full border border-border cursor-pointer transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                    :style="{ backgroundColor: color }"
                    @click="form.color = color"
                  ></button>
                </div>
                <div class="flex items-center justify-between border-t border-border pt-2 gap-2 mt-1">
                  <span class="text-[10px] text-muted-foreground">自定义色彩</span>
                  <input
                    type="color"
                    v-model="form.color"
                    class="w-8 h-6 p-0 border border-input rounded cursor-pointer"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="category-note" class="text-sm font-medium">备注</Label>
          <Input
            id="category-note"
            v-model="form.note"
            placeholder="请输入备注（选填）"
            maxlength="100"
            :disabled="isSaving"
          />
        </div>

        <DialogFooter class="mt-4">
          <Button
            type="button"
            variant="outline"
            :disabled="isSaving"
            @click="openState = false"
          >
            取消
          </Button>
          <Button
            type="submit"
            :disabled="isSaving || !form.name.trim()"
          >
            {{ isSaving ? '保存中...' : '保存' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
