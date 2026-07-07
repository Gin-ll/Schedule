import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock dbManager to prevent real db operations and tauri dependencies
vi.mock('../src/utils/databaseManager', () => {
  return {
    dbManager: {
      select: vi.fn().mockResolvedValue([]),
      execute: vi.fn().mockResolvedValue(null)
    }
  };
});

import { useScheduleStore } from '../src/stores/scheduleStore';

describe('scheduleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should cascade delete category and update schedule timestamps', async () => {
    const store = useScheduleStore();
    store.schedules = [
      {
        id: 'sch-1',
        title: 'Schedule In Category',
        content: '',
        startTime: '2026-07-07T10:00:00',
        categoryId: 'cat-1',
        status: 'pending',
        reminder: 'none',
        important: false,
        createdAt: '2026-07-07T00:00:00',
        updatedAt: '2026-07-07T00:00:00'
      }
    ];

    await store.deleteCategory('cat-1');
    const sch = store.schedules.find(s => s.id === 'sch-1');
    expect(sch!.categoryId).toBe('');
    // Must update updatedAt timestamp
    expect(sch!.updatedAt).not.toBe('2026-07-07T00:00:00');
  });
});
