export interface RepositoryAdapter {
  get(id: string): Promise<any | null>;
  getAll(): Promise<any[]>;
  save(id: string, entity: any): Promise<void>;
  /** 软删除：标记 is_deleted = 1（与 SQLite 层语义一致），记录仍可查询/恢复 */
  delete(id: string): Promise<void>;
  /** 查询所有已软删除（回收站）的记录 */
  getDeleted(): Promise<any[]>;
  /** 恢复软删除记录：is_deleted 置 0 */
  restore(id: string): Promise<void>;
  /** 物理删除：彻底移除记录（不可恢复） */
  purge(id: string): Promise<void>;
}

const isTrashed = (e: any) => e && (e.isDeleted === 1 || e.isDeleted === true);

export class MockRepositoryAdapter implements RepositoryAdapter {
  private memoryMap = new Map<string, any>();

  async get(id: string) {
    const e = this.memoryMap.get(id);
    return e && !isTrashed(e) ? e : null;
  }
  async getAll() {
    return Array.from(this.memoryMap.values()).filter(e => !isTrashed(e));
  }
  async save(id: string, entity: any) {
    this.memoryMap.set(id, entity);
  }
  async delete(id: string) {
    const e = this.memoryMap.get(id);
    if (e) {
      this.memoryMap.set(id, { ...e, isDeleted: 1 });
    }
  }
  async getDeleted() {
    return Array.from(this.memoryMap.values()).filter(e => isTrashed(e));
  }
  async restore(id: string) {
    const e = this.memoryMap.get(id);
    if (e) {
      this.memoryMap.set(id, { ...e, isDeleted: 0 });
    }
  }
  async purge(id: string) {
    this.memoryMap.delete(id);
  }
}

export class LocalStorageAdapter implements RepositoryAdapter {
  constructor(private storageKey: string) {}

  private getData(): Record<string, any> {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : {};
  }

  private saveData(data: Record<string, any>) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  async get(id: string) {
    const e = this.getData()[id];
    return e && !isTrashed(e) ? e : null;
  }
  async getAll() {
    return Object.values(this.getData()).filter(e => !isTrashed(e));
  }
  async save(id: string, entity: any) {
    const data = this.getData();
    data[id] = entity;
    this.saveData(data);
  }
  async delete(id: string) {
    const data = this.getData();
    if (data[id]) {
      data[id] = { ...data[id], isDeleted: 1 };
      this.saveData(data);
    }
  }
  async getDeleted() {
    return Object.values(this.getData()).filter(e => isTrashed(e));
  }
  async restore(id: string) {
    const data = this.getData();
    if (data[id]) {
      data[id] = { ...data[id], isDeleted: 0 };
      this.saveData(data);
    }
  }
  async purge(id: string) {
    const data = this.getData();
    delete data[id];
    this.saveData(data);
  }
}
