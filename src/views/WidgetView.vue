<template>
  <div class="widget-container">
    <!-- 顶部工具栏 (纯拖拽区和窗口控制，去掉日期) -->
    <header class="widget-header" data-tauri-drag-region>
      <span class="widget-title" data-tauri-drag-region>桌面日程</span>
      <div class="window-controls">
        <button class="icon-btn" :class="{ 'is-active': isAlwaysOnTop }" @click="toggleAlwaysOnTop" title="置顶">
          <Icon icon="lucide:pin" width="16" height="16" />
        </button>
        <button class="icon-btn close-btn" @click="closeWidget" title="隐藏便签">
          <Icon icon="lucide:x" width="16" height="16" />
        </button>
      </div>
    </header>

    <!-- 中部主内容区 -->
    <div class="widget-body">
      <!-- 居中的日期导航 -->
      <div class="center-date-nav">
        <button class="icon-btn" @click="changeDate(-1)" :disabled="filterType === 'week'" title="前一天">
          <Icon icon="lucide:chevron-left" width="18" height="18" />
        </button>
        <span class="center-date-label">{{ displayDateLabel }}</span>
        <button class="icon-btn" @click="changeDate(1)" :disabled="filterType === 'week'" title="后一天">
          <Icon icon="lucide:chevron-right" width="18" height="18" />
        </button>
      </div>

      <!-- 快速筛选器 (今天、明天、未来7天) -->
      <div class="quick-filters">
        <button 
          class="filter-tab" 
          :class="{ active: filterType === 'today' }" 
          @click="setFilter('today')"
        >
          今天
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: filterType === 'tomorrow' }" 
          @click="setFilter('tomorrow')"
        >
          明天
        </button>
        <button 
          class="filter-tab" 
          :class="{ active: filterType === 'week' }" 
          @click="setFilter('week')"
        >
          未来7天
        </button>
      </div>

      <!-- 日程列表 -->
      <div class="widget-list">
        <div v-if="filteredSchedules.length > 0" style="display: flex; flex-direction: column; gap: 0; width: 100%;">
          <!-- 未完成日程区块 -->
          <div v-if="pendingSchedules.length > 0" style="display: flex; flex-direction: column; margin-bottom: 12px; width: 100%;">
            <div class="section-toggle-header" @click="isPendingExpanded = !isPendingExpanded" style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-bottom: 8px; font-size: 12px; transition: color 0.2s;">
              <Icon :icon="isPendingExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" width="14" height="14" />
              <span style="font-weight: 600; letter-spacing: 0.05em;">未完成</span>
              <span class="count-badge" style="font-size: 10px; padding: 1px 5px; border-radius: 9999px; background: var(--border); color: var(--text); font-weight: bold; line-height: 1;">{{ pendingSchedules.length }}</span>
              <div class="divider-line" style="flex-grow: 1; border-top: 1px dashed var(--border); margin-left: 6px; opacity: 0.6; transition: opacity 0.2s;"></div>
            </div>
            
            <div v-show="isPendingExpanded" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
              <div class="widget-item" v-for="inst in pendingSchedules" :key="inst.id + '-' + inst.dateKey" :class="{ 'is-editing': editingId === inst.id }">
                <div v-if="editingId !== inst.id" class="item-main-row">
                  <button class="check-btn" @click="toggleScheduleStatus(inst)">
                    <Icon v-if="inst.status === 'completed'" icon="lucide:check-circle" width="18" height="18" class="checked-icon" />
                    <Icon v-else icon="lucide:circle" width="18" height="18" class="unchecked-icon" />
                  </button>
                  
                  <div class="item-title-section">
                    <span class="item-title" :class="{ 'is-completed': inst.status === 'completed' }">{{ inst.title }}</span>
                    <div class="item-meta-tags">
                      <!-- 分类标签 -->
                      <span 
                        v-if="getCategory(inst.categoryId)" 
                        class="meta-tag category-tag" 
                        :style="{ backgroundColor: getCategory(inst.categoryId).color + '18', color: getCategory(inst.categoryId).color }"
                      >
                        <span class="tag-dot" :style="{ backgroundColor: getCategory(inst.categoryId).color }"></span>
                        {{ getCategory(inst.categoryId).name }}
                      </span>
                      <!-- 事项标签（事项功能暂时注释）
                      <span 
                        v-if="getMatter(inst.matterId)" 
                        class="meta-tag category-tag" 
                        :style="{ backgroundColor: getMatter(inst.matterId).color + '18', color: getMatter(inst.matterId).color }"
                      >
                        <span class="mr-0.5">{{ getMatter(inst.matterId).icon || '📌' }}</span>
                        {{ getMatter(inst.matterId).name }}
                      </span>
                      -->
                      <!-- 状态标签 -->
                      <span class="meta-tag status-tag" :class="getStatusClass(inst)">
                        {{ getStatusLabel(inst) }}
                      </span>
                      <!-- 时间/日期标签 (如果是未来7天，显示具体日期) -->
                      <span v-if="filterType === 'week'" class="meta-tag date-tag">
                        {{ inst.dateKey.substring(5) }}
                      </span>
                    </div>
                  </div>

                  <div class="item-actions" style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
                    <button class="edit-btn" @click="startEdit(inst)" title="编辑日程">
                      <Icon icon="lucide:edit-2" width="14" height="14" />
                    </button>
                    <button class="delete-btn" @click="deleteSchedule(inst.id)" title="删除日程">
                      <Icon icon="lucide:trash-2" width="14" height="14" />
                    </button>
                  </div>
                </div>

                <div class="item-edit-form" v-else>
                  <div class="edit-row">
                    <span class="edit-label">标题</span>
                    <input type="text" v-model="editTitle" class="edit-input" placeholder="输入日程标题..." />
                  </div>
                  <div class="edit-row select-row">
                    <span class="edit-label">分类</span>
                    <select v-model="editCategoryId" class="edit-select">
                      <option value="">未分类</option>
                      <option v-for="cat in visibleCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>
                  <!-- 事项编辑（事项功能暂时注释）
                  <div class="edit-row select-row">
                    <span class="edit-label">事项</span>
                    <select v-model="editMatterId" class="edit-select">
                      <option value="">无事项</option>
                      <option v-for="mat in activeMatters" :key="mat.id" :value="mat.id">
                        {{ mat.icon ? mat.icon + ' ' : '' }}{{ mat.name }}
                      </option>
                    </select>
                  </div>
                  -->
                  <div class="edit-row">
                    <span class="edit-label">备注内容</span>
                    <textarea v-model="editContent" class="edit-textarea" placeholder="输入日程备注内容..." rows="2"></textarea>
                  </div>
                  <!-- 子任务行内编辑器 -->
                  <div class="edit-subtasks-section">
                    <span class="edit-label">子任务</span>
                    <div class="edit-subtask-list" v-if="editSubtasks.length > 0">
                      <div v-for="(st, idx) in editSubtasks" :key="st.id" class="edit-subtask-row">
                        <span class="edit-subtask-title">{{ st.title }}</span>
                        <button type="button" class="subtask-del-btn" @click="removeEditSubtask(idx)" title="删除子任务">
                          <Icon icon="lucide:x" width="12" height="12" />
                        </button>
                      </div>
                    </div>
                    <div class="edit-subtask-add-row">
                      <input type="text" v-model="newSubtaskText" placeholder="添加子任务..." class="edit-input-sm" @keyup.enter="addEditSubtask" />
                      <button type="button" class="btn-sm" @click="addEditSubtask">添加</button>
                    </div>
                  </div>
                  <div class="edit-actions">
                    <button class="btn btn-cancel" @click="cancelEdit">取消</button>
                    <button class="btn btn-save" @click="saveEdit(inst.id)">保存</button>
                  </div>
                </div>
                
                <!-- 子任务展开/展示列表 -->
                <div v-if="editingId !== inst.id && inst.subtasks && inst.subtasks.length > 0" class="subtasks-container">
                  <div class="subtask-item" v-for="st in inst.subtasks" :key="st.id">
                    <button class="subtask-check" @click="toggleSubtaskStatus(inst, st)">
                      <Icon v-if="st.completed" icon="lucide:check-square" width="14" height="14" class="checked-icon" />
                      <Icon v-else icon="lucide:square" width="14" height="14" class="unchecked-icon" />
                    </button>
                    <span class="subtask-title" :class="{ 'is-completed': st.completed }">{{ st.title }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 已完成日程区块 -->
          <div v-if="completedSchedules.length > 0" style="display: flex; flex-direction: column; width: 100%;">
            <div class="section-toggle-header" @click="isCompletedExpanded = !isCompletedExpanded" style="display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; margin-bottom: 8px; font-size: 12px; transition: color 0.2s;">
              <Icon :icon="isCompletedExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" width="14" height="14" />
              <span style="font-weight: 600; letter-spacing: 0.05em;">已完成</span>
              <span class="count-badge" style="font-size: 10px; padding: 1px 5px; border-radius: 9999px; background: var(--border); color: var(--text); font-weight: bold; line-height: 1;">{{ completedSchedules.length }}</span>
              <div class="divider-line" style="flex-grow: 1; border-top: 1px dashed var(--border); margin-left: 6px; opacity: 0.6; transition: opacity 0.2s;"></div>
            </div>
            
            <div v-show="isCompletedExpanded" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
              <div class="widget-item" v-for="inst in completedSchedules" :key="inst.id + '-' + inst.dateKey" :class="{ 'is-editing': editingId === inst.id }" style="opacity: 0.85;">
                <div v-if="editingId !== inst.id" class="item-main-row">
                  <button class="check-btn" @click="toggleScheduleStatus(inst)">
                    <Icon v-if="inst.status === 'completed'" icon="lucide:check-circle" width="18" height="18" class="checked-icon" />
                    <Icon v-else icon="lucide:circle" width="18" height="18" class="unchecked-icon" />
                  </button>
                  
                  <div class="item-title-section">
                    <span class="item-title" :class="{ 'is-completed': inst.status === 'completed' }">{{ inst.title }}</span>
                    <div class="item-meta-tags">
                      <!-- 分类标签 -->
                      <span 
                        v-if="getCategory(inst.categoryId)" 
                        class="meta-tag category-tag" 
                        :style="{ backgroundColor: getCategory(inst.categoryId).color + '18', color: getCategory(inst.categoryId).color }"
                      >
                        <span class="tag-dot" :style="{ backgroundColor: getCategory(inst.categoryId).color }"></span>
                        {{ getCategory(inst.categoryId).name }}
                      </span>
                      <!-- 事项标签（事项功能暂时注释）
                      <span 
                        v-if="getMatter(inst.matterId)" 
                        class="meta-tag category-tag" 
                        :style="{ backgroundColor: getMatter(inst.matterId).color + '18', color: getMatter(inst.matterId).color }"
                      >
                        <span class="mr-0.5">{{ getMatter(inst.matterId).icon || '📌' }}</span>
                        {{ getMatter(inst.matterId).name }}
                      </span>
                      -->
                      <!-- 状态标签 -->
                      <span class="meta-tag status-tag" :class="getStatusClass(inst)">
                        {{ getStatusLabel(inst) }}
                      </span>
                      <!-- 时间/日期标签 (如果是未来7天，显示具体日期) -->
                      <span v-if="filterType === 'week'" class="meta-tag date-tag">
                        {{ inst.dateKey.substring(5) }}
                      </span>
                    </div>
                  </div>

                  <div class="item-actions" style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
                    <button class="edit-btn" @click="startEdit(inst)" title="编辑日程">
                      <Icon icon="lucide:edit-2" width="14" height="14" />
                    </button>
                    <button class="delete-btn" @click="deleteSchedule(inst.id)" title="删除日程">
                      <Icon icon="lucide:trash-2" width="14" height="14" />
                    </button>
                  </div>
                </div>

                <div class="item-edit-form" v-else>
                  <div class="edit-row">
                    <span class="edit-label">标题</span>
                    <input type="text" v-model="editTitle" class="edit-input" placeholder="输入日程标题..." />
                  </div>
                  <div class="edit-row select-row">
                    <span class="edit-label">分类</span>
                    <select v-model="editCategoryId" class="edit-select">
                      <option value="">未分类</option>
                      <option v-for="cat in visibleCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                    </select>
                  </div>
                  <!-- 事项编辑（事项功能暂时注释）
                  <div class="edit-row select-row">
                    <span class="edit-label">事项</span>
                    <select v-model="editMatterId" class="edit-select">
                      <option value="">无事项</option>
                      <option v-for="mat in activeMatters" :key="mat.id" :value="mat.id">
                        {{ mat.icon ? mat.icon + ' ' : '' }}{{ mat.name }}
                      </option>
                    </select>
                  </div>
                  -->
                  <div class="edit-row">
                    <span class="edit-label">备注内容</span>
                    <textarea v-model="editContent" class="edit-textarea" placeholder="输入日程备注内容..." rows="2"></textarea>
                  </div>
                  <!-- 子任务行内编辑器 -->
                  <div class="edit-subtasks-section">
                    <span class="edit-label">子任务</span>
                    <div class="edit-subtask-list" v-if="editSubtasks.length > 0">
                      <div v-for="(st, idx) in editSubtasks" :key="st.id" class="edit-subtask-row">
                        <span class="edit-subtask-title">{{ st.title }}</span>
                        <button type="button" class="subtask-del-btn" @click="removeEditSubtask(idx)" title="删除子任务">
                          <Icon icon="lucide:x" width="12" height="12" />
                        </button>
                      </div>
                    </div>
                    <div class="edit-subtask-add-row">
                      <input type="text" v-model="newSubtaskText" placeholder="添加子任务..." class="edit-input-sm" @keyup.enter="addEditSubtask" />
                      <button type="button" class="btn-sm" @click="addEditSubtask">添加</button>
                    </div>
                  </div>
                  <div class="edit-actions">
                    <button class="btn btn-cancel" @click="cancelEdit">取消</button>
                    <button class="btn btn-save" @click="saveEdit(inst.id)">保存</button>
                  </div>
                </div>
                
                <!-- 子任务展开/展示列表 -->
                <div v-if="editingId !== inst.id && inst.subtasks && inst.subtasks.length > 0" class="subtasks-container">
                  <div class="subtask-item" v-for="st in inst.subtasks" :key="st.id">
                    <button class="subtask-check" @click="toggleSubtaskStatus(inst, st)">
                      <Icon v-if="st.completed" icon="lucide:check-square" width="14" height="14" class="checked-icon" />
                      <Icon v-else icon="lucide:square" width="14" height="14" class="unchecked-icon" />
                    </button>
                    <span class="subtask-title" :class="{ 'is-completed': st.completed }">{{ st.title }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="filteredSchedules.length === 0" style="text-align: center; color: var(--muted-foreground); margin-top: 40px; font-size: 13px;">
          暂无日程
        </div>
      </div>
    </div>

    <!-- 底部快捷新增 -->
    <footer class="widget-footer">
      <Icon icon="lucide:plus" width="16" height="16" class="add-icon" />
      <input 
        type="text" 
        class="quick-add-input" 
        placeholder="快捷添加日程到选择日期 (按回车保存)" 
        v-model="quickAddText" 
        @keyup.enter="quickAdd"
        ref="quickAddInputRef"
      />
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import { useScheduleStore } from '../stores/scheduleStore';
import { CalendarEngine, toDateKey } from '../utils/calendarEngine';
import { Schedule } from '../types';
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window';
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi';
import { confirm } from '@tauri-apps/plugin-dialog';

export default defineComponent({
  name: 'WidgetView',
  components: {
    Icon
  },
  setup() {
    const store = useScheduleStore();
    const currentDate = ref(new Date());
    const quickAddText = ref('');
    const quickAddInputRef = ref<HTMLInputElement | null>(null);
    const isAlwaysOnTop = ref(false);
    const filterType = ref<'today' | 'tomorrow' | 'week' | 'custom'>('today');

    const activeMonthDate = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1));
    const calendarCells = computed(() => CalendarEngine.generateGrid(store.schedules, activeMonthDate.value));

    // 计算被筛选的日程列表
    const filteredSchedules = computed(() => {
      if (filterType.value === 'week') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(today);
        const end = new Date(today);
        end.setDate(today.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        
        const list: any[] = [];
        store.schedules.forEach(schedule => {
          const sStart = new Date(schedule.startTime);
          const sEnd = schedule.endTime ? new Date(schedule.endTime) : sStart;
          const duration = Math.max(0, sEnd.getTime() - sStart.getTime());
          
          if (schedule.recurrence === 'daily') {
            let cur = new Date(sStart);
            if (cur < start) {
              cur = new Date(start);
              cur.setHours(sStart.getHours(), sStart.getMinutes(), sStart.getSeconds());
            }
            while (cur <= end) {
              list.push({
                ...schedule,
                instanceStart: new Date(cur),
                instanceEnd: new Date(cur.getTime() + duration),
                dateKey: toDateKey(cur)
              });
              cur.setDate(cur.getDate() + 1);
            }
          } else {
            if (sStart <= end && sEnd >= start) {
              list.push({
                ...schedule,
                instanceStart: sStart,
                instanceEnd: sEnd,
                dateKey: toDateKey(sStart)
              });
            }
          }
        });
        return list.sort((a, b) => b.instanceStart.getTime() - a.instanceStart.getTime());
      } else {
        const key = toDateKey(currentDate.value);
        const cell = calendarCells.value.find(c => c.dateKey === key);
        const list = cell ? cell.allInstances : [];
        const mapped = list.map(inst => ({
          ...inst,
          dateKey: key
        }));
        return mapped.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      }
    });

    const isPendingExpanded = ref(true);
    const isCompletedExpanded = ref(true);

    const pendingSchedules = computed(() => {
      const list = filteredSchedules.value.filter(s => s.status !== 'completed');
      return [...list].sort((a, b) => {
        const timeA = a.instanceStart ? new Date(a.instanceStart).getTime() : new Date(a.startTime).getTime();
        const timeB = b.instanceStart ? new Date(b.instanceStart).getTime() : new Date(b.startTime).getTime();
        return timeA - timeB;
      });
    });

    const completedSchedules = computed(() => {
      const list = filteredSchedules.value.filter(s => s.status === 'completed');
      return [...list].sort((a, b) => {
        const timeA = a.instanceStart ? new Date(a.instanceStart).getTime() : new Date(a.startTime).getTime();
        const timeB = b.instanceStart ? new Date(b.instanceStart).getTime() : new Date(b.startTime).getTime();
        return timeB - timeA;
      });
    });

    const displayDateLabel = computed(() => {
      if (filterType.value === 'week') {
        return '未来 7 天';
      }
      const now = new Date();
      const isToday = toDateKey(currentDate.value) === toDateKey(now);
      
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = toDateKey(currentDate.value) === toDateKey(yesterday);
      
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      const isTomorrow = toDateKey(currentDate.value) === toDateKey(tomorrow);

      const prefix = isToday ? '今天 ' : isYesterday ? '昨天 ' : isTomorrow ? '明天 ' : '';
      return prefix + toDateKey(currentDate.value).substring(5);
    });

    const setFilter = (type: 'today' | 'tomorrow' | 'week') => {
      filterType.value = type;
      if (type === 'today') {
        currentDate.value = new Date();
      } else if (type === 'tomorrow') {
        currentDate.value = new Date(Date.now() + 86400000);
      }
    };

    const changeDate = (offset: number) => {
      if (filterType.value === 'week') return;
      const d = new Date(currentDate.value);
      d.setDate(d.getDate() + offset);
      currentDate.value = d;

      // 自动切换对应的标签高亮
      const key = toDateKey(d);
      const todayKey = toDateKey(new Date());
      const tomorrowKey = toDateKey(new Date(Date.now() + 86400000));
      if (key === todayKey) {
        filterType.value = 'today';
      } else if (key === tomorrowKey) {
        filterType.value = 'tomorrow';
      } else {
        filterType.value = 'custom';
      }
    };

    onMounted(async () => {
      try {
        const appWindow = getCurrentWindow();
        
        const monitor = await currentMonitor();
        const savedSize = localStorage.getItem('widget_size');
        const savedPos = localStorage.getItem('widget_pos');
        
        // 用户调整后的默认物理尺寸
        const defaultPhysicalWidth = 479;
        const defaultPhysicalHeight = 1167;
        
        // 用户调整后的默认物理位置
        let defaultPhysicalX = 1901;
        let defaultPhysicalY = 99;
        
        // 如果用户的屏幕宽度不够放这个便签，自适应往左移动
        if (monitor) {
          const scaleFactor = monitor.scaleFactor || 1;
          if (monitor.size.width < defaultPhysicalX + defaultPhysicalWidth) {
            defaultPhysicalX = monitor.size.width - defaultPhysicalWidth - 30;
          }
          if (monitor.size.height < defaultPhysicalY + defaultPhysicalHeight) {
            defaultPhysicalY = 30;
          }
        }

        let targetWidth = defaultPhysicalWidth;
        let targetHeight = defaultPhysicalHeight;
        if (savedSize) {
          try {
            const parsed = JSON.parse(savedSize);
            if (parsed.width && parsed.width > 100) targetWidth = parsed.width;
            if (parsed.height && parsed.height > 100) targetHeight = parsed.height;
          } catch(e) {}
        }
        await appWindow.setSize(new PhysicalSize(targetWidth, targetHeight));
        
        let targetX = defaultPhysicalX;
        let targetY = defaultPhysicalY;
        if (savedPos) {
          try {
            const parsed = JSON.parse(savedPos);
            if (typeof parsed.x === 'number' && parsed.x > -1000) targetX = parsed.x;
            if (typeof parsed.y === 'number' && parsed.y > -1000) targetY = parsed.y;
          } catch(e) {}
        }
        await appWindow.setPosition(new PhysicalPosition(targetX, targetY));

        const savedTop = localStorage.getItem('widget_always_on_top');
        if (savedTop === 'true') {
          isAlwaysOnTop.value = true;
          await appWindow.setAlwaysOnTop(true);
        } else {
          isAlwaysOnTop.value = false;
          await appWindow.setAlwaysOnTop(false);
        }
        
        // 监听移动和缩放
        await appWindow.onMoved(({ payload: position }) => {
          localStorage.setItem('widget_pos', JSON.stringify({ x: position.x, y: position.y }));
        });
        
        await appWindow.onResized(({ payload: size }) => {
          localStorage.setItem('widget_size', JSON.stringify({ width: size.width, height: size.height }));
        });
        
      } catch (error) {
        console.error("Failed to bind window events", error);
      }
    });

    const focusAddInput = () => {
      quickAddInputRef.value?.focus();
    };

    const toggleScheduleStatus = async (inst: any) => {
      const schedule = inst;
      const nextStatus = schedule.status === 'completed' ? 'pending' : 'completed';
      const updatedSubtasks = schedule.subtasks 
        ? schedule.subtasks.map((st: any) => ({ ...st, completed: nextStatus === 'completed' }))
        : [];
      
      await store.updateSchedule(schedule.id, { 
        status: nextStatus,
        subtasks: updatedSubtasks
      });
    };

    const toggleSubtaskStatus = async (inst: any, subtask: any) => {
      const schedule = inst;
      const updatedSubtasks = schedule.subtasks.map((st: any) => {
        if (st.id === subtask.id) {
          return { ...st, completed: !st.completed };
        }
        return st;
      });
      
      await store.updateSchedule(schedule.id, {
        subtasks: updatedSubtasks
      });
    };

    const deleteSchedule = async (id: string) => {
      await store.deleteSchedule(id);
    };

    const quickAdd = async () => {
      if (!quickAddText.value.trim()) return;
      const title = quickAddText.value.trim();
      
      const start = new Date(currentDate.value);
      const now = new Date();
      start.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      // 查找分类中名称为“工作”的分类作为默认分类（隐藏的分类不采用）
      const workCategory = store.categories.find(c => c.name === '工作' && !c.hidden);
      const categoryId = workCategory ? workCategory.id : '';

      const newSchedule: Schedule = {
        id: crypto.randomUUID(),
        title: title,
        content: '',
        startTime: start.toISOString(),
        status: 'pending',
        recurrence: 'none',
        categoryId: categoryId, // 默认设为“工作”分类
        reminder: 'none',
        important: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await store.addSchedule(newSchedule);
      quickAddText.value = '';
    };

    const closeWidget = async () => {
      try {
        await getCurrentWindow().hide();
      } catch(e) {
        console.error(e);
      }
    };

    const toggleAlwaysOnTop = async () => {
      try {
        const nextState = !isAlwaysOnTop.value;
        await getCurrentWindow().setAlwaysOnTop(nextState);
        isAlwaysOnTop.value = nextState;
        localStorage.setItem('widget_always_on_top', String(nextState));
      } catch(e) {
        console.error(e);
      }
    };

    const getStatusLabel = (schedule: Schedule): string => {
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
    };

    const getStatusClass = (schedule: Schedule): string => {
      if (schedule.status === "completed") return "completed";
      const endTime = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
      const startTime = new Date(schedule.startTime);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const now = new Date();
      if (endTime < startOfToday) return "delayed";
      if (schedule.status === "pending" && startTime <= now) return "in-progress";
      if (schedule.status === "in-progress") return "in-progress";
      if (schedule.status === "delayed") return "delayed";
      return "pending";
    };

    const getCategory = (catId: string) => {
      return store.allCategories.find(c => c.id === catId);
    };

    const getMatter = (matterId: string) => {
      return store.matters.find(m => m.id === matterId);
    };

    // 编辑弹窗/表单状态
    const editingId = ref<string | null>(null);
    const editTitle = ref('');
    const editCategoryId = ref('');
    const editMatterId = ref('');
    const editContent = ref('');
    const editSubtasks = ref<Array<{ id: string; title: string; completed: boolean }>>([]);
    const newSubtaskText = ref('');

    const startEdit = (schedule: Schedule) => {
      editingId.value = schedule.id;
      editTitle.value = schedule.title;
      editCategoryId.value = schedule.categoryId || '';
      editMatterId.value = schedule.matterId || '';
      editContent.value = schedule.content || '';
      editSubtasks.value = schedule.subtasks ? JSON.parse(JSON.stringify(schedule.subtasks)) : [];
      newSubtaskText.value = '';
    };

    const cancelEdit = () => {
      editingId.value = null;
    };

    const addEditSubtask = () => {
      if (!newSubtaskText.value.trim()) return;
      editSubtasks.value.push({
        id: crypto.randomUUID(),
        title: newSubtaskText.value.trim(),
        completed: false
      });
      newSubtaskText.value = '';
    };

    const removeEditSubtask = (index: number) => {
      editSubtasks.value.splice(index, 1);
    };

    const saveEdit = async (id: string) => {
      if (!editTitle.value.trim()) {
        alert("标题不能为空！");
        return;
      }
      try {
        await store.updateSchedule(id, {
          title: editTitle.value.trim(),
          categoryId: editCategoryId.value,
          matterId: editMatterId.value,
          content: editContent.value.trim(),
          subtasks: editSubtasks.value
        });
      } catch (e) {
        console.error(e);
      } finally {
        editingId.value = null;
      }
    };

    return {
      currentDate,
      quickAddText,
      quickAddInputRef,
      filteredSchedules,
      pendingSchedules,
      completedSchedules,
      isPendingExpanded,
      isCompletedExpanded,
      displayDateLabel,
      filterType,
      setFilter,
      changeDate,
      focusAddInput,
      toggleScheduleStatus,
      toggleSubtaskStatus,
      deleteSchedule,
      quickAdd,
      closeWidget,
      isAlwaysOnTop,
      toggleAlwaysOnTop,
      getStatusLabel,
      getStatusClass,
      getCategory,
      editingId,
      editTitle,
      editCategoryId,
      editContent,
      editSubtasks,
      newSubtaskText,
      startEdit,
      cancelEdit,
      addEditSubtask,
      removeEditSubtask,
      saveEdit,
      categories: computed(() => store.categories),
      visibleCategories: computed(() => store.categories.filter(c => !c.hidden)),
      getMatter,
      editMatterId,
      activeMatters: computed(() => store.matters.filter(m => m.status === 'active'))
    };
  }
});
</script>

<style scoped>
.widget-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  /* 增加背景不透明度以大幅提高文字易读性，保留毛玻璃质感 */
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(25px) saturate(1.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  overflow: hidden;
  color: var(--text);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.dark .widget-container {
  background: rgba(28, 28, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 顶部栏 */
.widget-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: grab;
  -webkit-app-region: drag;
  flex-shrink: 0;
}

.dark .widget-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.widget-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted-foreground);
  user-select: none;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: background 0.2s;
  -webkit-app-region: no-drag;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.dark .icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn.is-active {
  color: var(--primary);
  background: rgba(0, 0, 0, 0.05);
}
.dark .icon-btn.is-active {
  background: rgba(255, 255, 255, 0.1);
}

.close-btn:hover {
  background: rgba(255, 59, 48, 0.1) !important;
  color: var(--danger);
}

/* 主内容区 */
.widget-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 居中日期导航 */
.center-date-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 14px 0 10px 0;
}

.center-date-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  min-width: 100px;
  text-align: center;
  user-select: none;
}

/* 快速筛选 */
.quick-filters {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 3px;
  border-radius: 8px;
  margin: 0 12px 12px 12px;
}

.dark .quick-filters {
  background: rgba(255, 255, 255, 0.04);
}

.filter-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 6px 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted-foreground);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  color: var(--text);
}

.filter-tab.active {
  background: #ffffff;
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dark .filter-tab.active {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

/* 列表区 */
.widget-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.widget-item {
  display: flex;
  flex-direction: column;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.dark .widget-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.02);
}

.widget-item:hover {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(0, 0, 0, 0.06);
}

.dark .widget-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.05);
}

.item-main-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.check-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  margin-right: 8px;
  padding: 0;
  flex-shrink: 0;
}

.checked-icon {
  color: var(--primary);
}

.item-title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-title.is-completed {
  text-decoration: line-through;
  color: var(--muted-foreground);
  font-weight: 400;
}

/* 标签样式 */
.item-meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.meta-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1.2;
}

.tag-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.status-tag {
  background: rgba(118, 118, 128, 0.12);
  color: var(--text);
  font-weight: 600;
}

.status-tag.in-progress {
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
}

.status-tag.delayed {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.status-tag.completed {
  background: rgba(52, 199, 89, 0.1);
  color: #34c759;
}

.date-tag {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text);
  font-weight: 600;
}

.dark .date-tag {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.delete-btn {
  background: transparent;
  border: none;
  color: var(--danger);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
}

.widget-item:hover .delete-btn {
  opacity: 1;
}

/* 子任务 */
.subtasks-container {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 26px;
}

.dark .subtasks-container {
  border-top: 1px dashed rgba(255, 255, 255, 0.05);
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.subtask-check {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
}

.subtask-check:hover {
  color: var(--text);
}

.subtask-title {
  font-size: 11px;
  color: var(--text);
  opacity: 0.85;
}

.subtask-title.is-completed {
  text-decoration: line-through;
  opacity: 0.5;
}

/* 底栏区 */
.widget-footer {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.dark .widget-footer {
  background: rgba(255, 255, 255, 0.01);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.add-icon {
  color: var(--muted-foreground);
  margin-right: 8px;
}

.quick-add-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text);
}

.quick-add-input::placeholder {
  color: var(--muted-foreground);
}

/* 编辑模式及编辑按钮 */
.edit-btn {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.edit-btn:hover {
  background: rgba(0, 122, 255, 0.1);
  color: var(--primary);
}

.widget-item:hover .edit-btn {
  opacity: 1;
}

.widget-item.is-editing {
  background: rgba(255, 255, 255, 0.7);
}
.dark .widget-item.is-editing {
  background: rgba(255, 255, 255, 0.08);
}

.item-edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 4px;
  box-sizing: border-box;
}

.edit-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.edit-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted-foreground);
}

.edit-input, .edit-select, .edit-textarea {
  background: var(--panel-strong);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.edit-select {
  cursor: pointer;
}

.edit-textarea {
  resize: none;
}

.edit-subtasks-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.edit-subtask-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 6px;
  max-h: 120px;
  overflow-y: auto;
}
.dark .edit-subtask-list {
  background: rgba(255, 255, 255, 0.02);
}

.edit-subtask-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: var(--panel);
  padding: 4px 8px;
  border-radius: 4px;
}

.edit-subtask-title {
  font-size: 11px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subtask-del-btn {
  background: transparent;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.subtask-del-btn:hover {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.1);
}

.edit-subtask-add-row {
  display: flex;
  gap: 6px;
}

.edit-input-sm {
  flex: 1;
  background: var(--panel-strong);
  border: 1px solid var(--line);
  color: var(--text);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}

.btn-sm {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  background: var(--panel-strong);
  color: var(--text);
}
.btn-sm:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
}

.btn {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  background: var(--panel-strong);
  color: var(--text);
  transition: all 0.2s;
}

.btn-save {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-save:hover {
  opacity: 0.9;
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.05);
}
.dark .btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
}
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
