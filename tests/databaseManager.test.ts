import { describe, it, expect, vi } from 'vitest';
import { DatabaseManager } from '../src/utils/databaseManager';

describe('DatabaseManager', () => {
  it('should execute SQL commands sequentially and not overlap', async () => {
    let activeExecutions = 0;
    let maxConcurrentExecutions = 0;
    const executionOrder: string[] = [];

    const mockSqlExecutor = vi.fn().mockImplementation((sql: string) => {
      activeExecutions++;
      if (activeExecutions > maxConcurrentExecutions) {
        maxConcurrentExecutions = activeExecutions;
      }
      executionOrder.push(`start-${sql}`);
      return new Promise(res => {
        setTimeout(() => {
          executionOrder.push(`end-${sql}`);
          activeExecutions--;
          res([1]);
        }, 50);
      });
    });

    const manager = new DatabaseManager(mockSqlExecutor as any);

    const p1 = manager.execute("sql1");
    const p2 = manager.execute("sql2");

    await Promise.all([p1, p2]);

    expect(mockSqlExecutor).toHaveBeenCalledTimes(2);
    expect(maxConcurrentExecutions).toBe(1); // 串行队列下，最高并发应为 1
    expect(executionOrder).toEqual([
      'start-sql1',
      'end-sql1',
      'start-sql2',
      'end-sql2'
    ]);
  });
});
