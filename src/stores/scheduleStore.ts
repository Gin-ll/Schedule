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
    trash: [] as Schedule[],
    categoryTrash: [] as Category[],
    loading: false
  }),
  getters: {
    /** 所有分类（含回收站中的），用于日程分类名/颜色显示（已删除分类仍被日程引用） */
    allCategories: (state) => [...state.categories, ...state.categoryTrash]
  },
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

        // 加载回收站分类，供日程分类名/颜色显示（已删除但日程仍引用）与回收站使用
        this.categoryTrash = await categoryRepo.getDeleted();

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
      const target = this.categories.find(c => c.id === catId);
      // 移入回收站：不解除日程与分类的关系，日程仍保留该分类显示
      this.categories = this.categories.filter(c => c.id !== catId);
      if (target) {
        await categoryRepo.save(catId, { ...target, isDeleted: 1, updatedAt: now });
      } else {
        await categoryRepo.delete(catId);
      }
      this.categoryTrash = await categoryRepo.getDeleted();
      await triggerSync();
    },
    async deleteSchedule(id: string) {
      // 软删除：写入 is_deleted=1 并记录删除时间，便于回收站展示与恢复
      const now = new Date().toISOString();
      const target = this.schedules.find(s => s.id === id);
      if (target) {
        await scheduleRepo.save(id, { ...target, isDeleted: 1, updatedAt: now });
      } else {
        await scheduleRepo.delete(id);
      }
      this.schedules = this.schedules.filter(s => s.id !== id);
      await triggerSync();
    },
    /** 加载回收站（已软删除的日程） */
    async loadTrash() {
      this.trash = await scheduleRepo.getDeleted();
    },
    /** 从回收站恢复日程 */
    async restoreSchedule(id: string) {
      await scheduleRepo.restore(id);
      this.trash = this.trash.filter(s => s.id !== id);
      await this.loadAll();
      await triggerSync();
    },
    /** 从回收站永久删除单个日程（不可恢复） */
    async purgeSchedule(id: string) {
      await scheduleRepo.purge(id);
      this.trash = this.trash.filter(s => s.id !== id);
    },
    /** 清空回收站（全部永久删除） */
    async emptyTrash() {
      const ids = this.trash.map(s => s.id);
      for (const id of ids) {
        await scheduleRepo.purge(id);
      }
      this.trash = [];
    },
    /** 加载回收站中的分类（已软删除） */
    async loadCategoryTrash() {
      this.categoryTrash = await categoryRepo.getDeleted();
    },
    /** 从回收站恢复分类 */
    async restoreCategory(id: string) {
      await categoryRepo.restore(id);
      this.categoryTrash = this.categoryTrash.filter(c => c.id !== id);
      await this.loadAll();
      await triggerSync();
    },
    /** 从回收站永久删除分类 */
    async purgeCategory(id: string) {
      await categoryRepo.purge(id);
      this.categoryTrash = this.categoryTrash.filter(c => c.id !== id);
    },
    /** 清空分类回收站 */
    async emptyCategoryTrash() {
      const ids = this.categoryTrash.map(c => c.id);
      for (const id of ids) {
        await categoryRepo.purge(id);
      }
      this.categoryTrash = [];
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
