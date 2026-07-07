export interface RepositoryAdapter {
  get(id: string): Promise<any | null>;
  getAll(): Promise<any[]>;
  save(id: string, entity: any): Promise<void>;
  delete(id: string): Promise<void>;
}

export class MockRepositoryAdapter implements RepositoryAdapter {
  private memoryMap = new Map<string, any>();

  async get(id: string) {
    return this.memoryMap.get(id) || null;
  }
  async getAll() {
    return Array.from(this.memoryMap.values());
  }
  async save(id: string, entity: any) {
    this.memoryMap.set(id, entity);
  }
  async delete(id: string) {
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
    return this.getData()[id] || null;
  }
  async getAll() {
    return Object.values(this.getData());
  }
  async save(id: string, entity: any) {
    const data = this.getData();
    data[id] = entity;
    this.saveData(data);
  }
  async delete(id: string) {
    const data = this.getData();
    delete data[id];
    this.saveData(data);
  }
}
