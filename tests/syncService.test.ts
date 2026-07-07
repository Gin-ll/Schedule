import { describe, it, expect, vi } from 'vitest';
import { LWWConflictResolver, SyncManager, SyncRemoteAdapter, SyncFailedException } from '../src/utils/syncService';
import { Schedule } from '../src/types';

describe('LWWConflictResolver Clock Skew and Revision Tests', () => {
  it('should resolve conflict using logical revision first', () => {
    const resolver = new LWWConflictResolver();

    const local: Schedule = {
      id: 'sch-1',
      title: 'Local (Revision 1)',
      content: '',
      startTime: '',
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false,
      createdAt: '',
      updatedAt: '2026-07-07T12:00:00Z'
    };

    const remote: Schedule = {
      id: 'sch-1',
      title: 'Remote (Revision 2)',
      content: '',
      startTime: '',
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false,
      createdAt: '',
      updatedAt: '2026-07-07T11:59:00Z'
    };

    // 注入逻辑版本号
    (local as any).revision = 1;
    (remote as any).revision = 2;

    // 即使 Local 的 updatedAt (12:00) 晚于 Remote 的 updatedAt (11:59)，
    // 由于 Remote 的 revision (2) 大于 Local 的 revision (1)，Remote 应该获胜。
    const merged = resolver.resolve([local], [remote], 0);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Remote (Revision 2)');
  });

  it('should compensate clock skew when revisions are equal (Remote is 5 minutes ahead)', () => {
    const resolver = new LWWConflictResolver();

    // 5 分钟的时钟偏差补偿：5 * 60 * 1000 = 300,000 ms
    const clockOffset = 5 * 60 * 1000;

    // 场景：物理时钟存在偏差。Remote 的时钟比 Local 快 5 分钟。
    // 假设在物理绝对时间的某一时刻：
    // Local 做了修改，并在其本地时钟上记录为 12:04
    // Remote 做了修改，并在其本地时钟上记录为 12:08 (因为快5分钟，相当于在绝对时间上是 12:03)
    // 绝对时间上，Local (12:04) 晚于 Remote (12:03)，所以 Local 应该是最后的写入者，应该获胜。
    const local: Schedule = {
      id: 'sch-2',
      title: 'Local (Absolute 12:04)',
      content: '',
      startTime: '',
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false,
      createdAt: '',
      updatedAt: '2026-07-07T12:04:00Z'
    };

    const remote: Schedule = {
      id: 'sch-2',
      title: 'Remote (Absolute 12:03, but Clock shows 12:08)',
      content: '',
      startTime: '',
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false,
      createdAt: '',
      updatedAt: '2026-07-07T12:08:00Z'
    };

    (local as any).revision = 1;
    (remote as any).revision = 1;

    // 未进行时钟补偿时：Remote 的 updatedAt (12:08) 大于 Local 的 updatedAt (12:04)，Remote 获胜。
    // 进行时钟补偿时：Remote 补偿后的真实时间为 12:08 - 5 分钟 = 12:03。
    // 此时 Local (12:04) > Remote (12:03)，Local 获胜。
    const mergedWithCompensation = resolver.resolve([local], [remote], clockOffset);
    expect(mergedWithCompensation).toHaveLength(1);
    expect(mergedWithCompensation[0].title).toBe('Local (Absolute 12:04)');
  });
});

describe('SyncManager Exponential Retry', () => {
  const dummySchedule: Schedule = {
    id: 'sch-1',
    title: 'Dummy',
    content: '',
    startTime: new Date().toISOString(),
    recurrence: 'none',
    categoryId: '',
    status: 'pending',
    reminder: 'none',
    important: false,
    createdAt: '',
    updatedAt: ''
  };

  it('should retry up to 3 times and fail with SyncFailedException on continuous network issue', async () => {
    let callCount = 0;
    const mockAdapter: SyncRemoteAdapter = {
      getServerTime: () => Promise.resolve(new Date().toISOString()),
      fetchRemoteChanges: () => Promise.resolve([]),
      pushLocalChanges: vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error("Network Down"));
      })
    };

    const manager = new SyncManager(mockAdapter, 5); // 快速重试间隔 (5ms)
    await expect(manager.sync([dummySchedule])).rejects.toThrowError(SyncFailedException);
    expect(callCount).toBe(4); // 初始执行 + 3次重试 = 4次
  });

  it('should retry on ACK = false and throw SyncFailedException', async () => {
    let callCount = 0;
    const mockAdapter: SyncRemoteAdapter = {
      getServerTime: () => Promise.resolve(new Date().toISOString()),
      fetchRemoteChanges: () => Promise.resolve([]),
      pushLocalChanges: vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(false); // 模拟返回 false
      })
    };

    const manager = new SyncManager(mockAdapter, 5);
    await expect(manager.sync([dummySchedule])).rejects.toThrowError(SyncFailedException);
    expect(callCount).toBe(4);
  });
});

