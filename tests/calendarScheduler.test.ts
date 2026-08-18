import { describe, it, expect } from 'vitest';
import { CalendarEngine } from '../src/utils/calendarEngine';
import { Schedule } from '../src/types';

function makeSchedule(partial: Partial<Schedule>): Schedule {
  return {
    id: 'sch',
    title: 'Test',
    content: '',
    startTime: new Date().toISOString(),
    recurrence: 'none',
    categoryId: '',
    status: 'pending',
    reminder: 'none',
    important: false,
    createdAt: '',
    updatedAt: '',
    ...partial
  };
}

describe('CalendarEngine.generateGrid', () => {
  it('should generate exactly 42 slots containing correct dates', () => {
    const schedules: Schedule[] = [];
    const activeDate = new Date(2026, 6, 1); // 2026-07-01
    const grid = CalendarEngine.generateGrid(schedules, activeDate);

    expect(grid.length).toBe(42);
    expect(grid[0].dateKey).toBe('2026-06-29'); // 2026-07-01 是周三，周一为 6-29
  });

  it('should allocate correct horizontal slots for overlapping schedules', () => {
    const mockSchedules: Schedule[] = [
      {
        id: 'sch-1',
        title: 'Event A',
        content: '',
        startTime: '2026-07-07T10:00:00',
        endTime: '2026-07-08T12:00:00',
        recurrence: 'none',
        categoryId: '',
        status: 'pending',
        reminder: 'none',
        important: false,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'sch-2',
        title: 'Event B',
        content: '',
        startTime: '2026-07-07T11:00:00',
        endTime: '2026-07-07T13:00:00',
        recurrence: 'none',
        categoryId: '',
        status: 'pending',
        reminder: 'none',
        important: false,
        createdAt: '',
        updatedAt: ''
      }
    ];
    
    const grid = CalendarEngine.generateGrid(mockSchedules, new Date(2026, 6, 1));
    const daySlot = grid.find(d => d.dateKey === '2026-07-07');
    expect(daySlot).toBeDefined();
    // Event A should occupy slot 0, Event B should occupy slot 1
    expect(daySlot!.slots[0]?.id).toBe('sch-1');
    expect(daySlot!.slots[1]?.id).toBe('sch-2');
  });
});

describe('CalendarEngine.generateWeekGrid', () => {
  it('should generate 7 days starting Monday', () => {
    const grid = CalendarEngine.generateWeekGrid([], new Date(2026, 7, 5)); // 2026-08-05 周三
    expect(grid.length).toBe(7);
    expect(grid[0].dateKey).toBe('2026-08-03');
    expect(grid[6].dateKey).toBe('2026-08-09');
  });

  it('should expand daily schedules into every day of the week', () => {
    const daily = makeSchedule({
      id: 'daily-1',
      startTime: '2026-08-03T09:00:00',
      endTime: '2026-08-03T10:00:00',
      recurrence: 'daily'
    });
    const grid = CalendarEngine.generateWeekGrid([daily], new Date(2026, 7, 5));
    for (const day of grid) {
      expect(day.allInstances.some(i => i.id === 'daily-1')).toBe(true);
    }
    // 实例时刻应为每天的 9:00
    const monday = grid.find(d => d.dateKey === '2026-08-03')!;
    expect(monday.allInstances[0].instanceStart.getHours()).toBe(9);
  });

  it('should only include non-daily schedules intersecting the week', () => {
    const inside = makeSchedule({ id: 'in', startTime: '2026-08-05T10:00:00', recurrence: 'none' });
    const outside = makeSchedule({ id: 'out', startTime: '2026-08-20T10:00:00', recurrence: 'none' });
    const grid = CalendarEngine.generateWeekGrid([inside, outside], new Date(2026, 7, 5));
    const wednesday = grid.find(d => d.dateKey === '2026-08-05')!;
    expect(wednesday.allInstances.some(i => i.id === 'in')).toBe(true);
    expect(wednesday.allInstances.some(i => i.id === 'out')).toBe(false);
  });
});

describe('CalendarEngine.getDayInstances', () => {
  it('should include cross-day schedules intersecting the target day, keeping original times', () => {
    const crossDay = makeSchedule({
      id: 'cross',
      startTime: '2026-08-07T22:00:00',
      endTime: '2026-08-08T02:00:00',
      recurrence: 'none'
    });
    const instances = CalendarEngine.getDayInstances([crossDay], new Date(2026, 7, 8));
    expect(instances.some(i => i.id === 'cross')).toBe(true);
    const inst = instances.find(i => i.id === 'cross')!;
    expect(inst.instanceStart.getTime()).toBe(new Date('2026-08-07T22:00:00').getTime());
    expect(inst.instanceEnd.getTime()).toBe(new Date('2026-08-08T02:00:00').getTime());
  });

  it('should expand the daily instance for the target day', () => {
    const daily = makeSchedule({ id: 'd', startTime: '2026-08-01T09:00:00', recurrence: 'daily' });
    const instances = CalendarEngine.getDayInstances([daily], new Date(2026, 7, 5));
    expect(instances.length).toBe(1);
    expect(instances[0].instanceStart.getDate()).toBe(5);
    expect(instances[0].instanceStart.getHours()).toBe(9);
  });
});
