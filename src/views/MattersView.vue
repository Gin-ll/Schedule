<template>
  <div class="page active">
    <header class="page-header">
      <button class="primary-button header-add-btn" style="margin-left: auto;" @click="openAddDialog" type="button">
        <Icon icon="lucide:plus" width="16" height="16" />
        新增事项
      </button>
    </header>

    <!-- 顶部状态切换 Tabs -->
    <div class="flex items-center gap-2 mb-6 border-b border-border pb-px w-full">
      <button 
        type="button" 
        class="px-4 py-2 text-sm font-semibold transition-colors relative"
        :class="statusTab === 'active' ? 'text-primary border-b-2 border-primary font-bold' : 'text-muted-foreground hover:text-foreground'"
        @click="statusTab = 'active'"
      >
        进行中 ({{ activeMatters.length }})
      </button>
      <button 
        type="button" 
        class="px-4 py-2 text-sm font-semibold transition-colors relative"
        :class="statusTab === 'completed' ? 'text-primary border-b-2 border-primary font-bold' : 'text-muted-foreground hover:text-foreground'"
        @click="statusTab = 'completed'"
      >
        已归档/已完成 ({{ completedMatters.length }})
      </button>
    </div>

    <!-- 事项列表 -->
    <div class="category-list" v-if="displayMatters.length > 0">
      <article v-for="matter in displayMatters" :key="matter.id" class="category-card flex justify-between items-start gap-4 p-5">
        <div class="flex-1">
          <div class="flex items-center gap-2.5 mb-2">
            <span class="text-2xl select-none">{{ matter.icon || '📌' }}</span>
            <h3 class="font-bold text-base m-0 text-foreground">{{ matter.name }}</h3>
            <span 
              class="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
              :style="{ backgroundColor: matter.color + '15', color: matter.color, borderColor: matter.color + '30' }"
            >
              {{ matter.status === 'active' ? '进行中' : '已完成' }}
            </span>
          </div>
          
          <p class="text-xs text-muted-foreground leading-relaxed mb-4" v-if="matter.description">{{ matter.description }}</p>
          <p class="text-xs text-muted-foreground/60 italic leading-relaxed mb-4" v-else>无描述</p>
          
          <!-- 统计与进度条 -->
          <div class="flex flex-col gap-2 mt-2 max-w-md">
            <div class="flex justify-between text-xs text-muted-foreground font-medium">
              <span class="flex items-center gap-3">
                <span>总任务: <strong>{{ getStats(matter.id).total }}</strong></span>
                <span>已完成: <strong>{{ getStats(matter.id).completed }}</strong></span>
                <span :class="{ 'text-destructive font-bold': getStats(matter.id).overdue > 0 }">
                  已逾期: {{ getStats(matter.id).overdue }}
                </span>
              </span>
              <span class="font-semibold">{{ getStats(matter.id).rate }}%</span>
            </div>
            <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300" :style="{ width: getStats(matter.id).rate + '%', backgroundColor: matter.color }"></div>
            </div>
          </div>
        </div>

        <div class="card-actions flex gap-2">
          <button v-if="matter.status === 'active'" class="action-icon-btn" type="button" @click="confirmComplete(matter.id)" title="标记完成">
            <Icon icon="lucide:check-circle" width="16" height="16" style="color: var(--primary);" />
          </button>
          <button v-else class="action-icon-btn" type="button" @click="restoreMatter(matter.id)" title="重新激活">
            <Icon icon="lucide:rotate-ccw" width="16" height="16" />
          </button>
          <button class="action-icon-btn" type="button" @click="openEditDialog(matter)" title="编辑">
            <Icon icon="lucide:edit-3" width="16" height="16" />
          </button>
          <button class="action-icon-btn danger" type="button" @click="deleteMatter(matter.id)" title="删除">
            <Icon icon="lucide:trash-2" width="16" height="16" />
          </button>
        </div>
      </article>
    </div>
    <div v-else class="empty-state flex-1">
      <Icon icon="lucide:briefcase" class="empty-icon" />
      <span>暂无事项</span>
    </div>

    <!-- 新增/编辑事项弹窗 -->
    <Dialog v-model:open="showMatterDialog">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">{{ isEditing ? '编辑事项' : '新建事项' }}</DialogTitle>
          <DialogDescription class="sr-only">填写事项的基本属性</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="matter-view-name" style="color: var(--text);">名称</Label>
            <Input id="matter-view-name" v-model="matterForm.name" placeholder="输入事项名称..." style="color: var(--text);" />
          </div>
          <div class="grid gap-2">
            <Label style="color: var(--text);">描述</Label>
            <Textarea v-model="matterForm.description" placeholder="关于事项的备注描述..." rows="2" style="color: var(--text);" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label style="color: var(--text);">主题颜色</Label>
              <select v-model="matterForm.color" class="h-9 border border-input rounded-lg bg-popover px-2.5 text-sm" style="color: var(--text); background: var(--background);">
                <option value="#3b82f6">蓝色</option>
                <option value="#10b981">绿色</option>
                <option value="#f59e0b">黄色</option>
                <option value="#ef4444">红色</option>
                <option value="#8b5cf6">紫色</option>
                <option value="#ec4899">粉色</option>
              </select>
            </div>
            <div class="grid gap-2">
              <Label style="color: var(--text);">展示图标</Label>
              <select v-model="matterForm.icon" class="h-9 border border-input rounded-lg bg-popover px-2.5 text-sm" style="color: var(--text); background: var(--background);">
                <option value="📌">📌 钉子</option>
                <option value="🏠">🏠 房子</option>
                <option value="✈">✈ 飞机</option>
                <option value="📖">📖 书本</option>
                <option value="💪">💪 健身</option>
                <option value="💼">💼 工作</option>
              </select>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showMatterDialog = false">取消</Button>
          <Button @click="saveMatter">保存</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 删除确认弹窗 -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">删除确认</DialogTitle>
          <DialogDescription style="color: var(--muted-foreground);">
            确认要删除该事项吗？删除后属于该事项的日程将变为未关联项目状态。此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <div class="flex justify-end gap-2 mt-4">
          <Button variant="outline" @click="showDeleteConfirm = false">取消</Button>
          <Button variant="destructive" @click="executeDeleteMatter">删除</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Matter } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { confirm } from '@tauri-apps/plugin-dialog';

export default defineComponent({
  name: 'MattersView',
  components: {
    Icon,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    Button,
    Label,
    Input,
    Textarea
  },
  setup() {
    const store = useScheduleStore();

    // 选项卡状态
    const statusTab = ref<'active' | 'completed'>('active');

    // 弹窗状态
    const showMatterDialog = ref(false);
    const showDeleteConfirm = ref(false);
    const isEditing = ref(false);
    const editingMatterId = ref<string | null>(null);
    const matterIdToDelete = ref('');

    // 表单状态
    const matterForm = ref({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: '📌'
    });

    const activeMatters = computed(() => store.matters.filter(m => m.status === 'active'));
    const completedMatters = computed(() => store.matters.filter(m => m.status === 'completed'));
    
    const displayMatters = computed(() => {
      return statusTab.value === 'active' ? activeMatters.value : completedMatters.value;
    });

    function getStats(matterId: string) {
      const matchedSchedules = store.schedules.filter(s => s.matterId === matterId);
      const total = matchedSchedules.length;
      const completed = matchedSchedules.filter(s => s.status === 'completed').length;

      const now = new Date();
      const overdue = matchedSchedules.filter(s => {
        if (s.status === 'completed') return false;
        if (s.status === 'delayed') return true;
        const endTime = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
        return endTime < now;
      }).length;

      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

      return {
        total,
        completed,
        overdue,
        rate
      };
    }

    function openAddDialog() {
      isEditing.value = false;
      editingMatterId.value = null;
      matterForm.value = {
        name: '',
        description: '',
        color: '#3b82f6',
        icon: '📌'
      };
      showMatterDialog.value = true;
    }

    function openEditDialog(matter: Matter) {
      isEditing.value = true;
      editingMatterId.value = matter.id;
      matterForm.value = {
        name: matter.name,
        description: matter.description || '',
        color: matter.color,
        icon: matter.icon || '📌'
      };
      showMatterDialog.value = true;
    }

    async function saveMatter() {
      const name = matterForm.value.name.trim();
      if (!name) {
        await platform.showError("表单错误", "项目名称不能为空");
        return;
      }
      try {
        if (isEditing.value && editingMatterId.value) {
          await store.updateMatter(editingMatterId.value, {
            name,
            description: matterForm.value.description,
            color: matterForm.value.color,
            icon: matterForm.value.icon
          });
        } else {
          await store.addMatter({
            name,
            description: matterForm.value.description,
            color: matterForm.value.color,
            icon: matterForm.value.icon
          });
        }
        showMatterDialog.value = false;
      } catch (e: any) {
        console.error(e);
        await platform.showError("保存失败", e.message || String(e));
      }
    }

    async function confirmComplete(id: string) {
      const ok = await confirm(
        '确认将此事项标记为已完成？\n\n标记完成后：\n✓ 该事项将被归档并默认在创建日程时隐藏\n✓ 已有日程关联不会受到影响\n✓ 可随时在已归档列表中恢复激活',
        { title: '标记事项完成', kind: 'warning' }
      );
      if (ok) {
        try {
          await store.completeMatter(id);

          // 关联日程自动联动完成提示
          const pendingCount = store.schedules.filter(s => s.matterId === id && s.status !== 'completed').length;
          if (pendingCount > 0) {
            const completeAll = await confirm(
              `该事项下仍有 ${pendingCount} 个未完成日程。\n是否将它们一并批量设为“已完成”？`,
              { title: '批量完成任务', kind: 'info' }
            );
            if (completeAll) {
              await store.completeSchedulesByMatter(id);
            }
          }
        } catch (e: any) {
          console.error(e);
          await platform.showError("操作失败", e.message || String(e));
        }
      }
    }

    async function restoreMatter(id: string) {
      try {
        await store.restoreMatter(id);
      } catch (e: any) {
        console.error(e);
        await platform.showError("恢复事项失败", e.message || String(e));
      }
    }

    function deleteMatter(id: string) {
      matterIdToDelete.value = id;
      showDeleteConfirm.value = true;
    }

    async function executeDeleteMatter() {
      if (matterIdToDelete.value) {
        try {
          await store.deleteMatter(matterIdToDelete.value);
        } catch (error: any) {
          console.error("Failed to delete matter:", error);
          await platform.showError("删除失败", error.message || String(error));
        } finally {
          showDeleteConfirm.value = false;
          matterIdToDelete.value = '';
        }
      }
    }

    return {
      statusTab,
      showMatterDialog,
      showDeleteConfirm,
      isEditing,
      matterForm,
      activeMatters,
      completedMatters,
      displayMatters,
      getStats,
      openAddDialog,
      openEditDialog,
      saveMatter,
      confirmComplete,
      restoreMatter,
      deleteMatter,
      executeDeleteMatter
    };
  }
});
</script>
