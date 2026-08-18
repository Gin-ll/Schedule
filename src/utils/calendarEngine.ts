import { Schedule } from '../types';

export interface ScheduleInstance extends Schedule {
  instanceStart: Date;
  instanceEnd: Date;
}

export interface CalendarDaySlot {
  date: Date;
  dateKey: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  slots: (ScheduleInstance | null)[];
  allInstances: ScheduleInstance[];
}

export function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 在 [windowStart, windowEnd] 窗口内展开所有日程实例：
 * - daily 循环：以 startTime 为起点逐日展开（起点早于窗口则钳到窗口起点，保留原时分秒）
 * - 非 daily：与窗口有交集则直接收录
 * 结果按开始时间升序、时长降序排序。
 */
export function expandInstances(
  schedules: Schedule[],
  windowStart: Date,
  windowEnd: Date
): ScheduleInstance[] {
  const start = new Date(windowStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(windowEnd);
  end.setHours(23, 59, 59, 999);

  const instances: ScheduleInstance[] = [];
  schedules.forEach(schedule => {
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
        instances.push({
          ...schedule,
          instanceStart: new Date(cur),
          instanceEnd: new Date(cur.getTime() + duration)
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      if (sStart <= end && sEnd >= start) {
        instances.push({ ...schedule, instanceStart: sStart, instanceEnd: sEnd });
      }
    }
  });

  instances.sort(
    (a, b) =>
      a.instanceStart.getTime() - b.instanceStart.getTime() ||
      (b.instanceEnd.getTime() - b.instanceStart.getTime()) -
        (a.instanceEnd.getTime() - a.instanceStart.getTime())
  );
  return instances;
}

/** 将实例分配到 [startDate, startDate + dayCount) 的每日槽位（最多 3 槽，跨日占满） */
function buildDaySlots(
  instances: ScheduleInstance[],
  startDate: Date,
  dayCount: number,
  isCurrentMonthFn?: (date: Date) => boolean
): CalendarDaySlot[] {
  const daySlotsMap: Record<string, (ScheduleInstance | null)[]> = {};
  const dayAllInstances: Record<string, ScheduleInstance[]> = {};

  instances.forEach(inst => {
    const curDate = new Date(inst.instanceStart);
    curDate.setHours(0, 0, 0, 0);
    const endDate = new Date(inst.instanceEnd);
    endDate.setHours(23, 59, 59, 999);

    let availableSlot = 0;
    let slotFound = false;
    while (!slotFound && availableSlot < 3) {
      let canFit = true;
      let tempDate = new Date(curDate);
      while (tempDate <= endDate) {
        const key = toDateKey(tempDate);
        if (daySlotsMap[key] && daySlotsMap[key][availableSlot]) {
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

    if (slotFound) {
      let tempDate = new Date(curDate);
      while (tempDate <= endDate) {
        const key = toDateKey(tempDate);
        if (!daySlotsMap[key]) daySlotsMap[key] = [null, null, null];
        daySlotsMap[key][availableSlot] = inst;
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }

    let tempDate = new Date(curDate);
    while (tempDate <= endDate) {
      const key = toDateKey(tempDate);
      if (!dayAllInstances[key]) dayAllInstances[key] = [];
      dayAllInstances[key].push(inst);
      tempDate.setDate(tempDate.getDate() + 1);
    }
  });

  const grids: CalendarDaySlot[] = [];
  const todayKey = toDateKey(new Date());
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = toDateKey(date);
    grids.push({
      date,
      dateKey: key,
      isToday: key === todayKey,
      isCurrentMonth: isCurrentMonthFn ? isCurrentMonthFn(date) : true,
      slots: daySlotsMap[key] || [null, null, null],
      allInstances: dayAllInstances[key] || []
    });
  }
  return grids;
}

export class CalendarEngine {
  static generateGrid(schedules: Schedule[], activeMonthDate: Date): CalendarDaySlot[] {
    const year = activeMonthDate.getFullYear();
    const month = activeMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);

    const start = new Date(firstDay);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 41);
    end.setHours(23, 59, 59, 999);

    const instances = expandInstances(schedules, start, end);
    return buildDaySlots(instances, start, 42, date => date.getMonth() === month);
  }

  /** 生成周一起的 7 天周视图网格 */
  static generateWeekGrid(schedules: Schedule[], anchorDate: Date): CalendarDaySlot[] {
    const start = new Date(anchorDate);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const instances = expandInstances(schedules, start, end);
    return buildDaySlots(instances, start, 7);
  }

  /** 返回某一天的全部日程实例（含跨天日程与 daily 当日实例） */
  static getDayInstances(schedules: Schedule[], date: Date): ScheduleInstance[] {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return expandInstances(schedules, start, end);
  }
}

/**
 * 时间吸附：将毫秒时间吸附到最近的 step 网格（默认 15 分钟）。
 * 用于拖拽改时间的对齐。
 */
export function snapToMinutes(ms: number, step: number = 15 * 60 * 1000): number {
  return Math.round(ms / step) * step;
}

/** 实例开始时间在目标日内的分钟数（0-1440，越界钳制），供日视图时间轴 top 定位 */
export function minutesToTop(instanceStart: Date, date: Date): number {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const ms = instanceStart.getTime() - dayStart.getTime();
  return Math.max(0, Math.min(1440, ms / 60000));
}

/**
 * 将实例移动到目标日（周视图跨天拖拽）：保持原时分秒与时长，
 * endTime 按时长平移（跨天时自然延伸）。返回可直接写入 store 的时间字段。
 */
export function moveToDate(
  instance: Pick<Schedule, 'startTime' | 'endTime'>,
  targetDate: Date
): { startTime: string; endTime?: string } {
  const sStart = new Date(instance.startTime);
  const target = new Date(targetDate);
  target.setHours(sStart.getHours(), sStart.getMinutes(), sStart.getSeconds(), sStart.getMilliseconds());

  const result: { startTime: string; endTime?: string } = {
    startTime: target.toISOString()
  };
  if (instance.endTime) {
    const duration = new Date(instance.endTime).getTime() - sStart.getTime();
    result.endTime = new Date(target.getTime() + duration).toISOString();
  }
  return result;
}
