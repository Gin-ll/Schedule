import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useScheduleStore } from '../src/stores/scheduleStore';
import { MockRepositoryAdapter } from '../src/utils/repositoryAdapter';
import { scheduleRepo, categoryRepo } from '../src/utils/databaseManager';

describe('scheduleStore with Mock Repository', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // 注入内存 mock 适配器实现测试隔离
    scheduleRepo.setAdapter(new MockRepositoryAdapter());
    categoryRepo.setAdapter(new MockRepositoryAdapter());
  });

  it('should load, add and delete schedules correctly', async () => {
    const store = useScheduleStore();
    await store.addSchedule({
      title: 'Unit Test Task',
      content: 'TDD implementation plan',
      startTime: new Date().toISOString(),
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false
    });

    expect(store.schedules.length).toBe(1);
    expect(store.schedules[0].title).toBe('Unit Test Task');
  });

  it('should cascade delete category and update schedule timestamps', async () => {
    const store = useScheduleStore();
    
    const sch = {
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
    };
    
    await scheduleRepo.save(sch.id, sch);
    await categoryRepo.save('cat-1', { id: 'cat-1', name: 'Test Cat', color: '#ff0000' });
    
    await store.loadAll();
    
    expect(store.schedules.length).toBe(1);
    expect(store.categories.length).toBe(1);

    await store.deleteCategory('cat-1');
    const updatedSch = store.schedules.find(s => s.id === 'sch-1');
    expect(updatedSch!.categoryId).toBe('');
    // Must update updatedAt timestamp
    expect(updatedSch!.updatedAt).not.toBe('2026-07-07T00:00:00');
    
    // 底层的 repo 里的 schedule 应该也同步更新了
    const repoSch = await scheduleRepo.get('sch-1');
    expect(repoSch.categoryId).toBe('');
    expect(repoSch.updatedAt).not.toBe('2026-07-07T00:00:00');

    // category 也应该被删除了
    const repoCat = await categoryRepo.get('cat-1');
    expect(repoCat).toBeNull();
  });
});
