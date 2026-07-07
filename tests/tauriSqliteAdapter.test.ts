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
      "schedules",
      Promise.resolve(mockDbConnection as any)
    );

    const p1 = adapter.save('k1', { id: 'k1', val: 'a' });
    const p2 = adapter.save('k2', { id: 'k2', val: 'b' });

    await Promise.all([p1, p2]);

    expect(maxConcurrent).toBe(1); // 串行队列并发应为 1
    expect(mockDbConnection.execute).toHaveBeenCalledTimes(4); // 2次 PRAGMA + 2次 INSERT

    // 检查具体的执行顺序，验证 PRAGMA 仅在初始化时执行了一次，随后串行执行 INSERT
    expect(executionOrder[0]).toContain('PRAGMA journal_mode=WAL');
    expect(executionOrder[2]).toContain('PRAGMA busy_timeout=5000');
    expect(executionOrder[4]).toContain('INSERT INTO schedules');
    expect(executionOrder[6]).toContain('INSERT INTO schedules');
  });

  it('should perform get, getAll and delete operations correctly', async () => {
    const mockData = [
      { data: JSON.stringify({ id: 'k1', val: 'a' }) },
      { data: JSON.stringify({ id: 'k2', val: 'b' }) }
    ];

    const mockDbConnection = {
      execute: vi.fn().mockResolvedValue([1]),
      select: vi.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('WHERE id = ?')) {
          const id = params?.[0];
          const found = mockData.find(item => JSON.parse(item.data).id === id);
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
    expect(item).toEqual({ id: 'k1', val: 'a' });

    const nonExistent = await adapter.get('k3');
    expect(nonExistent).toBeNull();

    const allItems = await adapter.getAll();
    expect(allItems).toEqual([
      { id: 'k1', val: 'a' },
      { id: 'k2', val: 'b' }
    ]);

    await adapter.delete('k1');
    expect(mockDbConnection.execute).toHaveBeenCalledWith(
      'UPDATE schedules SET is_deleted = 1 WHERE id = ?',
      ['k1']
    );
  });
});
