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

  it('soft-deletes category into trash while keeping schedule association; restore works', async () => {
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
    // 分类从正常列表移除，进入回收站
    expect(store.categories.length).toBe(0);
    await store.loadCategoryTrash();
    expect(store.categoryTrash.length).toBe(1);
    expect(store.categoryTrash[0].id).toBe('cat-1');

    // 日程仍保留该分类关系（删除分类不再解绑）
    const updatedSch = store.schedules.find(s => s.id === 'sch-1');
    expect(updatedSch!.categoryId).toBe('cat-1');

    // 底层 repo 里的分类已软删（正常查询不可见）
    const repoCat = await categoryRepo.get('cat-1');
    expect(repoCat).toBeNull();

    // 恢复分类
    await store.restoreCategory('cat-1');
    expect(store.categories.some(c => c.id === 'cat-1')).toBe(true);
    expect(store.categoryTrash.length).toBe(0);
  });

  it('deleteSchedule moves item to trash; restore and purge work', async () => {
    const store = useScheduleStore();
    await store.addSchedule({
      title: 'Trash Flow',
      content: '',
      startTime: new Date().toISOString(),
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false
    });
    const id = store.schedules[0].id;
    const createdAt = store.schedules[0].createdAt;

    // 等待 1ms，确保删除时刻的 updatedAt 与创建时刻可区分
    await new Promise(resolve => setTimeout(resolve, 2));
    await store.deleteSchedule(id);
    expect(store.schedules.length).toBe(0);

    // 回收站应包含该日程，且 updatedAt 被更新为删除时间
    await store.loadTrash();
    expect(store.trash.length).toBe(1);
    expect(store.trash[0].id).toBe(id);
    expect(store.trash[0].isDeleted).toBe(1);
    expect(store.trash[0].updatedAt).not.toBe(createdAt);

    // 恢复后重新出现在主列表，回收站清空
    await store.restoreSchedule(id);
    expect(store.trash.length).toBe(0);
    expect(store.schedules.some(s => s.id === id)).toBe(true);

    // 再次删除后永久删除
    await store.deleteSchedule(id);
    await store.purgeSchedule(id);
    await store.loadTrash();
    expect(store.trash.length).toBe(0);
  });

  it('emptyTrash permanently deletes all trashed schedules', async () => {
    const store = useScheduleStore();
    for (let i = 0; i < 3; i++) {
      await store.addSchedule({
        title: `Item ${i}`,
        content: '',
        startTime: new Date().toISOString(),
        recurrence: 'none',
        categoryId: '',
        status: 'pending',
        reminder: 'none',
        important: false
      });
    }
    for (const s of store.schedules) {
      await store.deleteSchedule(s.id);
    }
    await store.loadTrash();
    expect(store.trash.length).toBe(3);

    await store.emptyTrash();
    expect(store.trash.length).toBe(0);
    await store.loadTrash();
    expect(store.trash.length).toBe(0);
  });
});
