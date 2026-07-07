import { describe, it, expect } from 'vitest';
import { CalendarEngine } from '../src/utils/calendarEngine';
import { Schedule } from '../src/types';

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
