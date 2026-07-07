import { defineStore } from 'pinia';
import { Schedule, Category } from '../types';
import { dbManager } from '../utils/databaseManager';

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [] as Schedule[],
    categories: [] as Category[],
    loading: false
  }),
  actions: {
    async loadAll() {
      this.loading = true;
      try {
        const rawSchedules = await dbManager.select("SELECT * FROM schedules WHERE is_deleted = 0");
        this.schedules = rawSchedules.map((s: any) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          startTime: s.start_time,
          endTime: s.end_time || undefined,
          recurrence: s.recurrence,
          categoryId: s.category_id || '',
          status: s.status,
          reminder: s.reminder,
          important: s.important === 1 || s.important === true,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }));

        const rawCategories = await dbManager.select("SELECT * FROM categories WHERE is_deleted = 0");
        this.categories = rawCategories.map((c: any) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          note: c.note || undefined
        }));
      } catch (e) {
        console.error("Failed to load store from SQLite:", e);
      } finally {
        this.loading = false;
      }
    },
    async addSchedule(payload: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = new Date().toISOString();
      const id = `sch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const schedule: Schedule = { ...payload, id, createdAt: now, updatedAt: now };
      this.schedules.push(schedule);

      await dbManager.execute(
        "INSERT INTO schedules (id, title, content, start_time, end_time, recurrence, category_id, status, reminder, important, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [id, schedule.title, schedule.content, schedule.startTime, schedule.endTime || null, schedule.recurrence, schedule.categoryId, schedule.status, schedule.reminder, schedule.important ? 1 : 0, now, now]
      );
    },
    async updateSchedule(id: string, payload: Partial<Schedule>) {
      const now = new Date().toISOString();
      this.schedules = this.schedules.map(s => {
        if (s.id === id) {
          const updated = { ...s, ...payload, updatedAt: now, isNotified: false };
          dbManager.execute(
            "UPDATE schedules SET title=?, content=?, start_time=?, end_time=?, recurrence=?, category_id=?, status=?, reminder=?, important=?, updated_at=? WHERE id=?",
            [updated.title, updated.content, updated.startTime, updated.endTime || null, updated.recurrence, updated.categoryId, updated.status, updated.reminder, updated.important ? 1 : 0, now, id]
          );
          return updated;
        }
        return s;
      });
    },
    async deleteCategory(catId: string) {
      const now = new Date().toISOString();
      // Cascade update associated schedules
      this.schedules = this.schedules.map(s => {
        if (s.categoryId === catId) {
          dbManager.execute("UPDATE schedules SET category_id = '', updated_at = ? WHERE id = ?", [now, s.id]);
          return { ...s, categoryId: '', updatedAt: now };
        }
        return s;
      });
      this.categories = this.categories.filter(c => c.id !== catId);
      await dbManager.execute("UPDATE categories SET is_deleted = 1 WHERE id = ?", [catId]);
    }
  }
});
