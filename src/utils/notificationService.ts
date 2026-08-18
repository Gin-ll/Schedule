import { Category, Schedule } from '../types';
import { platform } from './platformAdapter';

// 提醒偏移量（毫秒）：'10m' | '30m' | '1h'
const REMINDER_OFFSET_MS: Record<string, number> = {
  '10m': 10 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

const MAX_REMINDER_MS = 60 * 60 * 1000; // 最大提醒偏移（1h），决定实例展开的展望范围
const POLL_INTERVAL_MS = 30 * 1000;      // 轮询间隔 30s
const CATCHUP_WINDOW_MS = 5 * 60 * 1000; // 补发窗口：提醒时刻错过最多 5 分钟内仍补发
const LOOKAHEAD_MS = 30 * 1000;          // 提前量：最多提前 30s 触发

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// 会话级去重集合（key = `${scheduleId}@${实例时间戳}`）。重启后时间窗口已过，天然不会重复。
const notifiedKeys = new Set<string>();

export interface NotificationItem {
  key: string;
  title: string;
  body: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 展开循环日程在 [now - CATCHUP_WINDOW, now + horizonMs] 窗口内即将到来的实例开始时间。
 * - none       : 仅原 startTime
 * - daily/weekly: 按周期推进，跳过窗口前的迭代
 * - monthly    : 每月同日，目标日超出当月天数时取当月最后一天（如 1/31 → 2/28）
 */
export function getUpcomingInstances(schedule: Schedule, now: Date, horizonMs: number): Date[] {
  const start = new Date(schedule.startTime);
  const results: Date[] = [];
  const windowStart = now.getTime() - CATCHUP_WINDOW_MS;
  const horizon = now.getTime() + horizonMs;

  if (!schedule.recurrence || schedule.recurrence === 'none') {
    const t = start.getTime();
    if (t >= windowStart && t <= horizon) {
      results.push(start);
    }
    return results;
  }

  if (schedule.recurrence === 'monthly') {
    const targetDay = start.getDate();
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const seconds = start.getSeconds();
    const ms = start.getMilliseconds();
    let year = start.getFullYear();
    let month = start.getMonth();
    let guard = 0;
    while (guard < 10000) {
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(targetDay, lastDay);
      const t = new Date(year, month, day, hours, minutes, seconds, ms).getTime();
      if (t > horizon) break;
      if (t >= windowStart) {
        results.push(new Date(t));
      }
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      guard += 1;
    }
    return results;
  }

  const stepMs = schedule.recurrence === 'daily' ? DAY_MS : WEEK_MS;
  let cursor = start.getTime();
  // 跳步：直接定位到窗口起点附近，避免从头遍历（如多年前创建的每日日程）
  if (cursor < windowStart) {
    cursor += Math.ceil((windowStart - cursor) / stepMs) * stepMs;
  }
  let guard = 0;
  while (cursor <= horizon && guard < 1000) {
    results.push(new Date(cursor));
    cursor += stepMs;
    guard += 1;
  }
  return results;
}

function formatBody(schedule: Schedule, inst: Date, category?: Category): string {
  const parts: string[] = [formatTime(inst)];
  if ((!schedule.recurrence || schedule.recurrence === 'none') && schedule.endTime) {
    parts.push(`-${formatTime(new Date(schedule.endTime))}`);
  }
  if (category) {
    parts.push(category.name);
  }
  if (schedule.content) {
    parts.push(schedule.content.slice(0, 40));
  }
  return parts.join(' · ');
}

/**
 * 收集当前应触发的提醒（纯函数，便于单元测试）。
 * 触发窗口：remindAt(=实例时间-提醒偏移) 落在 [now - CATCHUP, now + LOOKAHEAD] 内，
 * 且同一实例未被通知过（会话级去重）。
 */
export function collectDueNotifications(
  schedules: Schedule[],
  categories: Category[],
  now: Date
): NotificationItem[] {
  const horizonMs = MAX_REMINDER_MS + LOOKAHEAD_MS;
  const due: NotificationItem[] = [];
  const nowTs = now.getTime();

  for (const s of schedules) {
    if (s.status === 'completed') continue;
    const offsetMs = REMINDER_OFFSET_MS[s.reminder];
    if (!offsetMs) continue;

    for (const inst of getUpcomingInstances(s, now, horizonMs)) {
      const remindAt = inst.getTime() - offsetMs;
      if (remindAt < nowTs - CATCHUP_WINDOW_MS) continue; // 太久之前的提醒，不再补发
      if (remindAt > nowTs + LOOKAHEAD_MS) continue;       // 还没到提醒时刻

      const key = `${s.id}@${inst.getTime()}`;
      if (notifiedKeys.has(key)) continue;
      notifiedKeys.add(key);

      const category = categories.find(c => c.id === s.categoryId);
      due.push({ key, title: s.title, body: formatBody(s, inst, category) });
    }
  }
  return due;
}

/**
 * 启动到期提醒轮询服务（仅主窗口调用）。返回停止函数。
 * 主窗口关闭时被 Tauri 拦截隐藏而非销毁，渲染进程轮询可持续运行。
 */
export function startNotificationService(store: {
  schedules: Schedule[];
  categories: Category[];
}): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const check = async () => {
    if (running) return;
    running = true;
    try {
      const due = collectDueNotifications(store.schedules, store.categories, new Date());
      for (const item of due) {
        await platform.sendNotification(item.title, item.body);
      }
    } catch (e) {
      console.error("Notification check failed:", e);
    } finally {
      running = false;
    }
  };

  const init = async () => {
    let granted = false;
    try {
      granted = await platform.requestPermission();
    } catch (e) {
      console.warn("Failed to request notification permission:", e);
    }
    if (!granted) {
      console.warn("Notification permission not granted, reminders disabled");
      return;
    }
    // 启动时立即检查一次，补发应用关闭期间错过的提醒
    await check();
    timer = setInterval(check, POLL_INTERVAL_MS);
  };
  init();

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** 仅供测试：清空会话级去重集合，保证用例间隔离 */
export function resetNotificationStateForTest(): void {
  notifiedKeys.clear();
}
