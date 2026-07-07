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

function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

    instances.sort((a, b) => a.instanceStart.getTime() - b.instanceStart.getTime() || 
      (b.instanceEnd.getTime() - b.instanceStart.getTime()) - (a.instanceEnd.getTime() - a.instanceStart.getTime()));

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
    for (let i = 0; i < 42; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = toDateKey(date);
      grids.push({
        date,
        dateKey: key,
        isToday: key === todayKey,
        isCurrentMonth: date.getMonth() === month,
        slots: daySlotsMap[key] || [null, null, null],
        allInstances: dayAllInstances[key] || []
      });
    }
    return grids;
  }
}
