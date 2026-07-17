import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useScheduleStore } from '../src/stores/scheduleStore';
import { MockRepositoryAdapter } from '../src/utils/repositoryAdapter';
import { scheduleRepo, categoryRepo, matterRepo } from '../src/utils/databaseManager';

describe('Matters (Projects) Lifecycle in scheduleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // 注入 Mock 实现测试隔离
    scheduleRepo.setAdapter(new MockRepositoryAdapter());
    categoryRepo.setAdapter(new MockRepositoryAdapter());
    matterRepo.setAdapter(new MockRepositoryAdapter());
  });

  it('should load, add, complete and restore matters correctly', async () => {
    const store = useScheduleStore();
    
    // 1. 添加事项
    const mat = await store.addMatter({
      name: '装修新家',
      color: '#10b981',
      icon: '🏠',
      description: '购买新家具'
    });

    expect(store.matters.length).toBe(1);
    expect(store.matters[0].name).toBe('装修新家');
    expect(store.matters[0].status).toBe('active');

    // 2. 标记完成
    await store.completeMatter(mat.id);
    expect(store.matters[0].status).toBe('completed');
    expect(store.matters[0].completedAt).toBeDefined();

    // 3. 恢复事项
    await store.restoreMatter(mat.id);
    expect(store.matters[0].status).toBe('active');
    expect(store.matters[0].completedAt).toBeUndefined();
  });

  it('should cascade delete matters and clear matterId on schedules', async () => {
    const store = useScheduleStore();

    const sch = {
      id: 'sch-1',
      title: '买电视机',
      content: '',
      startTime: '2026-07-17T12:00:00',
      categoryId: '',
      status: 'pending' as const,
      reminder: 'none' as const,
      important: false,
      createdAt: '2026-07-17T00:00:00',
      updatedAt: '2026-07-17T00:00:00',
      matterId: 'mat-1'
    };

    await scheduleRepo.save(sch.id, sch);
    await matterRepo.save('mat-1', { id: 'mat-1', name: '装修', color: '#ff0000', status: 'active', createdAt: '2026-07-17T00:00:00' });

    await store.loadAll();

    expect(store.schedules.length).toBe(1);
    expect(store.matters.length).toBe(1);

    // 删除项目，验证日程的 matterId 自动置空
    await store.deleteMatter('mat-1');
    expect(store.matters.length).toBe(0);
    expect(store.schedules[0].matterId).toBe('');

    const repoSch = await scheduleRepo.get('sch-1');
    expect(repoSch.matterId).toBe('');
  });

  it('should batch complete schedules linked to a matter', async () => {
    const store = useScheduleStore();

    const sch1 = {
      id: 'sch-1',
      title: '买电视机',
      content: '',
      startTime: '2026-07-17T12:00:00',
      categoryId: '',
      status: 'pending' as const,
      reminder: 'none' as const,
      important: false,
      createdAt: '2026-07-17T00:00:00',
      updatedAt: '2026-07-17T00:00:00',
      matterId: 'mat-1'
    };

    const sch2 = {
      id: 'sch-2',
      title: '买沙发',
      content: '',
      startTime: '2026-07-17T13:00:00',
      categoryId: '',
      status: 'pending' as const,
      reminder: 'none' as const,
      important: false,
      createdAt: '2026-07-17T00:00:00',
      updatedAt: '2026-07-17T00:00:00',
      matterId: 'mat-1'
    };

    await scheduleRepo.save(sch1.id, sch1);
    await scheduleRepo.save(sch2.id, sch2);
    await matterRepo.save('mat-1', { id: 'mat-1', name: '装修', color: '#ff0000', status: 'active', createdAt: '2026-07-17T00:00:00' });

    await store.loadAll();

    expect(store.schedules.length).toBe(2);
    expect(store.schedules.every(s => s.status === 'pending')).toBe(true);

    // 批量完成项目下的任务
    await store.completeSchedulesByMatter('mat-1');
    expect(store.schedules.every(s => s.status === 'completed')).toBe(true);

    const repoSch1 = await scheduleRepo.get('sch-1');
    expect(repoSch1.status).toBe('completed');
  });
});
