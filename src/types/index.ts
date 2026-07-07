export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type ScheduleStatus = 'pending' | 'in-progress' | 'completed' | 'delayed';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  note?: string;
}

export interface Schedule {
  id: string;
  title: string;
  content: string;
  startTime: string;      // ISO 格式时间字符串，例如 '2026-07-07T10:15:00.000Z'
  endTime?: string;       // 结束时间，为空则默认与 startTime 相同
  time?: string;          // 兼容旧数据的辅助字段
  recurrence: RecurrenceType;
  categoryId: string;     // 外键，关联 Category.id，未分类时为空字符串 ""
  status: ScheduleStatus;
  reminder: 'none' | '10m' | '30m' | '1h';
  important: boolean;
  createdAt: string;
  updatedAt: string;      // 冲突合并 LWW 算法的决胜字段
  isNotified?: boolean;
  subtasks?: Subtask[];
}
