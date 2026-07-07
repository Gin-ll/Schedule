import { defineStore } from 'pinia';
import { Schedule, Category } from '../types';
import { scheduleRepo, categoryRepo } from '../utils/databaseManager';
import { SyncManager, SyncRemoteAdapter } from '../utils/syncService';

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
        const list = await scheduleRepo.getAll();
        this.schedules = list.map((s: any) => ({
          ...s,
          important: s.important === 1 || s.important === true
        }));

        const cats = await categoryRepo.getAll();
        this.categories = cats;
      } catch (e) {
        console.error("Failed to load store:", e);
      } finally {
        this.loading = false;
      }
    },
    async addSchedule(payload: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) {
      const now = new Date().toISOString();
      const id = `sch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const schedule: Schedule = { ...payload, id, createdAt: now, updatedAt: now };
      this.schedules.push(schedule);
      await scheduleRepo.save(id, schedule);
    },
    async updateSchedule(id: string, payload: Partial<Schedule>) {
      const now = new Date().toISOString();
      this.schedules = this.schedules.map(s => {
        if (s.id === id) {
          const updated = { ...s, ...payload, updatedAt: now, isNotified: false };
          scheduleRepo.save(id, updated);
          return updated;
        }
        return s;
      });
    },
    async deleteCategory(catId: string) {
      const now = new Date().toISOString();
      this.schedules = this.schedules.map(s => {
        if (s.categoryId === catId) {
          const updated = { ...s, categoryId: '', updatedAt: now };
          scheduleRepo.save(s.id, updated);
          return updated;
        }
        return s;
      });
      this.categories = this.categories.filter(c => c.id !== catId);
      await categoryRepo.delete(catId);
    },
    async deleteSchedule(id: string) {
      this.schedules = this.schedules.filter(s => s.id !== id);
      await scheduleRepo.delete(id);
    },
    async addCategory(payload: Omit<Category, 'id'>) {
      const id = `cat-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      const category: Category = { ...payload, id };
      this.categories.push(category);
      await categoryRepo.save(id, category);
    },
    async updateCategory(id: string, payload: Partial<Category>) {
      this.categories = this.categories.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...payload };
          categoryRepo.save(id, updated);
          return updated;
        }
        return c;
      });
    },
    async syncWithRemote(remoteAdapter: SyncRemoteAdapter) {
      this.loading = true;
      try {
        const syncManager = new SyncManager(remoteAdapter);
        const merged = await syncManager.sync(this.schedules);
        
        // 增量存回本地 repository
        for (const item of merged) {
          await scheduleRepo.save(item.id, item);
        }
        await this.loadAll();
      } catch (e) {
        console.error("Sync failed:", e);
        throw e;
      } finally {
        this.loading = false;
      }
    }
  }
});
