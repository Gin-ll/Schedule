import { describe, it, expect } from 'vitest';
import { generateCalendarGrid } from '../src/utils/calendarScheduler';
import { Schedule } from '../src/types';

describe('generateCalendarGrid', () => {
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
    
    const grid = generateCalendarGrid(mockSchedules, new Date(2026, 6, 1));
    const daySlot = grid.find(d => d.dateKey === '2026-07-07');
    expect(daySlot).toBeDefined();
    // Event A should occupy slot 0, Event B should occupy slot 1
    expect(daySlot!.slots[0]?.id).toBe('sch-1');
    expect(daySlot!.slots[1]?.id).toBe('sch-2');
  });
});
