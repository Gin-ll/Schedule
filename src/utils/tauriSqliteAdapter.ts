import { RepositoryAdapter } from './repositoryAdapter';

export class TauriSqliteAdapter implements RepositoryAdapter {
  private writeQueue: Promise<any> = Promise.resolve();
  private initializedDbPromise: Promise<any>;

  constructor(
    private tableName: string,
    private dbConnectionPromise: Promise<any>
  ) {
    // 自动配置 WAL 及 busy_timeout，仅在数据库加载完毕后执行一次
    this.initializedDbPromise = this.dbConnectionPromise.then(async (db) => {
      await db.execute("PRAGMA journal_mode=WAL;");
      await db.execute("PRAGMA busy_timeout=5000;");
      return db;
    });
  }

  private async getDb() {
    return this.initializedDbPromise;
  }

  async get(id: string): Promise<any | null> {
    const db = await this.getDb();
    const rows = await db.select(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    if (rows && rows.length > 0) {
      return this.mapRowToEntity(rows[0]);
    }
    return null;
  }

  async getAll(): Promise<any[]> {
    const db = await this.getDb();
    const rows = await db.select(
      `SELECT * FROM ${this.tableName} WHERE is_deleted = 0`
    );
    return rows.map((r: any) => this.mapRowToEntity(r));
  }

  async save(id: string, entity: any): Promise<void> {
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      if (this.tableName === 'schedules') {
        const isDeletedVal = entity.isDeleted || 0;
        await db.execute(
          `INSERT INTO schedules (id, title, content, start_time, end_time, recurrence, category_id, status, reminder, important, created_at, updated_at, is_deleted, revision) ` +
          `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ` +
          `ON CONFLICT(id) DO UPDATE SET ` +
          `title=excluded.title, content=excluded.content, start_time=excluded.start_time, end_time=excluded.end_time, ` +
          `recurrence=excluded.recurrence, category_id=excluded.category_id, status=excluded.status, reminder=excluded.reminder, ` +
          `important=excluded.important, updated_at=excluded.updated_at, is_deleted=excluded.is_deleted, revision=excluded.revision`,
          [
            entity.id,
            entity.title,
            entity.content,
            entity.startTime,
            entity.endTime || null,
            entity.recurrence,
            entity.categoryId || '',
            entity.status,
            entity.reminder,
            entity.important ? 1 : 0,
            entity.createdAt,
            entity.updatedAt,
            isDeletedVal,
            entity.revision || 0
          ]
        );
      } else if (this.tableName === 'categories') {
        const isDeletedVal = entity.isDeleted || 0;
        await db.execute(
          `INSERT INTO categories (id, name, color, note, is_deleted, revision) ` +
          `VALUES (?, ?, ?, ?, ?, ?) ` +
          `ON CONFLICT(id) DO UPDATE SET ` +
          `name=excluded.name, color=excluded.color, note=excluded.note, is_deleted=excluded.is_deleted, revision=excluded.revision`,
          [
            entity.id,
            entity.name,
            entity.color,
            entity.note || null,
            isDeletedVal,
            entity.revision || 0
          ]
        );
      }
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

  private mapRowToEntity(row: any): any {
    if (this.tableName === 'schedules') {
      return {
        id: row.id,
        title: row.title,
        content: row.content || '',
        startTime: row.start_time,
        endTime: row.end_time || undefined,
        recurrence: row.recurrence,
        categoryId: row.category_id || '',
        status: row.status,
        reminder: row.reminder,
        important: row.important === 1 || row.important === true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isDeleted: row.is_deleted,
        revision: row.revision
      };
    } else if (this.tableName === 'categories') {
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        note: row.note || undefined,
        isDeleted: row.is_deleted,
        revision: row.revision
      };
    }
    return row;
  }
}
