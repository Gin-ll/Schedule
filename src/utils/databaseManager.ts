export class DatabaseManager {
  private writeQueue: Promise<any> = Promise.resolve();
  private dbConnection: any = null;

  constructor(private rawExecutor?: any) {}

  private async getDb() {
    if (this.dbConnection) return this.dbConnection;
    if (this.rawExecutor) return this.rawExecutor;
    
    const Database = (await import('tauri-plugin-sql-api')).default;
    this.dbConnection = await Database.load("sqlite:schedule.db");
    // 启用 WAL 模式和 busy_timeout 延迟
    await this.dbConnection.execute("PRAGMA journal_mode=WAL;");
    await this.dbConnection.execute("PRAGMA busy_timeout=5000;");
    return this.dbConnection;
  }

  async select(sql: string, params: any[] = []): Promise<any[]> {
    const db = await this.getDb();
    if (typeof db === 'function') return db(sql, params);
    return db.select(sql, params);
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    // 串行化 Promise 写入队列以防止 SQLITE_BUSY
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      if (typeof db === 'function') return db(sql, params);
      return db.execute(sql, params);
    });
    // 捕获可能产生的错误以避免阻塞后续的执行
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
