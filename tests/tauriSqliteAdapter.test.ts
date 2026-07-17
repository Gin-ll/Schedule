import { describe, it, expect, vi } from 'vitest';
import { TauriSqliteAdapter } from '../src/utils/tauriSqliteAdapter';

describe('TauriSqliteAdapter', () => {
  it('should execute SQLite statements sequentially via writeQueue', async () => {
    let activeExecutions = 0;
    let maxConcurrent = 0;
    const executionOrder: string[] = [];

    const mockDbConnection = {
      execute: vi.fn().mockImplementation((sql: string) => {
        activeExecutions++;
        if (activeExecutions > maxConcurrent) maxConcurrent = activeExecutions;
        executionOrder.push(`start-${sql}`);
        return new Promise(res => {
          setTimeout(() => {
            executionOrder.push(`end-${sql}`);
            activeExecutions--;
            res([1]);
          }, 30);
        });
      }),
      select: vi.fn().mockImplementation(() => Promise.resolve([]))
    };

    const adapter = new TauriSqliteAdapter(
      "categories",
      Promise.resolve(mockDbConnection as any)
    );

    const p1 = adapter.save('k1', { id: 'k1', name: 'cat A', color: '#ff0000' });
    const p2 = adapter.save('k2', { id: 'k2', name: 'cat B', color: '#00ff00' });

    await Promise.all([p1, p2]);

    expect(maxConcurrent).toBe(1); // 串行队列并发应为 1
    expect(mockDbConnection.execute).toHaveBeenCalledTimes(4); // 2次 PRAGMA + 2次 INSERT

    // 检查具体的执行顺序，验证 PRAGMA 仅在初始化时执行了一次，随后串行执行 INSERT
    expect(executionOrder[0]).toContain('PRAGMA journal_mode=WAL');
    expect(executionOrder[2]).toContain('PRAGMA busy_timeout=5000');
    expect(executionOrder[4]).toContain('INSERT INTO categories');
    expect(executionOrder[6]).toContain('INSERT INTO categories');
  });

  it('should perform get, getAll and delete operations correctly', async () => {
    const mockData = [
      {
        id: 'k1',
        title: 'Event 1',
        content: 'Content 1',
        start_time: '2026-07-07T12:00:00Z',
        end_time: null,
        recurrence: 'none',
        category_id: '',
        status: 'pending',
        reminder: 'none',
        important: 0,
        created_at: '2026-07-07T12:00:00Z',
        updated_at: '2026-07-07T12:00:00Z',
        is_deleted: 0,
        revision: 1
      },
      {
        id: 'k2',
        title: 'Event 2',
        content: 'Content 2',
        start_time: '2026-07-07T13:00:00Z',
        end_time: null,
        recurrence: 'none',
        category_id: '',
        status: 'pending',
        reminder: 'none',
        important: 1,
        created_at: '2026-07-07T13:00:00Z',
        updated_at: '2026-07-07T13:00:00Z',
        is_deleted: 0,
        revision: 1
      }
    ];

    const mockDbConnection = {
      execute: vi.fn().mockResolvedValue([1]),
      select: vi.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.toLowerCase().includes('subtasks')) {
          return Promise.resolve([]);
        }
        if (sql.includes('WHERE id = ?')) {
          const id = params?.[0];
          const found = mockData.find(item => item.id === id);
          return Promise.resolve(found ? [found] : []);
        }
        return Promise.resolve(mockData);
      })
    };

    const adapter = new TauriSqliteAdapter(
      "schedules",
      Promise.resolve(mockDbConnection as any)
    );

    const item = await adapter.get('k1');
    expect(item).toEqual({
      id: 'k1',
      title: 'Event 1',
      content: 'Content 1',
      startTime: '2026-07-07T12:00:00Z',
      endTime: undefined,
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false,
      createdAt: '2026-07-07T12:00:00Z',
      updatedAt: '2026-07-07T12:00:00Z',
      isDeleted: 0,
      revision: 1,
      subtasks: [],
      matterId: ''
    });

    const nonExistent = await adapter.get('k3');
    expect(nonExistent).toBeNull();

    const allItems = await adapter.getAll();
    expect(allItems).toEqual([
      {
        id: 'k1',
        title: 'Event 1',
        content: 'Content 1',
        startTime: '2026-07-07T12:00:00Z',
        endTime: undefined,
        recurrence: 'none',
        categoryId: '',
        status: 'pending',
        reminder: 'none',
        important: false,
        createdAt: '2026-07-07T12:00:00Z',
        updatedAt: '2026-07-07T12:00:00Z',
        isDeleted: 0,
        revision: 1,
        subtasks: [],
        matterId: ''
      },
      {
        id: 'k2',
        title: 'Event 2',
        content: 'Content 2',
        startTime: '2026-07-07T13:00:00Z',
        endTime: undefined,
        recurrence: 'none',
        categoryId: '',
        status: 'pending',
        reminder: 'none',
        important: true,
        createdAt: '2026-07-07T13:00:00Z',
        updatedAt: '2026-07-07T13:00:00Z',
        isDeleted: 0,
        revision: 1,
        subtasks: [],
        matterId: ''
      }
    ]);

    await adapter.delete('k1');
    expect(mockDbConnection.execute).toHaveBeenCalledWith(
      'UPDATE schedules SET is_deleted = 1 WHERE id = ?',
      ['k1']
    );
  });
});
