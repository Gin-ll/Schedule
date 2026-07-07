import { getCurrentWindow, PhysicalPosition, PhysicalSize, currentMonitor } from '@tauri-apps/api/window';
async function setupWindowPosition() {
  try {
    const win = getCurrentWindow();
    const monitor = await currentMonitor();
    if (monitor) {
      const size = await win.outerSize();
      console.log('Window size: ', size.width, size.height);
      console.log('Monitor size: ', monitor.size.width, monitor.size.height);
    }
  } catch(e) {
    console.error(e);
  }
}
setTimeout(setupWindowPosition, 1000);
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Mandarin } from "flatpickr/dist/l10n/zh.js";
import confirmDatePlugin from "flatpickr/dist/plugins/confirmDate/confirmDate.js";
import "flatpickr/dist/plugins/confirmDate/confirmDate.css";
class CustomSelect {
  constructor(originalSelect) {
    this.originalSelect = originalSelect;
    
    // Remove old wrapper if exists
    if (originalSelect.nextElementSibling && originalSelect.nextElementSibling.classList.contains('custom-select')) {
      originalSelect.nextElementSibling.remove();
    }
    
    this.customSelect = document.createElement('div');
    this.customSelect.classList.add('custom-select');
    
    this.selectedDiv = document.createElement('div');
    this.selectedDiv.classList.add('select-selected');
    
    const labelText = originalSelect.parentElement.childNodes[0].textContent.trim();
    if (labelText) {
      originalSelect.dataset.label = labelText;
      originalSelect.parentElement.childNodes[0].textContent = '';
    }
    const finalLabel = originalSelect.dataset.label || "";
    
    const initialText = originalSelect.options[originalSelect.selectedIndex]?.text || "";
    if (finalLabel) {
      this.selectedDiv.innerHTML = `<span class="select-label">${finalLabel}</span><span class="select-value">${initialText}</span><svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    } else {
      this.selectedDiv.innerHTML = `<span class="select-value">${initialText}</span><svg class="select-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    }

    this.optionsDiv = document.createElement('div');
    this.optionsDiv.classList.add('select-items');
    this.optionsDiv.style.display = 'none';
    
    this.setupOptions();
    
    this.customSelect.appendChild(this.selectedDiv);
    this.customSelect.appendChild(this.optionsDiv);
    
    originalSelect.style.display = 'none';
    originalSelect.parentNode.insertBefore(this.customSelect, originalSelect.nextSibling);

    this.selectedDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = this.optionsDiv.style.display === 'none' || this.optionsDiv.style.display === '';
      
      // Close all other selects
      document.querySelectorAll('.custom-select .select-items').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.custom-select .select-selected').forEach(el => el.classList.remove('select-arrow-active'));
      
      // Toggle current select
      if (isHidden) {
        this.optionsDiv.style.display = 'block';
        this.selectedDiv.classList.add('select-arrow-active');
      } else {
        this.optionsDiv.style.display = 'none';
        this.selectedDiv.classList.remove('select-arrow-active');
      }
    });
  }

  setupOptions() {
    this.optionsDiv.innerHTML = '';
    for (let i = 0; i < this.originalSelect.length; i++) {
      const optionItem = document.createElement('div');
      optionItem.innerHTML = this.originalSelect.options[i].innerHTML;
      if (this.originalSelect.selectedIndex === i) {
        optionItem.classList.add('same-as-selected');
      }
      optionItem.addEventListener('click', (e) => {
        this.originalSelect.selectedIndex = i;
        this.selectedDiv.querySelector('.select-value').innerHTML = this.originalSelect.options[i].innerHTML;
        
        const y = this.optionsDiv.getElementsByClassName('same-as-selected');
        for (let k = 0; k < y.length; k++) {
          y[k].classList.remove('same-as-selected');
        }
        optionItem.classList.add('same-as-selected');
        this.selectedDiv.click();
        
        const event = new Event('change', { bubbles: true });
        this.originalSelect.dispatchEvent(event);
      });
      this.optionsDiv.appendChild(optionItem);
    }
  }

  closeAllSelect(exceptThis) {
    const x = document.getElementsByClassName('select-items');
    const y = document.getElementsByClassName('select-selected');
    for (let i = 0; i < y.length; i++) {
      if (exceptThis !== y[i].parentElement) {
        y[i].classList.remove('select-arrow-active');
      }
    }
    for (let i = 0; i < x.length; i++) {
      if (exceptThis !== x[i].parentElement) {
        x[i].classList.add('select-hide');
      }
    }
  }
}

document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select .select-items').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.custom-select .select-selected').forEach(el => el.classList.remove('select-arrow-active'));
});


async function setupTodoWindow() {
  try {
    const win = getCurrentWindow();
    const monitor = await currentMonitor();
    if (!monitor) return;

    let currentPhysicalSize = await win.outerSize();
    const savedSizeStr = localStorage.getItem('app-window-size');
    
    if (savedSizeStr) {
      const savedSize = JSON.parse(savedSizeStr);
      if (savedSize.width !== currentPhysicalSize.width || savedSize.height !== currentPhysicalSize.height) {
        await win.setSize(new PhysicalSize(savedSize.width, savedSize.height));
        currentPhysicalSize = savedSize;
      }
    } else {
      localStorage.setItem('app-window-size', JSON.stringify({width: currentPhysicalSize.width, height: currentPhysicalSize.height}));
    }

    const scale = monitor.scaleFactor;
    // Microsoft To Do style: center horizontal, bottom vertical with margin
    const margin = 120 * scale; // taskbar spacing + comfortable distance
    const x = Math.round((monitor.size.width - currentPhysicalSize.width) / 2);
    const y = Math.round(monitor.size.height - currentPhysicalSize.height - margin);

    await win.setPosition(new PhysicalPosition(x, y));

    win.onResized((event) => {
      const newSize = event.payload;
      localStorage.setItem('app-window-size', JSON.stringify({width: newSize.width, height: newSize.height}));
    });
  } catch (err) {
    console.error("Window setup failed:", err);
  }
}

function initCustomSelects() {
  if (els.timeFilter) new CustomSelect(els.timeFilter);
  if (els.sortBy) new CustomSelect(els.sortBy);
  if (els.categoryFilter) new CustomSelect(els.categoryFilter);
}


const STORAGE_KEY = "schedule-admin-state";

const defaultCategories = [
  { id: "cat-work", name: "工作", color: "#2563eb", note: "工作事项" },
  { id: "cat-life", name: "生活", color: "#16a34a", note: "个人安排" },
  { id: "cat-study", name: "学习", color: "#9333ea", note: "学习计划" },
];

const today = new Date();
const defaultSchedules = [
  {
    id: "sch-1",
    title: "整理本周工作计划",
    content: "确认优先级，标记重点完成内容。",
    time: toInputDateTime(addHours(today, 2)),
    categoryId: "cat-work",
    status: "pending",
    important: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "sch-2",
    title: "复盘产品需求",
    content: "检查日程列表、分类和日历视图是否覆盖一期范围。",
    time: toInputDateTime(addHours(today, 5)),
    categoryId: "cat-study",
    status: "completed",
    important: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let state = loadState();
let activeScheduleView = "list";
let calendarViewMode = "names";
let calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let currentSubtasks = [];

const els = {
  navItems: document.querySelectorAll(".nav-item"),
  pages: document.querySelectorAll(".page"),
  newScheduleBtn: document.querySelector("#newScheduleBtn"),
  newCategoryBtn: document.querySelector("#newCategoryBtn"),
  scheduleDialog: document.querySelector("#scheduleDialog"),
  categoryDialog: document.querySelector("#categoryDialog"),
  scheduleForm: document.querySelector("#scheduleForm"),
  categoryForm: document.querySelector("#categoryForm"),
  scheduleList: document.querySelector("#scheduleList"),
  categoryList: document.querySelector("#categoryList"),
  timeFilter: document.querySelector("#timeFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  sortBy: document.querySelector("#sortBy"),
  listPanel: document.querySelector("#listPanel"),
  calendarPanel: document.querySelector("#calendarPanel"),
  newScheduleBtnCalendar: document.querySelector("#newScheduleBtnCalendar"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  prevMonthBtn: document.querySelector("#prevMonthBtn"),
  nextMonthBtn: document.querySelector("#nextMonthBtn"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  selectedDateList: document.querySelector("#selectedDateList"),
  searchInput: document.querySelector("#searchInput"),
  todayBtn: document.querySelector("#todayBtn"),
  monthPicker: document.querySelector("#monthPicker"),
  toggleViewBtn: document.querySelector("#toggleViewBtn"),
  newSubtaskTitle: document.querySelector("#newSubtaskTitle"),
  addSubtaskBtn: document.querySelector("#addSubtaskBtn"),
  dialogSubtaskList: document.querySelector("#dialogSubtaskList"),
};

setupTodoWindow();
  bindEvents();
  initCustomSelects();
renderAll();

function bindEvents() {
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => switchPage(item.dataset.view));
  });

  els.newScheduleBtn.addEventListener("click", () => openScheduleDialog());
  els.newCategoryBtn.addEventListener("click", () => openCategoryDialog());

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`#${button.dataset.closeDialog}`).close();
    });
  });

  els.scheduleForm.addEventListener("submit", saveSchedule);

  if (els.addSubtaskBtn) {
    els.addSubtaskBtn.addEventListener("click", () => {
      const title = els.newSubtaskTitle.value.trim();
      if (!title) return;
      currentSubtasks.push({ id: createId("st"), title, completed: false });
      els.newSubtaskTitle.value = "";
      renderDialogSubtasks();
    });
  }
  
  if (els.dialogSubtaskList) {
    els.dialogSubtaskList.addEventListener("click", (e) => {
      if (e.target.dataset.deleteSubtask) {
        currentSubtasks = currentSubtasks.filter(st => st.id !== e.target.dataset.deleteSubtask);
        renderDialogSubtasks();
      }
    });
    els.dialogSubtaskList.addEventListener("input", (e) => {
      if (e.target.dataset.editSubtask) {
        const st = currentSubtasks.find(st => st.id === e.target.dataset.editSubtask);
        if (st) st.title = e.target.value;
      }
    });
  }
  els.categoryForm.addEventListener("submit", saveCategory);

  els.timeFilter?.addEventListener("change", renderSchedules);

    const smartFilters = document.querySelectorAll("#smartListFilters li");
  smartFilters.forEach(li => {
    li.addEventListener("click", (e) => {
      smartFilters.forEach(el => el.classList.remove("active"));
      e.currentTarget.classList.add("active");
      
      const catItems = document.querySelectorAll('#sidebarCategoryList li');
      catItems.forEach(el => el.classList.remove('active'));
      
      if (els.timeFilter) els.timeFilter.value = e.currentTarget.dataset.filter;
      if (els.categoryFilter) els.categoryFilter.value = 'all';
      
      renderSchedules();
    });
  });
  els.categoryFilter?.addEventListener("change", renderSchedules);

  if (els.searchInput) els.searchInput.addEventListener("input", renderSchedules);
  els.prevMonthBtn.addEventListener("click", () => changeMonth(-1));
  els.nextMonthBtn.addEventListener("click", () => changeMonth(1));

  if (els.todayBtn) {
    els.todayBtn.addEventListener("click", () => {
      const now = new Date();
      calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
      selectedDate = toDateKey(now);
      renderCalendar();
      renderSelectedDateList();
    });
  }

  if (els.monthPicker) {
    els.monthPicker.addEventListener("change", (e) => {
      const [year, month] = e.target.value.split("-");
      if (year && month) {
        calendarDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        renderCalendar();
      }
    });
  }

  if (els.toggleViewBtn) {
    els.toggleViewBtn.addEventListener("click", () => {
      calendarViewMode = calendarViewMode === "dots" ? "names" : "dots";
      els.toggleViewBtn.textContent = `视图: ${calendarViewMode === "dots" ? "圆点" : "标题"}`;
      renderCalendar();
    });
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let stateObj = { categories: defaultCategories, schedules: defaultSchedules };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      stateObj = {
        categories: Array.isArray(parsed.categories) ? parsed.categories : defaultCategories,
        schedules: Array.isArray(parsed.schedules) ? parsed.schedules : defaultSchedules,
      };
    } catch {}
  }
  
  stateObj.schedules = stateObj.schedules.map(s => ({
    ...s,
    startTime: s.startTime || s.time,
    recurrence: s.recurrence || 'none',
  }));
  return stateObj;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAll() {
  renderCategoryOptions();
  renderSchedules();
  renderCategories();
}

function switchPage(viewId) {
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  els.pages.forEach((page) => page.classList.toggle("active", page.id === viewId));
}

function setScheduleView(view) {
  activeScheduleView = view;
  els.listModeBtn.classList.toggle("active", view === "list");
  els.calendarModeBtn.classList.toggle("active", view === "calendar");
  els.listPanel.classList.toggle("active", view === "list");
  els.calendarPanel.classList.toggle("active", view === "calendar");
  renderSchedules();
}

function renderSchedules() {
  updateSmartListCounts();
  updateSidebarCategoryCounts();
  const schedules = getVisibleSchedules();
  renderScheduleList(schedules);
  renderCalendar();
  renderSelectedDateList();
}

function updateSmartListCounts() {
  const now = new Date();
  const todayKey = toDateKey(now);
  
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  const next7DaysEnd = new Date(now);
  next7DaysEnd.setDate(now.getDate() + 7);
  const endKey = toDateKey(next7DaysEnd);

  let allCount = 0;
  let todayCount = 0;
  let tomorrowCount = 0;
  let next7Count = 0;

  state.schedules.forEach(schedule => {
    
    allCount++;
    const startKey = toDateKey(new Date(schedule.startTime));
    const end = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
    const scheduleEndKey = toDateKey(end);
    
    if (startKey <= todayKey && scheduleEndKey >= todayKey) {
      todayCount++;
    }
    if (startKey <= tomorrowKey && scheduleEndKey >= tomorrowKey) {
      tomorrowCount++;
    }
    if (startKey <= endKey && scheduleEndKey >= todayKey) {
      next7Count++;
    }
  });

  const countAllEl = document.getElementById("count-all");
  const countTodayEl = document.getElementById("count-today");
  const countTomorrowEl = document.getElementById("count-tomorrow");
  const countNext7El = document.getElementById("count-next7days");
  if (countAllEl) countAllEl.textContent = allCount;
  if (countTodayEl) countTodayEl.textContent = todayCount;
  if (countTomorrowEl) countTomorrowEl.textContent = tomorrowCount;
  if (countNext7El) countNext7El.textContent = next7Count;
}

function matchesCategoryFilter(schedule) {
  if (!els.categoryFilter) return true;
  const filter = els.categoryFilter.value;
  if (filter === "all") return true;
  if (filter === "uncategorized") return !schedule.categoryId;
  return schedule.categoryId === filter;
}

function getVisibleSchedules() {
  let filtered = state.schedules.filter((schedule) => matchesTimeFilter(schedule) && matchesCategoryFilter(schedule));
  const query = els.searchInput?.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(s => 
      s.title.toLowerCase().includes(query) || 
      (s.content && s.content.toLowerCase().includes(query))
    );
  }
  return filtered.sort(compareSchedules);
}

function matchesTimeFilter(schedule) {
  const filter = els.timeFilter.value;
  if (filter === "all") return true;

  const scheduleStart = new Date(schedule.startTime);
  const scheduleEnd = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
  const now = new Date();
  
  if (filter === "today") {
    const todayKey = toDateKey(now);
    return toDateKey(scheduleStart) <= todayKey && toDateKey(scheduleEnd) >= todayKey;
  }

  if (filter === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowKey = toDateKey(tomorrow);
    return toDateKey(scheduleStart) <= tomorrowKey && toDateKey(scheduleEnd) >= tomorrowKey;
  }

  if (filter === "next7days") {
    const todayKey = toDateKey(now);
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    const endKey = toDateKey(end);
    return toDateKey(scheduleStart) <= endKey && toDateKey(scheduleEnd) >= todayKey;
  }

  if (filter === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return scheduleStart <= endOfMonth && scheduleEnd >= startOfMonth;
  }

  if (filter === "week") {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return scheduleStart < end && scheduleEnd >= start;
  }

  return true;
}

function compareSchedules(a, b) {
  return new Date(a.startTime) - new Date(b.startTime);
}

function renderScheduleList(schedules) {
  if (!schedules.length) {
    els.scheduleList.innerHTML = `<div class="empty-state">暂无日程</div>`;
    return;
  }

  els.scheduleList.innerHTML = schedules.map((schedule) => scheduleCardTemplate(schedule)).join("");
  els.scheduleList.querySelectorAll("[data-toggle-subtask]").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const [scheduleId, subtaskId] = e.target.dataset.toggleSubtask.split("|");
      toggleSubtask(scheduleId, subtaskId);
    });
  });
  els.scheduleList.querySelectorAll("[data-toggle-schedule]").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => toggleScheduleStatus(e.target.dataset.toggleSchedule, e.target.checked));
  });
  els.scheduleList.querySelectorAll("[data-edit-schedule]").forEach((button) => {
    button.addEventListener("click", () => openScheduleDialog(button.dataset.editSchedule));
  });
  els.scheduleList.querySelectorAll("[data-delete-schedule]").forEach((button) => {
    button.addEventListener("click", () => deleteSchedule(button.dataset.deleteSchedule));
  });
}

function scheduleCardTemplate(schedule) {
  const category = getCategory(schedule.categoryId);
  let statusLabel = "未开始";
  let statusClass = "pending";
  if (schedule.status === "completed") { statusLabel = "已完成"; statusClass = "done"; }
  else if (schedule.status === "in-progress") { statusLabel = "进行中"; statusClass = "in-progress"; }
  else if (schedule.status === "delayed") { statusLabel = "已延期"; statusClass = "delayed"; }

  if (schedule.status !== "completed") {
    const endTime = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
    const startTime = new Date(schedule.startTime);
    const now = new Date();
    
    if (endTime < now) {
      statusLabel = "已逾期";
      statusClass = "overdue";
    } else if (schedule.status === "pending" && startTime <= now) {
      statusLabel = "进行中";
      statusClass = "in-progress";
    }
  }
  
  const content = schedule.content ? `<p class="schedule-content">${escapeHtml(schedule.content)}</p>` : "";
  
  let subtasksProgressTag = "";
  let subtasksListHtml = "";
  if (schedule.subtasks && schedule.subtasks.length > 0) {
    const totalSt = schedule.subtasks.length;
    const completedSt = schedule.subtasks.filter(st => st.completed).length;
    
    subtasksListHtml = `<details class="subtasks-details">
      <summary class="subtasks-summary">
        <span style="display:inline-block; margin-left: 4px;">子任务 (${completedSt}/${totalSt})</span>
      </summary>
      <div class="card-subtasks">` + schedule.subtasks.map(st => `
        <label class="card-subtask-item ${st.completed ? 'completed' : ''}">
          <input type="checkbox" data-toggle-subtask="${schedule.id}|${st.id}" ${st.completed ? 'checked' : ''} />
          <span>${escapeHtml(st.title)}</span>
        </label>
      `).join("") + `</div>
    </details>`;
  }

  const categoryTag = category
    ? `<span class="tag category-tag" style="background:${category.color}">${escapeHtml(category.name)}</span>`
    : `<span class="tag">未分类</span>`;

  return `
    <article class="schedule-card">
      <div class="schedule-title-row" style="align-items: center; gap: 10px;">
        <input type="checkbox" data-toggle-schedule="${schedule.id}" ${schedule.status === 'completed' ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0; margin: 0;" />
        <h3 class="${schedule.status === 'completed' ? 'completed-title' : ''}" style="flex: 1; word-break: break-all;">${escapeHtml(schedule.title)}</h3>
        <div class="card-actions" style="display: flex; gap: 4px;">
          <button class="action-icon-btn" type="button" data-edit-schedule="${schedule.id}" aria-label="编辑" title="编辑">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="action-icon-btn danger" type="button" data-delete-schedule="${schedule.id}" aria-label="删除" title="删除">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      </div>
      ${content}
      ${subtasksListHtml}
      <div class="schedule-meta" style="margin-top: 10px;">
        <span class="tag">${formatScheduleInterval(schedule.startTime, schedule.endTime, schedule.recurrence)}</span>
        ${subtasksProgressTag}
        ${categoryTag}
        <span class="tag ${statusClass}">${statusLabel}</span>
        ${schedule.important ? `<span class="tag important">重点</span>` : ""}
      </div>
    </article>
  `;
}

function getSchedulesForDateRange(start, end) {
  const result = [];
  
  state.schedules.forEach(schedule => {
    
    let sStart = new Date(schedule.startTime);
    let sEnd = schedule.endTime ? new Date(schedule.endTime) : new Date(schedule.startTime);
    let duration = Math.max(0, sEnd.getTime() - sStart.getTime());

    if (schedule.recurrence === 'daily') {
      let cur = new Date(sStart);
      if (cur < start) {
        cur = new Date(start);
        cur.setHours(sStart.getHours(), sStart.getMinutes(), sStart.getSeconds(), sStart.getMilliseconds());
      }
      while (cur <= end) {
        let curEnd = new Date(cur.getTime() + duration);
        result.push({ ...schedule, instanceStart: new Date(cur), instanceEnd: curEnd });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (schedule.recurrence === 'weekly') {
      let cur = new Date(sStart);
      while (cur <= end) {
        if (cur >= start) {
          let curEnd = new Date(cur.getTime() + duration);
          result.push({ ...schedule, instanceStart: new Date(cur), instanceEnd: curEnd });
        }
        cur.setDate(cur.getDate() + 7);
      }
    } else if (schedule.recurrence === 'monthly') {
      let cur = new Date(sStart);
      while (cur <= end) {
        if (cur >= start) {
          let curEnd = new Date(cur.getTime() + duration);
          result.push({ ...schedule, instanceStart: new Date(cur), instanceEnd: curEnd });
        }
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      if (sStart <= end && sEnd >= start) {
        result.push({ ...schedule, instanceStart: sStart, instanceEnd: sEnd });
      }
    }
  });
  return result;
}

function renderCalendar() {
  els.calendarTitle.textContent = `${calendarDate.getFullYear()}年 ${calendarDate.getMonth() + 1}月`;
  if (els.monthPicker) {
    els.monthPicker.value = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`;
  }

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = startOfWeek(firstDay);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  end.setHours(23, 59, 59, 999);

  const instances = getSchedulesForDateRange(start, end).sort((a, b) => a.instanceStart - b.instanceStart || (b.instanceEnd - b.instanceStart) - (a.instanceEnd - a.instanceStart));

  const daySlots = {}; 
  instances.forEach(inst => {
    let curDate = new Date(inst.instanceStart);
    curDate.setHours(0,0,0,0);
    const endDate = new Date(inst.instanceEnd);
    endDate.setHours(23,59,59,999);

    let availableSlot = 0;
    let slotFound = false;
    while (!slotFound) {
      let canFit = true;
      let tempDate = new Date(curDate);
      while (tempDate <= endDate) {
        const key = toDateKey(tempDate);
        if (daySlots[key] && daySlots[key][availableSlot]) {
          canFit = false;
          break;
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }
      if (canFit) {
        slotFound = true;
      } else {
        availableSlot++;
      }
    }

    let tempDate = new Date(curDate);
    while (tempDate <= endDate) {
      const key = toDateKey(tempDate);
      if (!daySlots[key]) daySlots[key] = [];
      daySlots[key][availableSlot] = inst;
      tempDate.setDate(tempDate.getDate() + 1);
    }
  });

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    cells.push(date);
  }

  els.calendarGrid.innerHTML = cells.map((date) => calendarDayTemplate(date, month, daySlots)).join("");
  els.calendarGrid.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDate = button.dataset.date;
      renderCalendar();
      renderSelectedDateList();
    });
  });
}

function calendarDayTemplate(date, activeMonth, daySlots) {
  const dateKey = toDateKey(date);
  const slots = daySlots[dateKey] || [];
  
  const isToday = dateKey === toDateKey(new Date());
  const muted = date.getMonth() !== activeMonth ? "muted" : "";
  const selected = dateKey === selectedDate ? "selected" : "";
  const todayClass = isToday ? "today" : "";
  
  const items = slots.filter(Boolean);
  const importantClass = items.some((item) => item.important) ? "important" : "";
  
  let content = "";
  if (calendarViewMode === "dots") {
    const dots = items.slice(0, 10).map((item) => {
      const category = getCategory(item.categoryId);
      const color = category ? category.color : "#64748b";
      return `<span class="day-dot" style="background:${color}"></span>`;
    }).join("");
    content = dots ? `<div class="day-dots">${dots}</div>` : "";
  } else {
    let slotHtml = "";
    // Always render exactly 3 slots to maintain fixed height
    for (let i = 0; i <= 2; i++) {
      const item = slots[i];
      if (!item) {
        slotHtml += `<div class="day-item pill placeholder">.</div>`;
      } else {
        const category = getCategory(item.categoryId);
        const color = category ? category.color : "#64748b";
        
        let spanClass = "span-middle";
        const startKey = toDateKey(item.instanceStart);
        const endKey = toDateKey(item.instanceEnd);
        
        if (startKey === dateKey && endKey === dateKey) spanClass = ""; 
        else if (startKey === dateKey) spanClass = "span-left";
        else if (endKey === dateKey) spanClass = "span-right";
        
        const title = escapeHtml(item.title);
        slotHtml += `<div class="day-item pill ${spanClass}" style="background:${color}" title="${title}">${title}</div>`;
      }
    }
    content = `<div class="day-slots">${slotHtml}</div>`;
  }

  return `
    <button class="calendar-day ${muted} ${selected} ${todayClass}" type="button" data-date="${dateKey}">
      <span class="day-number">
        <span>${date.getDate()}</span>
        ${items.length ? `<span class="day-count ${importantClass}">${items.length}项</span>` : ""}
      </span>
      ${content}
    </button>
  `;
}

function renderSelectedDateList() {
  els.selectedDateTitle.textContent = selectedDate;
  
  // Find instances for selectedDate
  const start = new Date(selectedDate);
  const end = new Date(selectedDate);
  end.setHours(23, 59, 59, 999);
  const items = getSchedulesForDateRange(start, end).sort((a, b) => a.instanceStart - b.instanceStart);


  if (!items.length) {
    els.selectedDateList.innerHTML = `<div class="empty-state">当天暂无日程</div>`;
    return;
  }

  els.selectedDateList.innerHTML = items.map((schedule) => scheduleCardTemplate(schedule)).join("");
  els.selectedDateList.querySelectorAll("[data-toggle-subtask]").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const [scheduleId, subtaskId] = e.target.dataset.toggleSubtask.split("|");
      toggleSubtask(scheduleId, subtaskId);
    });
  });
  els.selectedDateList.querySelectorAll("[data-toggle-schedule]").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => toggleScheduleStatus(e.target.dataset.toggleSchedule, e.target.checked));
  });
  els.selectedDateList.querySelectorAll("[data-edit-schedule]").forEach((button) => {
    button.addEventListener("click", () => openScheduleDialog(button.dataset.editSchedule));
  });
  els.selectedDateList.querySelectorAll("[data-delete-schedule]").forEach((button) => {
    button.addEventListener("click", () => deleteSchedule(button.dataset.deleteSchedule));
  });
}

function renderCategories() {
  renderSidebarCategoryList();
  if (!state.categories.length) {
    els.categoryList.innerHTML = `<div class="empty-state">暂无分类</div>`;
    return;
  }

  const now = new Date();

  els.categoryList.innerHTML = state.categories
    .map((category) => {
      const catSchedules = state.schedules.filter(s => s.categoryId === category.id);
      const total = catSchedules.length;
      const completed = catSchedules.filter(s => s.status === 'completed').length;
      
      const overdue = catSchedules.filter(s => {
        if (s.status === 'completed') return false;
        if (s.status === 'delayed') return true;
        const endTime = s.endTime ? new Date(s.endTime) : new Date(s.startTime);
        return endTime < now;
      }).length;
      
      const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

      return `
        <article class="category-card">
          <div>
            <h3><span class="color-dot" style="background:${category.color}"></span>${escapeHtml(category.name)}</h3>
            <p>${escapeHtml(category.note || "无备注")}</p>
            <div class="category-stats">
              <div class="stat-item">
                <span class="stat-value">${total}</span>
                <span class="stat-label">总数</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${completed}</span>
                <span class="stat-label">已完成</span>
              </div>
              <div class="stat-item">
                <span class="stat-value ${overdue > 0 ? 'danger' : ''}">${overdue}</span>
                <span class="stat-label">逾期</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${rate}%</span>
                <span class="stat-label">完成率</span>
              </div>
            </div>
          </div>
          <div class="card-actions" style="display: flex; gap: 4px; align-items: flex-start;">
            <button class="action-icon-btn" type="button" data-edit-category="${category.id}" aria-label="编辑" title="编辑">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="action-icon-btn danger" type="button" data-delete-category="${category.id}" aria-label="删除" title="删除">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  els.categoryList.querySelectorAll("[data-edit-category]").forEach((button) => {
    button.addEventListener("click", () => openCategoryDialog(button.dataset.editCategory));
  });
  els.categoryList.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => deleteCategory(button.dataset.deleteCategory));
  });
}

function renderCategoryOptions() {
  const options = state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .concat([`<option value="">未分类</option>`])
    .join("");
  document.querySelector("#scheduleCategory").innerHTML = options;
  if (els.categoryFilter) {
    const filterOptions = [`<option value="all">所有分类</option>`]
      .concat(state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`))
      .concat([`<option value="uncategorized">未分类</option>`])
      .join("");
    const prevVal = els.categoryFilter.value;
    els.categoryFilter.innerHTML = filterOptions;
    els.categoryFilter.value = prevVal || "all";
    new CustomSelect(els.categoryFilter);
  }
}

function openScheduleDialog(id = "") {
  const schedule = state.schedules.find((item) => item.id === id);
  document.querySelector("#scheduleDialogTitle").textContent = schedule ? "编辑日程" : "新增日程";
  document.querySelector("#scheduleId").value = schedule?.id || "";
  document.querySelector("#scheduleTitle").value = schedule?.title || "";
  document.querySelector("#scheduleContent").value = schedule?.content || "";
  
  const fpConfig = {
    enableTime: true,
    dateFormat: "Y-m-d\\TH:i",
    locale: Mandarin,
    onOpen: function(selectedDates, dateStr, instance) {
      if (!instance.calendarContainer.hasAttribute('popover')) {
          instance.calendarContainer.setAttribute('popover', 'manual');
          // Reset popover default UA styles so flatpickr's inline styles work
          instance.calendarContainer.style.margin = '0';
          instance.calendarContainer.style.inset = 'auto';
      }
      try { instance.calendarContainer.showPopover(); } catch(e){}
    },
    onClose: function(selectedDates, dateStr, instance) {
      try { instance.calendarContainer.hidePopover(); } catch(e){}
    },
    plugins: [new confirmDatePlugin({ confirmText: "确定", showAlways: true, theme: "light" })]
  };
  
  const defaultStart = schedule?.startTime || toInputDateTime(new Date());
  flatpickr("#scheduleStartTime", { ...fpConfig, defaultDate: defaultStart });
  
  const defaultEnd = schedule?.endTime || "";
  if (defaultEnd) {
    flatpickr("#scheduleEndTime", { ...fpConfig, defaultDate: defaultEnd });
  } else {
    flatpickr("#scheduleEndTime", fpConfig);
  }

  document.querySelector("#scheduleRecurrence").value = schedule?.recurrence || "none";
  document.querySelector("#scheduleCategory").value = schedule?.categoryId || "";
  document.querySelector("#scheduleStatus").value = schedule?.status || "pending";
  document.querySelector("#scheduleReminder").value = schedule?.reminder || "none";
  document.querySelector("#scheduleImportant").checked = Boolean(schedule?.important);
  currentSubtasks = schedule?.subtasks ? JSON.parse(JSON.stringify(schedule.subtasks)) : [];
  renderDialogSubtasks();
  els.scheduleDialog.showModal();
}

function renderDialogSubtasks() {
  if (!els.dialogSubtaskList) return;
  if (!currentSubtasks.length) {
    els.dialogSubtaskList.innerHTML = '<span style="font-size: 12px; color: var(--muted);">暂无子任务</span>';
    return;
  }
  els.dialogSubtaskList.innerHTML = currentSubtasks.map(st => `
    <div class="dialog-subtask-row">
      <input type="text" class="dialog-subtask-input" value="${escapeHtml(st.title)}" data-edit-subtask="${st.id}" />
      <button type="button" class="plain-button" style="padding: 4px; min-height: 24px; color: #ff3b30;" title="删除子任务" data-delete-subtask="${st.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join("");
}

function saveSchedule(event) {
  event.preventDefault();
  const id = document.querySelector("#scheduleId").value;
  const now = new Date().toISOString();
  const payload = {
    title: document.querySelector("#scheduleTitle").value.trim(),
    content: document.querySelector("#scheduleContent").value.trim(),
    startTime: document.querySelector("#scheduleStartTime").value,
    endTime: document.querySelector("#scheduleEndTime").value,
    recurrence: document.querySelector("#scheduleRecurrence").value,
    categoryId: document.querySelector("#scheduleCategory").value,
    status: document.querySelector("#scheduleStatus").value,
    reminder: document.querySelector("#scheduleReminder").value,
    important: document.querySelector("#scheduleImportant").checked,
    updatedAt: now,
    isNotified: false,
    subtasks: currentSubtasks,
  };

  payload.time = payload.startTime;

  if (!payload.title || !payload.startTime) return;

  if (id) {
    state.schedules = state.schedules.map((schedule) => (schedule.id === id ? { ...schedule, ...payload } : schedule));
  } else {
    state.schedules.push({ ...payload, id: createId("sch"), createdAt: now });
  }

  persist();
  els.scheduleDialog.close();
  renderSchedules();
}


function customConfirm(message) {
  return new Promise((resolve) => {
    const dialog = document.querySelector("#confirmDialog");
    document.querySelector("#confirmDialogMessage").textContent = message;
    
    const confirmBtn = document.querySelector("#confirmDialogConfirmBtn");
    const cancelBtn = document.querySelector("#confirmDialogCancelBtn");
    
    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    
    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    
    function cleanup() {
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      dialog.close();
    }
    
    dialog.showModal();
  });
}

async function deleteSchedule(id) {
  if (!(await customConfirm("确认删除这个日程？"))) return;
  state.schedules = state.schedules.filter((schedule) => schedule.id !== id);
  persist();
  renderAll();
}

function toggleScheduleStatus(id, isCompleted) {
  const schedule = state.schedules.find((item) => item.id === id);
  if (schedule) {
    schedule.status = isCompleted ? "completed" : "pending";
    schedule.updatedAt = new Date().toISOString();
    persist();
    renderAll();
  }
}

function openCategoryDialog(id = "") {
  const category = state.categories.find((item) => item.id === id);
  document.querySelector("#categoryDialogTitle").textContent = category ? "编辑分类" : "新增分类";
  document.querySelector("#categoryId").value = category?.id || "";
  document.querySelector("#categoryName").value = category?.name || "";
  document.querySelector("#categoryColor").value = category?.color || "#2563eb";
  document.querySelector("#categoryNote").value = category?.note || "";
  els.categoryDialog.showModal();
}

function saveCategory(event) {
  event.preventDefault();
  const id = document.querySelector("#categoryId").value;
  const payload = {
    name: document.querySelector("#categoryName").value.trim(),
    color: document.querySelector("#categoryColor").value,
    note: document.querySelector("#categoryNote").value.trim(),
  };

  if (!payload.name) return;

  if (id) {
    state.categories = state.categories.map((category) => (category.id === id ? { ...category, ...payload } : category));
  } else {
    state.categories.push({ ...payload, id: createId("cat") });
  }

  persist();
  els.categoryDialog.close();
  renderCategoryOptions();
  renderCategories();
  renderSchedules();
}

function deleteCategory(id) {
  if (!confirm("确认删除这个分类？相关日程会变为未分类。")) return;
  state.categories = state.categories.filter((category) => category.id !== id);
  state.schedules = state.schedules.map((schedule) => (schedule.categoryId === id ? { ...schedule, categoryId: "" } : schedule));
  persist();
  renderCategoryOptions();
  renderCategories();
  renderSchedules();
}

function changeMonth(offset) {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1);
  selectedDate = toDateKey(calendarDate);
  renderCalendar();
  renderSelectedDateList();
}

function getCategory(id) {
  return state.categories.find((category) => category.id === id);
}

function addHours(date, hours) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toInputDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return `${toDateKey(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initNotifications() {
  try {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
  } catch (e) {
    console.warn("Tauri Notification API error, fallback might be used", e);
  }
}

function checkReminders() {
  const now = new Date();
  let changed = false;

  state.schedules.forEach(schedule => {
    
    if (schedule.status === "completed" || schedule.isNotified || !schedule.reminder || schedule.reminder === "none") return;
    
    const scheduleTime = new Date(schedule.startTime);
    let offsetMinutes = 0;
    if (schedule.reminder === "10m") offsetMinutes = 10;
    if (schedule.reminder === "30m") offsetMinutes = 30;
    if (schedule.reminder === "1h") offsetMinutes = 60;
    
    const triggerTime = new Date(scheduleTime.getTime() - offsetMinutes * 60000);
    
    // Trigger if we are past the notification time but before the schedule time (to avoid notifying old missed schedules)
    if (now >= triggerTime && now <= scheduleTime) {
      schedule.isNotified = true;
      changed = true;
      try {
        sendNotification({
          title: `日程提醒: ${schedule.title}`,
          body: `您的日程将在 ${offsetMinutes} 分钟后开始`
        });
      } catch (e) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`日程提醒: ${schedule.title}`, { body: `您的日程将在 ${offsetMinutes} 分钟后开始` });
        }
      }
    }
  });

  if (changed) {
    persist();
  }
}

initNotifications();
setInterval(checkReminders, 30000);
checkReminders();

function formatScheduleInterval(startTime, endTime, recurrence) {
  const start = formatDateTime(startTime);
  let res = start;
  if (endTime && endTime !== startTime) {
    const end = formatDateTime(endTime);
    res = `${start} 至 ${end}`;
  }
  if (recurrence && recurrence !== 'none') {
    const recMap = { daily: "每天", weekly: "每周", monthly: "每月" };
    res += ` (${recMap[recurrence]})`;
  }
  return res;
}

function toggleSubtask(scheduleId, subtaskId) {
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule || !schedule.subtasks) return;
  const subtask = schedule.subtasks.find(st => st.id === subtaskId);
  if (subtask) {
    subtask.completed = !subtask.completed;
    schedule.updatedAt = new Date().toISOString();
    
    // Check if all subtasks are completed
    const allCompleted = schedule.subtasks.every(st => st.completed);
    if (allCompleted && schedule.subtasks.length > 0) {
      schedule.status = "completed";
    }
    
    persist();
    renderAll();
  }
}


// Custom Select logic


function renderSidebarCategoryList() {
  const container = document.getElementById("sidebarCategoryList");
  if (!container) return;
  
  const currentCat = els.categoryFilter ? els.categoryFilter.value : "all";
  
  let html = ``;
  
  state.categories.forEach(cat => {
    html += `
      <li data-category="${cat.id}" class="${currentCat === cat.id ? 'active' : ''}">
        <span class="category-dot" style="background-color: ${cat.color};"></span>
        ${escapeHtml(cat.name)}
        <span class="count-badge" id="count-cat-${cat.id}">0</span>
      </li>
    `;
  });

  html += `
    <li data-category="uncategorized" class="${currentCat === 'uncategorized' ? 'active' : ''}">
      <span class="category-dot" style="background-color: #8e8e93;"></span>
      未分类
      <span class="count-badge" id="count-cat-uncategorized">0</span>
    </li>
  `;
  container.innerHTML = html;
  updateSidebarCategoryCounts();
  
  // Bind events
  const items = container.querySelectorAll('li');
  items.forEach(li => {
    li.addEventListener('click', (e) => {
      items.forEach(el => el.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      const timeItems = document.querySelectorAll('#smartListFilters li');
      timeItems.forEach(el => el.classList.remove('active'));
      
      if (els.categoryFilter) els.categoryFilter.value = e.currentTarget.dataset.category;
      if (els.timeFilter) els.timeFilter.value = 'all';
      
      renderSchedules();
    });
  });
}

function updateSidebarCategoryCounts() {
  const container = document.getElementById("sidebarCategoryList");
  if (!container) return;
  
  const counts = { uncategorized: 0 };
  state.categories.forEach(cat => counts[cat.id] = 0);
  
  state.schedules.forEach(schedule => {
    if (!schedule.categoryId) {
      counts.uncategorized++;
    } else if (counts[schedule.categoryId] !== undefined) {
      counts[schedule.categoryId]++;
    }
  });
  
  for (const [id, count] of Object.entries(counts)) {
    const el = document.getElementById(`count-cat-${id}`);
    if (el) el.textContent = count;
  }
}
