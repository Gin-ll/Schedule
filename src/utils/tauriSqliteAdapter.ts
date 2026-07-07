import { RepositoryAdapter } from './repositoryAdapter';

export class TauriSqliteAdapter implements RepositoryAdapter {
  private writeQueue: Promise<any> = Promise.resolve();

  constructor(
    private tableName: string,
    private dbConnectionPromise: Promise<any>
  ) {}

  private async getDb() {
    const db = await this.dbConnectionPromise;
    // 自动配置 WAL 及 busy_timeout
    await db.execute("PRAGMA journal_mode=WAL;");
    await db.execute("PRAGMA busy_timeout=5000;");
    return db;
  }

  async get(id: string): Promise<any | null> {
    const db = await this.getDb();
    const rows = await db.select(
      `SELECT data FROM ${this.tableName} WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    if (rows && rows.length > 0) {
      return JSON.parse(rows[0].data);
    }
    return null;
  }

  async getAll(): Promise<any[]> {
    const db = await this.getDb();
    const rows = await db.select(
      `SELECT data FROM ${this.tableName} WHERE is_deleted = 0`
    );
    return rows.map((r: any) => JSON.parse(r.data));
  }

  async save(id: string, entity: any): Promise<void> {
    const serialized = JSON.stringify(entity);
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      // SQLite 兼容 upsert
      await db.execute(
        `INSERT INTO ${this.tableName} (id, data) VALUES (?, ?) ` +
        `ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
        [id, serialized]
      );
    });
    this.writeQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  async delete(id: string): Promise<void> {
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      await db.execute(
        `UPDATE ${this.tableName} SET is_deleted = 1 WHERE id = ?`,
        [id]
      );
    });
    this.writeQueue = nextPromise.catch(() => {});
    return nextPromise;
  }
}
