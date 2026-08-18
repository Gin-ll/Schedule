import { RepositoryAdapter, LocalStorageAdapter } from './repositoryAdapter';
import { TauriSqliteAdapter } from './tauriSqliteAdapter';

export class DomainRepository {
  private adapter: RepositoryAdapter;

  constructor(
    private tableName: string,
    private dbConnectionPromise: Promise<any>
  ) {
    // 默认判断当前所处环境：Tauri 还是标准 Web 浏览器
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    this.adapter = isTauri
      ? new TauriSqliteAdapter(tableName, dbConnectionPromise)
      : new LocalStorageAdapter(`local_db_${tableName}`);
  }

  setAdapter(adapter: RepositoryAdapter) {
    this.adapter = adapter;
  }

  async get(id: string) {
    return this.adapter.get(id);
  }

  async getAll() {
    return this.adapter.getAll();
  }

  async save(id: string, entity: any) {
    await this.adapter.save(id, entity);
  }

  async delete(id: string) {
    await this.adapter.delete(id);
  }

  async getDeleted() {
    return this.adapter.getDeleted();
  }

  async restore(id: string) {
    await this.adapter.restore(id);
  }

  async purge(id: string) {
    await this.adapter.purge(id);
  }
}

// 惰性加载原生数据库连接以供 TauriSqliteAdapter 消费
const dbPromise = (async () => {
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
    return null;
  }
  const Database = (await import('@tauri-apps/plugin-sql')).default;
  return Database.load("sqlite:schedule.db");
})();

export const scheduleRepo = new DomainRepository('schedules', dbPromise as any);
export const categoryRepo = new DomainRepository('categories', dbPromise as any);
export const matterRepo = new DomainRepository('matters', dbPromise as any);

// 保留旧 DatabaseManager / dbManager 以防编译冲突，兼容测试
export class DatabaseManager {
  private writeQueue: Promise<any> = Promise.resolve();
  private dbConnection: any = null;

  constructor(private rawExecutor?: any) {}

  private async getDb() {
    if (this.dbConnection) return this.dbConnection;
    if (this.rawExecutor) return this.rawExecutor;
    
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
      return null;
    }
    const Database = (await import('@tauri-apps/plugin-sql')).default;
    this.dbConnection = await Database.load("sqlite:schedule.db");
    await this.dbConnection.execute("PRAGMA journal_mode=WAL;");
    await this.dbConnection.execute("PRAGMA busy_timeout=5000;");
    return this.dbConnection;
  }

  async select(sql: string, params: any[] = []): Promise<any[]> {
    const db = await this.getDb();
    if (!db) return [];
    if (typeof db === 'function') return db(sql, params);
    return db.select(sql, params);
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      if (!db) return;
      if (typeof db === 'function') return db(sql, params);
      return db.execute(sql, params);
    });
    this.writeQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  async runIntegrityCheck(): Promise<boolean> {
    try {
      const result = await this.select("PRAGMA integrity_check;");
      return result[0] && (result[0]['integrity_check'] === 'ok' || result[0]['integrity_check'] === 'row ok');
    } catch {
      return false;
    }
  }
}

export const dbManager = new DatabaseManager();
