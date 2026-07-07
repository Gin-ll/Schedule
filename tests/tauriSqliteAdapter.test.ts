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

    const sqlOrder = executionOrder.filter(line => !line.includes('PRAGMA'));
    expect(maxConcurrent).toBe(1); // 串行队列并发应为 1
    expect(sqlOrder[0]).toContain('INSERT INTO schedules');
    expect(sqlOrder[1]).toContain('INSERT INTO schedules');
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
