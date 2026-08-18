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
      const entity = this.mapRowToEntity(rows[0]);
      if (this.tableName === 'schedules') {
        const subtasks = await db.select(`SELECT * FROM subtasks WHERE schedule_id = ?`, [id]);
        entity.subtasks = subtasks.map((st: any) => ({
          id: st.id,
          title: st.title,
          completed: st.completed === 1
        }));
      }
      return entity;
    }
    return null;
  }

  async getAll(): Promise<any[]> {
    const db = await this.getDb();
    const rows = await db.select(
      `SELECT * FROM ${this.tableName} WHERE is_deleted = 0`
    );
    return this.mapRows(rows);
  }

  /** 查询所有已软删除（回收站）的记录 */
  async getDeleted(): Promise<any[]> {
    const db = await this.getDb();
    const rows = await db.select(
      `SELECT * FROM ${this.tableName} WHERE is_deleted = 1`
    );
    return this.mapRows(rows);
  }

  /** 恢复软删除记录 */
  async restore(id: string): Promise<void> {
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      await db.execute(
        `UPDATE ${this.tableName} SET is_deleted = 0 WHERE id = ?`,
        [id]
      );
    });
    this.writeQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  /** 物理删除：彻底移除记录（含关联子任务） */
  async purge(id: string): Promise<void> {
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      if (this.tableName === 'schedules') {
        await db.execute(`DELETE FROM subtasks WHERE schedule_id = ?`, [id]);
      }
      await db.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    });
    this.writeQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  private async mapRows(rows: any[]): Promise<any[]> {
    if (this.tableName !== 'schedules') {
      return rows.map((r: any) => this.mapRowToEntity(r));
    }

    const db = await this.getDb();
    const subtasks = await db.select(`SELECT * FROM subtasks`);
    const subtaskMap = new Map();
    for (const st of subtasks) {
      if (!subtaskMap.has(st.schedule_id)) {
        subtaskMap.set(st.schedule_id, []);
      }
      subtaskMap.get(st.schedule_id).push({
        id: st.id,
        title: st.title,
        completed: st.completed === 1
      });
    }

    return rows.map((r: any) => {
      const entity = this.mapRowToEntity(r);
      entity.subtasks = subtaskMap.get(entity.id) || [];
      return entity;
    });
  }

  async save(id: string, entity: any): Promise<void> {
    const nextPromise = this.writeQueue.then(async () => {
      const db = await this.getDb();
      if (this.tableName === 'schedules') {
        const isDeletedVal = entity.isDeleted || 0;
        await db.execute(
          `INSERT INTO schedules (id, title, content, start_time, end_time, recurrence, category_id, status, reminder, important, created_at, updated_at, is_deleted, revision, matter_id) ` +
          `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ` +
          `ON CONFLICT(id) DO UPDATE SET ` +
          `title=excluded.title, content=excluded.content, start_time=excluded.start_time, end_time=excluded.end_time, ` +
          `recurrence=excluded.recurrence, category_id=excluded.category_id, status=excluded.status, reminder=excluded.reminder, ` +
          `important=excluded.important, updated_at=excluded.updated_at, is_deleted=excluded.is_deleted, revision=excluded.revision, matter_id=excluded.matter_id`,
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
            entity.revision || 0,
            entity.matterId || null
          ]
        );
        
        await db.execute(`DELETE FROM subtasks WHERE schedule_id = ?`, [entity.id]);
        if (entity.subtasks && entity.subtasks.length > 0) {
          for (const st of entity.subtasks) {
            await db.execute(
              `INSERT INTO subtasks (id, schedule_id, title, completed) VALUES (?, ?, ?, ?)`,
              [st.id, entity.id, st.title, st.completed ? 1 : 0]
            );
          }
        }
      } else if (this.tableName === 'categories') {
        const isDeletedVal = entity.isDeleted || 0;
        const hiddenVal = entity.hidden ? 1 : 0;
        await db.execute(
          `INSERT INTO categories (id, name, color, note, is_deleted, revision, hidden, updated_at) ` +
          `VALUES (?, ?, ?, ?, ?, ?, ?, ?) ` +
          `ON CONFLICT(id) DO UPDATE SET ` +
          `name=excluded.name, color=excluded.color, note=excluded.note, is_deleted=excluded.is_deleted, revision=excluded.revision, hidden=excluded.hidden, updated_at=excluded.updated_at`,
          [
            entity.id,
            entity.name,
            entity.color,
            entity.note || null,
            isDeletedVal,
            entity.revision || 0,
            hiddenVal,
            entity.updatedAt || null
          ]
        );
      } else if (this.tableName === 'matters') {
        const isDeletedVal = entity.isDeleted || 0;
        await db.execute(
          `INSERT INTO matters (id, name, icon, color, description, created_at, completed_at, status, is_deleted, revision) ` +
          `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ` +
          `ON CONFLICT(id) DO UPDATE SET ` +
          `name=excluded.name, icon=excluded.icon, color=excluded.color, description=excluded.description, ` +
          `completed_at=excluded.completed_at, status=excluded.status, is_deleted=excluded.is_deleted, revision=excluded.revision`,
          [
            entity.id,
            entity.name,
            entity.icon || null,
            entity.color,
            entity.description || null,
            entity.createdAt,
            entity.completedAt || null,
            entity.status,
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
        revision: row.revision,
        matterId: row.matter_id || ''
      };
    } else if (this.tableName === 'categories') {
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        note: row.note || undefined,
        isDeleted: row.is_deleted,
        revision: row.revision,
        hidden: row.hidden || 0,
        updatedAt: row.updated_at || undefined
      };
    } else if (this.tableName === 'matters') {
      return {
        id: row.id,
        name: row.name,
        icon: row.icon || undefined,
        color: row.color,
        description: row.description || undefined,
        createdAt: row.created_at,
        completedAt: row.completed_at || undefined,
        status: row.status,
        isDeleted: row.is_deleted,
        revision: row.revision
      };
    }
    return row;
  }
}
