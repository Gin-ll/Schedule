import { describe, it, expect } from 'vitest';
import { snapToMinutes, minutesToTop, moveToDate } from '../src/utils/calendarEngine';

describe('snapToMinutes', () => {
  it('snaps to nearest 15-minute grid', () => {
    expect(snapToMinutes(13 * 60 * 1000)).toBe(15 * 60 * 1000);
    expect(snapToMinutes(7 * 60 * 1000)).toBe(0);
    expect(snapToMinutes(29 * 60 * 1000)).toBe(30 * 60 * 1000);
    expect(snapToMinutes(23 * 60 * 1000)).toBe(30 * 60 * 1000); // 23 距 30 更近
    expect(snapToMinutes(22 * 60 * 1000)).toBe(15 * 60 * 1000); // 22 距 15 更近
  });

  it('honors custom step', () => {
    expect(snapToMinutes(29 * 60 * 1000, 30 * 60 * 1000)).toBe(30 * 60 * 1000);
    expect(snapToMinutes(16 * 60 * 1000, 30 * 60 * 1000)).toBe(30 * 60 * 1000);
  });
});

describe('minutesToTop', () => {
  it('computes minutes from day start (9:30 -> 570)', () => {
    const date = new Date(2026, 7, 5);
    const start = new Date(2026, 7, 5, 9, 30, 0);
    expect(minutesToTop(start, date)).toBe(570);
  });

  it('clamps instances outside the target day', () => {
    const date = new Date(2026, 7, 5);
    const prevDay = new Date(2026, 7, 4, 23, 0, 0);
    expect(minutesToTop(prevDay, date)).toBe(0);
    const nextDay = new Date(2026, 7, 6, 1, 0, 0);
    expect(minutesToTop(nextDay, date)).toBe(1440);
  });
});

describe('moveToDate', () => {
  it('keeps time-of-day and duration, moves to target date', () => {
    const instance = { startTime: '2026-08-03T09:30:00', endTime: '2026-08-03T11:00:00' };
    const moved = moveToDate(instance, new Date(2026, 7, 10));
    const newStart = new Date(moved.startTime);
    expect(newStart.getDate()).toBe(10);
    expect(newStart.getHours()).toBe(9);
    expect(newStart.getMinutes()).toBe(30);
    const newEnd = new Date(moved.endTime!);
    expect(newEnd.getTime() - newStart.getTime()).toBe(90 * 60 * 1000);
  });

  it('extends endTime across midnight when duration crosses', () => {
    const instance = { startTime: '2026-08-03T22:00:00', endTime: '2026-08-04T01:00:00' };
    const moved = moveToDate(instance, new Date(2026, 7, 10));
    const newEnd = new Date(moved.endTime!);
    expect(newEnd.getDate()).toBe(11);
    expect(newEnd.getHours()).toBe(1);
  });

  it('omits endTime when instance has none', () => {
    const instance = { startTime: '2026-08-03T09:30:00' };
    const moved = moveToDate(instance, new Date(2026, 7, 10));
    expect(moved.endTime).toBeUndefined();
  });
});
