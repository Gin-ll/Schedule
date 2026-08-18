import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUpcomingInstances,
  collectDueNotifications,
  resetNotificationStateForTest
} from '../src/utils/notificationService';
import { Schedule, Category } from '../src/types';

function makeSchedule(partial: Partial<Schedule>): Schedule {
  return {
    id: 'sch-test',
    title: 'Test',
    content: '',
    startTime: new Date().toISOString(),
    recurrence: 'none',
    categoryId: '',
    status: 'pending',
    reminder: 'none',
    important: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial
  };
}

// 本地时区构造，避免 toISOString 断言受时区偏移影响
function localDate(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}

const CAT: Category = { id: 'cat-work', name: '工作', color: '#FF5733' };

describe('getUpcomingInstances', () => {
  it('none: returns startTime when inside window, empty when outside', () => {
    const now = new Date('2026-08-05T10:00:00');
    const inside = makeSchedule({ startTime: '2026-08-05T09:58:00', recurrence: 'none' });
    expect(getUpcomingInstances(inside, now, 60 * 60 * 1000).length).toBe(1);

    const outside = makeSchedule({ startTime: '2026-08-05T09:00:00', recurrence: 'none' });
    expect(getUpcomingInstances(outside, now, 60 * 60 * 1000).length).toBe(0);
  });

  it('daily: expands instances across days, skipping past iterations', () => {
    const now = new Date('2026-08-05T09:58:00');
    const s = makeSchedule({ startTime: '2026-08-03T10:00:00', recurrence: 'daily' });
    const instances = getUpcomingInstances(s, now, 60 * 60 * 1000);
    expect(instances.length).toBe(1);
    expect(instances[0].getTime()).toBe(localDate(2026, 8, 5, 10, 0).getTime());
  });

  it('weekly: expands weekly instances', () => {
    const now = new Date('2026-08-05T09:58:00'); // 周三
    const s = makeSchedule({ startTime: '2026-07-22T10:00:00', recurrence: 'weekly' }); // 两周前的周三
    const instances = getUpcomingInstances(s, now, 60 * 60 * 1000);
    expect(instances.length).toBe(1);
    expect(instances[0].getTime()).toBe(localDate(2026, 8, 5, 10, 0).getTime());
  });

  it('monthly: clamps target day to month end (Jan 31 -> Feb 28)', () => {
    const now = new Date('2026-02-28T09:58:00');
    const s = makeSchedule({ startTime: '2026-01-31T10:00:00', recurrence: 'monthly' });
    const instances = getUpcomingInstances(s, now, 60 * 60 * 1000);
    expect(instances.length).toBe(1);
    expect(instances[0].getTime()).toBe(localDate(2026, 2, 28, 10, 0).getTime());
  });

  it('monthly: regular target day', () => {
    const now = new Date('2026-02-15T09:58:00');
    const s = makeSchedule({ startTime: '2026-01-15T10:00:00', recurrence: 'monthly' });
    const instances = getUpcomingInstances(s, now, 60 * 60 * 1000);
    expect(instances.length).toBe(1);
    expect(instances[0].getTime()).toBe(localDate(2026, 2, 15, 10, 0).getTime());
  });
});

describe('collectDueNotifications', () => {
  beforeEach(() => {
    resetNotificationStateForTest();
  });

  it('triggers when reminder time arrives (10m ahead)', () => {
    const now = new Date('2026-08-05T10:00:00');
    const s = makeSchedule({
      startTime: '2026-08-05T10:10:00',
      reminder: '10m',
      categoryId: 'cat-work'
    });
    const due = collectDueNotifications([s], [CAT], now);
    expect(due.length).toBe(1);
    expect(due[0].title).toBe('Test');
    expect(due[0].body).toContain('工作');
  });

  it('triggers for 1h reminder when event is 1h away', () => {
    const now = new Date('2026-08-05T10:00:00');
    const s = makeSchedule({ startTime: '2026-08-05T11:00:00', reminder: '1h' });
    const due = collectDueNotifications([s], [], now);
    expect(due.length).toBe(1);
  });

  it('does not trigger before the reminder time', () => {
    const now = new Date('2026-08-05T10:00:00');
    const s = makeSchedule({ startTime: '2026-08-05T10:50:00', reminder: '30m' }); // remindAt = 10:20
    const due = collectDueNotifications([s], [], now);
    expect(due.length).toBe(0);
  });

  it('catches up reminders missed while app was closed (5 min window)', () => {
    const now = new Date('2026-08-05T10:00:00');
    const s = makeSchedule({ startTime: '2026-08-05T10:05:00', reminder: '10m' }); // remindAt = 09:55
    const due = collectDueNotifications([s], [], now);
    expect(due.length).toBe(1);
  });

  it('does not send reminders too far in the past', () => {
    const now = new Date('2026-08-05T10:00:00');
    const s = makeSchedule({ startTime: '2026-08-05T09:59:00', reminder: '10m' }); // remindAt = 09:49
    const due = collectDueNotifications([s], [], now);
    expect(due.length).toBe(0);
  });

  it('skips completed schedules and none reminders', () => {
    const now = new Date('2026-08-05T10:00:00');
    const completed = makeSchedule({
      startTime: '2026-08-05T10:10:00',
      reminder: '10m',
      status: 'completed'
    });
    const noReminder = makeSchedule({ startTime: '2026-08-05T10:10:00', reminder: 'none' });
    expect(collectDueNotifications([completed, noReminder], [], now).length).toBe(0);
  });

  it('deduplicates: same instance only notified once per session', () => {
    const now = new Date('2026-08-05T10:00:00');
    const s = makeSchedule({ startTime: '2026-08-05T10:10:00', reminder: '10m' });
    const first = collectDueNotifications([s], [], now);
    expect(first.length).toBe(1);
    // 同一实例第二次扫描不应重复通知
    const second = collectDueNotifications([s], [], now);
    expect(second.length).toBe(0);
  });
});
