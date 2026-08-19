<template>
  <div class="page active">
    <!-- 列表视图 -->
    <div class="content-panel active list-layout-with-sidebar">
      <aside class="smart-sidebar">
        <ul class="smart-list-filters">
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'today' }" @click="selectListFilter('today')">
            <Icon icon="lucide:clock" width="16" height="16" />
            今天
            <span class="count-badge">{{ counts.today }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'tomorrow' }" @click="selectListFilter('tomorrow')">
            <Icon icon="lucide:home" width="16" height="16" />
            明天
            <span class="count-badge">{{ counts.tomorrow }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'next7days' }" @click="selectListFilter('next7days')">
            <Icon icon="lucide:zap" width="16" height="16" />
            未来 7 天
            <span class="count-badge">{{ counts.next7days }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'all' }" @click="selectListFilter('all')">
            <Icon icon="lucide:calendar-days" width="16" height="16" />
            全部日程
            <span class="count-badge">{{ counts.all }}</span>
          </li>
          <div class="sidebar-divider"></div>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'overdue' }" @click="selectListFilter('overdue')">
            <Icon icon="lucide:alert-triangle" width="16" height="16" style="color: #ff3b30;" />
            已逾期
            <span class="count-badge" style="background-color: rgba(255, 59, 48, 0.1); color: #ff3b30;">{{ counts.overdue }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'time' && listFilter === 'completed' }" @click="selectListFilter('completed')">
            <Icon icon="lucide:check-check" width="16" height="16" style="color: #34c759;" />
            已完成
            <span class="count-badge" style="background-color: rgba(52, 199, 89, 0.1); color: #34c759;">{{ counts.completed }}</span>
          </li>
        </ul>
        <div class="sidebar-divider"></div>
        <ul class="smart-list-filters">
          <li v-for="cat in visibleCategories" :key="cat.id" :class="{ active: activeFilterSection === 'category' && categoryFilter === cat.id }" @click="selectCategoryFilter(cat.id)">
            <span class="category-dot" :style="{ backgroundColor: cat.color }"></span>
            <span class="truncate flex-1">{{ cat.name }}</span>
            <span class="count-badge">{{ getCategoryCount(cat.id) }}</span>
          </li>
          <li :class="{ active: activeFilterSection === 'category' && categoryFilter === '' }" @click="selectCategoryFilter('')">
            <span class="category-dot" style="background-color: #8E8E93;"></span>
            <span class="truncate flex-1">未分类</span>
            <span class="count-badge">{{ getCategoryCount('') }}</span>
          </li>
        </ul>
        <!-- 事项筛选（事项功能暂时注释）
        <div class="sidebar-divider"></div>
        <div class="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">事项</div>
        <ul class="smart-list-filters">
          <li v-for="mat in activeMatters" :key="mat.id" :class="{ active: activeFilterSection === 'matter' && matterFilter === mat.id }" @click="selectMatterFilter(mat.id)">
            <span class="mr-1.5">{{ mat.icon || '📌' }}</span>
            <span class="truncate flex-1">{{ mat.name }}</span>
            <span class="count-badge">{{ getMatterCount(mat.id) }}</span>
          </li>
          
          <details v-if="completedMatters.length > 0" class="w-full text-xs group" style="margin: 2px 0;">
            <summary class="px-3 py-2 text-[11px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none outline-none flex items-center gap-1">
              <Icon icon="lucide:chevron-right" class="h-3 w-3 transition-transform group-open:rotate-90" />
              已完成事项 ({{ completedMatters.length }})
            </summary>
            <ul class="smart-list-filters pl-2">
              <li v-for="mat in completedMatters" :key="mat.id" :class="{ active: activeFilterSection === 'matter' && matterFilter === mat.id }" @click="selectMatterFilter(mat.id)">
                <span class="mr-1.5 opacity-60">{{ mat.icon || '📌' }}</span>
                <span class="truncate flex-1 line-through text-muted-foreground">{{ mat.name }}</span>
                <span class="count-badge">{{ getMatterCount(mat.id) }}</span>
              </li>
            </ul>
          </details>

          <li class="justify-center border border-dashed border-border text-xs text-muted-foreground hover:text-foreground mt-2 py-1.5 rounded-lg cursor-pointer" @click="openCreateMatterDialog">
            <Icon icon="lucide:plus" class="mr-1 h-3.5 w-3.5" />
            新建事项
          </li>
        </ul>
        -->
      </aside>
      <div class="schedule-list-container" style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
        <!-- 可滚动列表区 -->
        <div class="schedule-scroll" style="flex: 1; min-height: 0; overflow-y: auto;">
        <!-- 事项详情进度面板（事项功能暂时注释）
        <div v-if="activeFilterSection === 'matter' && currentMatter" class="mb-5 p-4 border border-border rounded-lg bg-card/30 flex flex-col gap-3.5">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-2xl">{{ currentMatter.icon || '📌' }}</span>
              <h3 class="text-lg font-bold text-foreground">{{ currentMatter.name }}</h3>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold border" :style="{ backgroundColor: currentMatter.color + '15', color: currentMatter.color, borderColor: currentMatter.color + '30' }">
                {{ currentMatter.status === 'active' ? '进行中' : '已完成' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Button size="xs" variant="outline" @click="openEditMatterDialog(currentMatter)">编辑</Button>
              <Button v-if="currentMatter.status === 'active'" size="xs" variant="secondary" @click="confirmCompleteMatter(currentMatter.id)">标记完成</Button>
              <Button v-else size="xs" variant="secondary" @click="restoreMatter(currentMatter.id)">重新开始</Button>
            </div>
          </div>
          <p v-if="currentMatter.description" class="text-xs text-muted-foreground leading-relaxed -mt-1">{{ currentMatter.description }}</p>
          
          进度条
          <div class="flex flex-col gap-2 mt-1">
            <div class="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>{{ completedCountOfMatter }} / {{ totalCountOfMatter }} 已完成</span>
              <span>{{ progressPercentOfMatter }}%</span>
            </div>
            <div class="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300" :style="{ width: progressPercentOfMatter + '%', backgroundColor: currentMatter.color }"></div>
            </div>
          </div>
        </div>
        -->

        <div class="schedule-list" v-if="visibleSchedules.length > 0" style="display: flex; flex-direction: column; gap: 0;">
          <!-- 未完成日程区块 -->
          <div v-if="pendingSchedules.length > 0" style="display: flex; flex-direction: column; margin-bottom: 16px;">
            <div class="section-toggle-header" @click="isPendingExpanded = !isPendingExpanded" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; margin-bottom: 12px; transition: color 0.2s;">
              <Icon :icon="isPendingExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" width="16" height="16" />
              <span style="font-size: 13px; font-weight: 600; tracking: 0.05em;">未完成</span>
              <span class="count-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 9999px; background: var(--border); color: var(--text); font-weight: bold; line-height: 1;">{{ pendingSchedules.length }}</span>
              <div class="divider-line" style="flex-grow: 1; border-top: 1px dashed var(--border); margin-left: 8px; opacity: 0.6; transition: opacity 0.2s;"></div>
            </div>
            
            <div v-show="isPendingExpanded" style="display: flex; flex-direction: column; gap: 12px;">
              <article v-for="schedule in pendingSchedules" :key="schedule.id" class="schedule-card">
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
            </div>
          </div>

          <!-- 已完成日程区块 -->
          <div v-if="completedSchedules.length > 0" style="display: flex; flex-direction: column; margin-top: 8px;">
            <div class="section-toggle-header" @click="isCompletedExpanded = !isCompletedExpanded" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; margin-bottom: 12px; transition: color 0.2s;">
              <Icon :icon="isCompletedExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" width="16" height="16" />
              <span style="font-size: 13px; font-weight: 600; tracking: 0.05em;">已完成</span>
              <span class="count-badge" style="font-size: 11px; padding: 2px 6px; border-radius: 9999px; background: var(--border); color: var(--text); font-weight: bold; line-height: 1;">{{ completedSchedules.length }}</span>
              <div class="divider-line" style="flex-grow: 1; border-top: 1px dashed var(--border); margin-left: 8px; opacity: 0.6; transition: opacity 0.2s;"></div>
            </div>
            
            <div v-show="isCompletedExpanded" style="display: flex; flex-direction: column; gap: 12px;">
              <article v-for="schedule in completedSchedules" :key="schedule.id" class="schedule-card" style="opacity: 0.8;">
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
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="flex: 1; min-height: 100%;">
          <Icon icon="lucide:calendar-x" class="empty-icon" />
          <span>暂无日程</span>
        </div>
        </div>

        <!-- 底部快速添加栏（回车创建） -->
        <div class="quick-add-footer">
          <QuickAddBar :categories="categories" />
        </div>
      </div>
    </div>

    <!-- 表单 Dialog -->
    <ScheduleFormDialog ref="scheduleFormDialogRef" :categories="categories" />

    <!-- 新增/编辑事项弹窗（事项功能暂时注释）
    <Dialog v-model:open="showMatterDialog">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle style="color: var(--text);">{{ isEditingMatter ? '编辑事项' : '新建事项' }}</DialogTitle>
          <DialogDescription class="sr-only">填写事项的基本属性</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="matter-name" style="color: var(--text);">名称</Label>
            <Input id="matter-name" v-model="matterForm.name" placeholder="输入事项名称..." style="color: var(--text);" />
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
    -->

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
import { defineComponent, ref, computed } from 'vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { Schedule, Category, Matter } from '../types';
import { Icon } from '@iconify/vue';
import { platform } from '../utils/platformAdapter';
import ScheduleFormDialog from '../components/ScheduleFormDialog.vue';
import QuickAddBar from '../components/QuickAddBar.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { confirm } from '@tauri-apps/plugin-dialog';

export default defineComponent({
  name: 'SchedulesView',
  components: {
    Icon,
    ScheduleFormDialog,
    QuickAddBar,
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

    // 基础视图状态
    const searchQuery = ref('');
    const listFilter = ref<'today' | 'tomorrow' | 'next7days' | 'completed' | 'overdue' | 'all'>('today');
    const categoryFilter = ref<string>('all');
    const matterFilter = ref<string>('all');
    const activeFilterSection = ref<'time' | 'category' | 'matter'>('time');

    // 删除弹窗状态
    const showDeleteConfirm = ref(false);
    const scheduleIdToDelete = ref('');

    // 事项弹窗及表单状态
    const showMatterDialog = ref(false);
    const isEditingMatter = ref(false);
    const editingMatterId = ref<string | null>(null);
    const matterForm = ref({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: '📌'
    });

    // 表单子组件 Ref
    const scheduleFormDialogRef = ref<InstanceType<typeof ScheduleFormDialog> | null>(null);

    const categories = computed(() => store.categories);
    // 侧边栏分类筛选项：仅显示未隐藏的分类
    const visibleCategories = computed(() => store.categories.filter(c => !c.hidden));

    // 互斥的过滤操作函数
    const selectListFilter = (filter: 'today' | 'tomorrow' | 'next7days' | 'completed' | 'overdue' | 'all') => {
      listFilter.value = filter;
      categoryFilter.value = 'all';
      activeFilterSection.value = 'time';
    };

    const selectCategoryFilter = (catId: string) => {
      categoryFilter.value = catId;
      listFilter.value = 'all';
      matterFilter.value = 'all';
      activeFilterSection.value = 'category';
    };

    const selectMatterFilter = (matId: string) => {
      matterFilter.value = matId;
      listFilter.value = 'all';
      categoryFilter.value = 'all';
      activeFilterSection.value = 'matter';
    };

    const activeMatters = computed(() => store.matters.filter(m => m.status === 'active'));
    const completedMatters = computed(() => store.matters.filter(m => m.status === 'completed'));
    const currentMatter = computed(() => store.matters.find(m => m.id === matterFilter.value));

    function getMatterCount(matId: string): number {
      return store.schedules.filter(s => s.matterId === matId).length;
    }

    const totalCountOfMatter = computed(() => {
      if (!matterFilter.value || matterFilter.value === 'all') return 0;
      return store.schedules.filter(s => s.matterId === matterFilter.value).length;
    });

    const completedCountOfMatter = computed(() => {
      if (!matterFilter.value || matterFilter.value === 'all') return 0;
      return store.schedules.filter(s => s.matterId === matterFilter.value && s.status === 'completed').length;
    });

    const progressPercentOfMatter = computed(() => {
      if (totalCountOfMatter.value === 0) return 0;
      return Math.round((completedCountOfMatter.value / totalCountOfMatter.value) * 100);
    });

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
      let completedCount = 0;
      let overdueCount = 0;

      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);

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
        if (schedule.status === 'completed') {
          completedCount++;
        } else {
          if (end < startOfToday) {
            overdueCount++;
          }
        }
      });

      return {
        today: todayCount,
        tomorrow: tomorrowCount,
        next7days: next7Count,
        completed: completedCount,
        overdue: overdueCount,
        all: store.schedules.length,
        catAll: store.schedules.length
      };
    });

    function getCategoryCount(catId: string): number {
      return store.schedules.filter(s => (s.categoryId || '') === catId).length;
    }

    // 分类样式和属性获取（含回收站分类：已删除分类仍被日程引用，需正常显示）
    function getCategoryName(catId: string): string {
      const cat = store.allCategories.find(c => c.id === catId);
      return cat ? cat.name : '未分类';
    }

    function getCategoryColor(catId: string): string {
      const cat = store.allCategories.find(c => c.id === catId);
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
      } else if (listFilter.value === 'completed') {
        filtered = filtered.filter(s => s.status === 'completed');
      } else if (listFilter.value === 'overdue') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        filtered = filtered.filter(s => {
          const end = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
          return end < startOfToday && s.status !== 'completed';
        });
      }

      // 2. 事项过滤
      if (activeFilterSection.value === 'matter' && matterFilter.value !== 'all') {
        filtered = filtered.filter(s => s.matterId === matterFilter.value);
      }

      // 3. 分类过滤
      if (categoryFilter.value !== 'all') {
        filtered = filtered.filter(s => (s.categoryId || '') === categoryFilter.value);
      }

      // 4. 搜索过滤
      const q = searchQuery.value.trim().toLowerCase();
      if (q) {
        filtered = filtered.filter(s => 
          s.title.toLowerCase().includes(q) || 
          s.content.toLowerCase().includes(q)
        );
      }

      return [...filtered].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    const isPendingExpanded = ref(true);
    // 已完成区块默认隐藏（收起），点击折叠头或侧边栏"已完成"筛选可查看
    const isCompletedExpanded = ref(false);

    const pendingSchedules = computed(() => {
      const list = visibleSchedules.value.filter(s => s.status !== 'completed');
      return [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    const completedSchedules = computed(() => {
      const list = visibleSchedules.value.filter(s => s.status === 'completed');
      return [...list].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    });

    // 辅助事项自动完成提示
    async function checkAndPromptMatterCompletion(matterId?: string) {
      if (!matterId) return;
      const matter = store.matters.find(m => m.id === matterId);
      if (!matter || matter.status === 'completed') return;
      
      const schedulesOfMatter = store.schedules.filter(s => s.matterId === matterId);
      if (schedulesOfMatter.length === 0) return;
      
      const allCompleted = schedulesOfMatter.every(s => s.status === 'completed');
      if (allCompleted) {
        setTimeout(async () => {
          const markCompleted = await confirm(
            `该事项（${matter.name}）下的所有任务已完成！\n是否立即将事项标记为已完成？`,
            { title: '事项已全部完成', kind: 'info' }
          );
          if (markCompleted) {
            await store.completeMatter(matterId);
          }
        }, 100);
      }
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

      if (nextStatus === 'completed') {
        await checkAndPromptMatterCompletion(schedule.matterId);
      }
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
        status: nextStatus
      });

      if (nextStatus === 'completed') {
        await checkAndPromptMatterCompletion(schedule.matterId);
      }
    }

    function getCompletedSubtaskCount(schedule: Schedule): number {
      if (!schedule.subtasks) return 0;
      return schedule.subtasks.filter(st => st.completed).length;
    }

    // Dialog 操作
    function openAddDialog() {
      if (activeFilterSection.value === 'matter' && matterFilter.value && matterFilter.value !== 'all') {
        scheduleFormDialogRef.value?.openWithMatter(matterFilter.value);
      } else {
        scheduleFormDialogRef.value?.open();
      }
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

    // 事项管理相关方法
    function openCreateMatterDialog() {
      isEditingMatter.value = false;
      editingMatterId.value = null;
      matterForm.value = {
        name: '',
        description: '',
        color: '#3b82f6',
        icon: '📌'
      };
      showMatterDialog.value = true;
    }

    function openEditMatterDialog(matter: Matter) {
      isEditingMatter.value = true;
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
        if (isEditingMatter.value && editingMatterId.value) {
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
        await platform.showError("保存事项失败", e.message || String(e));
      }
    }

    async function confirmCompleteMatter(id: string) {
      const ok = await confirm(
        '确认完成该事项？\n\n完成后：\n✓ 创建任务时默认不会再显示该事项\n✓ 已有关联任务不会受到影响\n✓ 后续可重新恢复事项',
        { title: '确认完成事项', kind: 'warning' }
      );
      if (ok) {
        try {
          await store.completeMatter(id);
          
          // 关联任务自动提示完成
          const pendingCount = store.schedules.filter(s => s.matterId === id && s.status !== 'completed').length;
          if (pendingCount > 0) {
            const completeAll = await confirm(
              `该事项下还有 ${pendingCount} 个未完成的任务。\n是否将所有任务批量标记为“已完成”？`,
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
        await platform.showError("操作失败", e.message || String(e));
      }
    }

    return {
      searchQuery,
      listFilter,
      categoryFilter,
      matterFilter,
      activeFilterSection,
      categories,
      visibleCategories,
      counts,
      getCategoryCount,
      visibleSchedules,
      pendingSchedules,
      completedSchedules,
      isPendingExpanded,
      isCompletedExpanded,
      getCategoryName,
      getCategoryColor,
      getCategoryStyle,
      getStatusLabel,
      getStatusClass,
      formatInterval,
      selectListFilter,
      selectCategoryFilter,
      selectMatterFilter,

      // 事项相关
      activeMatters,
      completedMatters,
      currentMatter,
      getMatterCount,
      totalCountOfMatter,
      completedCountOfMatter,
      progressPercentOfMatter,
      showMatterDialog,
      isEditingMatter,
      matterForm,
      openCreateMatterDialog,
      openEditMatterDialog,
      saveMatter,
      confirmCompleteMatter,
      restoreMatter,

      // 快捷操作
      toggleScheduleStatus,
      toggleSubtask,
      getCompletedSubtaskCount,

      // Dialog
      scheduleFormDialogRef,
      showDeleteConfirm,
      openAddDialog,
      openEditDialog,
      deleteSchedule,
      executeDeleteSchedule,
    };
  }
});
</script>

<style scoped>
.section-toggle-header {
  color: var(--muted-foreground);
}
.section-toggle-header:hover {
  color: var(--text) !important;
}
.section-toggle-header:hover .divider-line {
  opacity: 0.95 !important;
}
</style>
