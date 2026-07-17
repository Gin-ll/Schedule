import { defineStore } from 'pinia';
import { Schedule, Category, Matter } from '../types';
import { scheduleRepo, categoryRepo, matterRepo } from '../utils/databaseManager';
import { SyncManager, SyncRemoteAdapter } from '../utils/syncService';

async function triggerSync() {
  try {
    const { emit } = await import('@tauri-apps/api/event');
    await emit('sync-data');
  } catch (e) {
    // Fail silently if not running in Tauri (e.g. testing)
  }
}

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [] as Schedule[],
    categories: [] as Category[],
    matters: [] as Matter[],
    loading: false
  }),
  actions: {
    async loadAll() {
      this.loading = true;
      try {
        const list = await scheduleRepo.getAll();
        this.schedules = list.map((s: any) => ({
          ...s,
          important: s.important === 1 || s.important === true,
          matterId: s.matterId || ''
        }));

        const cats = await categoryRepo.getAll();
        this.categories = cats;

        const matts = await matterRepo.getAll();
        this.matters = matts;
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
      await triggerSync();
    },
    async updateSchedule(id: string, payload: Partial<Schedule>) {
      const now = new Date().toISOString();
      let changed = false;
      let updatedItem: Schedule | null = null;
      this.schedules = this.schedules.map(s => {
        if (s.id === id) {
          updatedItem = { ...s, ...payload, updatedAt: now, isNotified: false };
          changed = true;
          return updatedItem;
        }
        return s;
      });
      if (changed && updatedItem) {
        await scheduleRepo.save(id, updatedItem);
        await triggerSync();
      }
    },
    async deleteCategory(catId: string) {
      const now = new Date().toISOString();
      const savePromises: Promise<void>[] = [];
      this.schedules = this.schedules.map(s => {
        if (s.categoryId === catId) {
          const updated = { ...s, categoryId: '', updatedAt: now };
          savePromises.push(scheduleRepo.save(s.id, updated));
          return updated;
        }
        return s;
      });
      this.categories = this.categories.filter(c => c.id !== catId);
      await Promise.all(savePromises);
      await categoryRepo.delete(catId);
      await triggerSync();
    },
    async deleteSchedule(id: string) {
      this.schedules = this.schedules.filter(s => s.id !== id);
      await scheduleRepo.delete(id);
      await triggerSync();
    },
    async addCategory(payload: Omit<Category, 'id'>) {
      const id = `cat-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      const category: Category = { ...payload, id };
      this.categories.push(category);
      await categoryRepo.save(id, category);
      await triggerSync();
    },
    async updateCategory(id: string, payload: Partial<Category>) {
      let changed = false;
      let updatedItem: Category | null = null;
      this.categories = this.categories.map(c => {
        if (c.id === id) {
          updatedItem = { ...c, ...payload };
          changed = true;
          return updatedItem;
        }
        return c;
      });
      if (changed && updatedItem) {
        await categoryRepo.save(id, updatedItem);
        await triggerSync();
      }
    },
    async addMatter(payload: Omit<Matter, 'id' | 'createdAt' | 'status'>) {
      const id = `mat-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      const now = new Date().toISOString();
      const matter: Matter = { ...payload, id, status: 'active', createdAt: now };
      this.matters.push(matter);
      await matterRepo.save(id, matter);
      await triggerSync();
      return matter;
    },
    async updateMatter(id: string, payload: Partial<Matter>) {
      let changed = false;
      let updatedItem: Matter | null = null;
      this.matters = this.matters.map(m => {
        if (m.id === id) {
          updatedItem = { ...m, ...payload };
          changed = true;
          return updatedItem;
        }
        return m;
      });
      if (changed && updatedItem) {
        await matterRepo.save(id, updatedItem);
        await triggerSync();
      }
    },
    async deleteMatter(id: string) {
      const savePromises: Promise<void>[] = [];
      this.schedules = this.schedules.map(s => {
        if (s.matterId === id) {
          const updated = { ...s, matterId: '' };
          savePromises.push(scheduleRepo.save(s.id, updated));
          return updated;
        }
        return s;
      });
      this.matters = this.matters.filter(m => m.id !== id);
      await Promise.all(savePromises);
      await matterRepo.delete(id);
      await triggerSync();
    },
    async completeMatter(id: string) {
      const now = new Date().toISOString();
      let changed = false;
      let updatedItem: Matter | null = null;
      this.matters = this.matters.map(m => {
        if (m.id === id) {
          updatedItem = { ...m, status: 'completed', completedAt: now };
          changed = true;
          return updatedItem;
        }
        return m;
      });
      if (changed && updatedItem) {
        await matterRepo.save(id, updatedItem);
        await triggerSync();
      }
    },
    async restoreMatter(id: string) {
      let changed = false;
      let updatedItem: Matter | null = null;
      this.matters = this.matters.map(m => {
        if (m.id === id) {
          updatedItem = { ...m, status: 'active', completedAt: undefined };
          changed = true;
          return updatedItem;
        }
        return m;
      });
      if (changed && updatedItem) {
        // 在本地数据库保存时，需要把 completedAt 抹掉。SQLite 底层已做 NULL 处理
        await matterRepo.save(id, updatedItem);
        await triggerSync();
      }
    },
    async completeSchedulesByMatter(matterId: string) {
      const now = new Date().toISOString();
      const savePromises: Promise<void>[] = [];
      this.schedules = this.schedules.map(s => {
        if (s.matterId === matterId && s.status !== 'completed') {
          const updated = { ...s, status: 'completed' as const, updatedAt: now, isNotified: false };
          savePromises.push(scheduleRepo.save(s.id, updated));
          return updated;
        }
        return s;
      });
      await Promise.all(savePromises);
      await triggerSync();
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
        await triggerSync();
      } catch (e) {
        console.error("Sync failed:", e);
        throw e;
      } finally {
        this.loading = false;
      }
    }
  }
});
