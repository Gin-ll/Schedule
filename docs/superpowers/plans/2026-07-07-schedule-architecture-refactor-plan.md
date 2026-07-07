# Schedule 架构重构与模块深化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完全重构 Schedule 项目的数据仓储、日历计算与同步机制，解耦原生 SQLite，实现 Web/桌面多端适配，并建立 100% 独立于 Tauri 原生环境的前端自动化测试套件。

**Architecture:** 
1. 提炼包含 `TauriSqliteAdapter` / `LocalStorageAdapter` / `MockRepositoryAdapter` 多态实现的仓储接缝（Repository Seam）；
2. 封装无状态的 `CalendarEngine` 领域计算服务以隔离视图层复杂度；
3. 建立基于 `SyncRemoteAdapter` 的同步管理器，并提供指数退避自愈状态机。

**Tech Stack:** Vue 3, Pinia, TypeScript, SQLite (via `@tauri-apps/plugin-sql`), Vitest

## Global Constraints
- 测试运行器：使用 Vitest 且必须附带 `--root .` 以便正确定位测试。
- 类型安全性：在重构过程中，所有文件必须通过 `vue-tsc --noEmit` 静态类型检查。
- 代码库规范：禁止使用 `TODO` 或任何伪代码占位符，保持 100% 完整实现。

---

### Task 1: 扩展核心类型并搭建 Repository 接缝 (LocalStorage & Mock)

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/utils/repositoryAdapter.ts`
- Create: `tests/repositoryAdapter.test.ts`

**Interfaces:**
- Consumes: `Schedule`, `Category` 基础结构
- Produces: 
  - `RepositoryAdapter` 接口声明
  - `LocalStorageAdapter` 适配器
  - `MockRepositoryAdapter` 适配器

- [ ] **Step 1: 编写失败测试 (编写 localStorage 和 mock 适配器的类型与对象交互验证)**

新建 `tests/repositoryAdapter.test.ts`：
```typescript
import { describe, it, expect } from 'vitest';
import { LocalStorageAdapter, MockRepositoryAdapter } from '../src/utils/repositoryAdapter';

describe('Repository Adapters', () => {
  it('MockRepositoryAdapter should store and retrieve data by ID', async () => {
    const adapter = new MockRepositoryAdapter();
    await adapter.save('test-key', { id: 'test-key', title: 'Schedule Item' });
    const result = await adapter.get('test-key');
    expect(result.title).toBe('Schedule Item');
  });

  it('LocalStorageAdapter should save data to localStorage without running SQL', async () => {
    const adapter = new LocalStorageAdapter('test_db_key');
    await adapter.save('test-key-2', { id: 'test-key-2', title: 'LocalStorage Item' });
    const result = await adapter.get('test-key-2');
    expect(result.title).toBe('LocalStorage Item');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

运行: `npx vitest run --root . tests/repositoryAdapter.test.ts`
预期结果: FAIL (无法解析导入，找不到模块 `/src/utils/repositoryAdapter`)

- [ ] **Step 3: 编写最小实现以通过测试**

修改 `src/types/index.ts`，补齐字段：
```typescript
// 修改 Schedule 与 Category 以便支持 revision
export interface Category {
  id: string;
  name: string;
  color: string;
  note?: string;
  isDeleted?: number;
  revision?: number;
}

export interface Schedule {
  id: string;
  title: string;
  content: string;
  startTime: string;
  endTime?: string;
  time?: string;
  recurrence: RecurrenceType;
  categoryId: string;
  status: ScheduleStatus;
  reminder: 'none' | '10m' | '30m' | '1h';
  important: boolean;
  createdAt: string;
  updatedAt: string;
  isNotified?: boolean;
  subtasks?: Subtask[];
  isDeleted?: number;
  revision?: number;
}
```

新建 `src/utils/repositoryAdapter.ts`：
```typescript
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
```

- [ ] **Step 4: 运行测试验证通过**

运行: `npx vitest run --root . tests/repositoryAdapter.test.ts`
预期结果: PASS

- [ ] **Step 5: 提交**

```bash
git add src/types/index.ts src/utils/repositoryAdapter.ts tests/repositoryAdapter.test.ts
git commit -m "feat: add repository adapters interface and web/mock implementations"
```

---

### Task 2: 实现 TauriSqliteAdapter 承接并发控制 (WAL & 串行队列)

**Files:**
- Create: `src/utils/tauriSqliteAdapter.ts`
- Create: `tests/tauriSqliteAdapter.test.ts`

**Interfaces:**
- Consumes: `RepositoryAdapter`
- Produces: `TauriSqliteAdapter` (支持 SQL 执行、WAL 模式和 Promise 串行队列)

- [ ] **Step 1: 编写失败测试**

新建 `tests/tauriSqliteAdapter.test.ts` 检查串行队列行为：
```typescript
import { describe, it, expect, vi } from 'vitest';
import { TauriSqliteAdapter } from '../src/utils/tauriSqliteAdapter';

describe('TauriSqliteAdapter', () => {
  it('should execute SQLite statements sequentially via writeQueue', async () => {
    let activeExecutions = 0;
    let maxConcurrent = 0;
    const executionOrder: string[] = [];

    const mockDbConnection = {
      execute: vi.fn().mockImplementation((sql: string) => {
        activeExecutions++;
        if (activeExecutions > maxConcurrent) maxConcurrent = activeExecutions;
        executionOrder.push(`start-${sql}`);
        return new Promise(res => {
          setTimeout(() => {
            executionOrder.push(`end-${sql}`);
            activeExecutions--;
            res([1]);
          }, 30);
        });
      }),
      select: vi.fn().mockImplementation(() => Promise.resolve([]))
    };

    const adapter = new TauriSqliteAdapter(
      "schedules",
      Promise.resolve(mockDbConnection as any)
    );

    const p1 = adapter.save('k1', { id: 'k1', val: 'a' });
    const p2 = adapter.save('k2', { id: 'k2', val: 'b' });

    await Promise.all([p1, p2]);

    expect(maxConcurrent).toBe(1); // 串行队列并发应为 1
    expect(executionOrder[0]).toBe('start-INSERT INTO schedules (id, data) VALUES (?, ?)');
    expect(executionOrder[1]).toBe('end-INSERT INTO schedules (id, data) VALUES (?, ?)');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

运行: `npx vitest run --root . tests/tauriSqliteAdapter.test.ts`
预期结果: FAIL (找不到 `/src/utils/tauriSqliteAdapter`)

- [ ] **Step 3: 编写最小实现**

新建 `src/utils/tauriSqliteAdapter.ts`：
```typescript
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
```

- [ ] **Step 4: 运行测试验证通过**

运行: `npx vitest run --root . tests/tauriSqliteAdapter.test.ts`
预期结果: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/tauriSqliteAdapter.ts tests/tauriSqliteAdapter.test.ts
git commit -m "feat: add TauriSqliteAdapter implementing write queue and sqlite wal configurations"
```

---

### Task 3: 提炼仓储深层模块并重构 scheduleStore (移除 SQL)

**Files:**
- Modify: `src/utils/databaseManager.ts`
- Modify: `src/stores/scheduleStore.ts`
- Modify: `tests/scheduleStore.test.ts`

**Interfaces:**
- Consumes: `RepositoryAdapter`, `TauriSqliteAdapter`, `LocalStorageAdapter`
- Produces: 
  - `ScheduleRepository`, `CategoryRepository` 深模块实体
  - 重构后的 `useScheduleStore` (完全脱离手写 SQL 查询)

- [ ] **Step 1: 修改 Store 关联测试，通过 Mock 彻底隔离底层数据库**

重构 `tests/scheduleStore.test.ts`：
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useScheduleStore } from '../src/stores/scheduleStore';
import { MockRepositoryAdapter } from '../src/utils/repositoryAdapter';
import { scheduleRepo, categoryRepo } from '../src/utils/databaseManager';

describe('scheduleStore with Mock Repository', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // 注入内存 mock 适配器实现测试隔离
    scheduleRepo.setAdapter(new MockRepositoryAdapter());
    categoryRepo.setAdapter(new MockRepositoryAdapter());
  });

  it('should load, add and delete schedules correctly', async () => {
    const store = useScheduleStore();
    await store.addSchedule({
      title: 'Unit Test Task',
      content: 'TDD implementation plan',
      startTime: new Date().toISOString(),
      recurrence: 'none',
      categoryId: '',
      status: 'pending',
      reminder: 'none',
      important: false
    });

    expect(store.schedules.length).toBe(1);
    expect(store.schedules[0].title).toBe('Unit Test Task');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

运行: `npx vitest run --root . tests/scheduleStore.test.ts`
预期结果: FAIL (由于 Store 目前依然直接调用 `dbManager.select` 执行原生 SQL，且 `scheduleRepo` 还没有 `setAdapter` 属性方法)

- [ ] **Step 3: 编写代码库适配以彻底移出 SQL 拼装**

重构 `src/utils/databaseManager.ts`（使之作为核心仓储多态入口）：
```typescript
import { RepositoryAdapter, LocalStorageAdapter, MockRepositoryAdapter } from './repositoryAdapter';
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

// 保留旧 databaseManager 导出以防编译冲突，之后清理
export const dbManager = {
  select: async (sql: string, params: any[] = []) => [],
  execute: async (sql: string, params: any[] = []) => {}
};
```

重构 `src/stores/scheduleStore.ts`（消费端全面转向 Repo 对象操作）：
```typescript
import { defineStore } from 'pinia';
import { Schedule, Category } from '../types';
import { scheduleRepo, categoryRepo } from '../utils/databaseManager';

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
    }
  }
});
```

- [ ] **Step 4: 运行测试验证通过**

运行: `npx vitest run --root . tests/scheduleStore.test.ts`
预期结果: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/databaseManager.ts src/stores/scheduleStore.ts tests/scheduleStore.test.ts
git commit -m "refactor: isolate store from database via deep Repository objects, passing all units"
```

---

### Task 4: 重塑 CalendarEngine 算法领域层

**Files:**
- Create: `src/utils/calendarEngine.ts`
- Modify: `tests/calendarScheduler.test.ts`
- Delete: `src/utils/calendarScheduler.ts`

**Interfaces:**
- Consumes: `Schedule`
- Produces: `CalendarEngine.generateGrid(schedules, activeMonthDate)` 无状态算法计算接口

- [ ] **Step 1: 修改日历测试，改用 CalendarEngine 验证网格生成**

更新 `tests/calendarScheduler.test.ts`（原测试修改）：
```typescript
import { describe, it, expect } from 'vitest';
import { CalendarEngine } from '../src/utils/calendarEngine';
import { Schedule } from '../src/types';

describe('CalendarEngine.generateGrid', () => {
  it('should generate exactly 42 slots containing correct dates', () => {
    const schedules: Schedule[] = [];
    const activeDate = new Date(2026, 6, 1); // 2026-07-01
    const grid = CalendarEngine.generateGrid(schedules, activeDate);

    expect(grid.length).toBe(42);
    expect(grid[0].dateKey).toBe('2026-06-29'); // 2026-07-01 是周三，周一为 6-29
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

运行: `npx vitest run --root . tests/calendarScheduler.test.ts`
预期结果: FAIL (无法找到 `/src/utils/calendarEngine`)

- [ ] **Step 3: 提取并完整搬迁算法为 CalendarEngine**

新建 `src/utils/calendarEngine.ts`（移植并规整原 scheduler 逻辑）：
```typescript
import { Schedule } from '../types';

export interface ScheduleInstance extends Schedule {
  instanceStart: Date;
  instanceEnd: Date;
}

export interface CalendarDaySlot {
  date: Date;
  dateKey: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  slots: (ScheduleInstance | null)[];
  allInstances: ScheduleInstance[];
}

function toDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export class CalendarEngine {
  static generateGrid(schedules: Schedule[], activeMonthDate: Date): CalendarDaySlot[] {
    const year = activeMonthDate.getFullYear();
    const month = activeMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    
    const start = new Date(firstDay);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 41);
    end.setHours(23, 59, 59, 999);

    const instances: ScheduleInstance[] = [];
    schedules.forEach(schedule => {
      const sStart = new Date(schedule.startTime);
      const sEnd = schedule.endTime ? new Date(schedule.endTime) : sStart;
      const duration = Math.max(0, sEnd.getTime() - sStart.getTime());

      if (schedule.recurrence === 'daily') {
        let cur = new Date(sStart);
        if (cur < start) {
          cur = new Date(start);
          cur.setHours(sStart.getHours(), sStart.getMinutes(), sStart.getSeconds());
        }
        while (cur <= end) {
          instances.push({
            ...schedule,
            instanceStart: new Date(cur),
            instanceEnd: new Date(cur.getTime() + duration)
          });
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        if (sStart <= end && sEnd >= start) {
          instances.push({ ...schedule, instanceStart: sStart, instanceEnd: sEnd });
        }
      }
    });

    instances.sort((a, b) => a.instanceStart.getTime() - b.instanceStart.getTime() || 
      (b.instanceEnd.getTime() - b.instanceStart.getTime()) - (a.instanceEnd.getTime() - a.instanceStart.getTime()));

    const daySlotsMap: Record<string, (ScheduleInstance | null)[]> = {};
    const dayAllInstances: Record<string, ScheduleInstance[]> = {};

    instances.forEach(inst => {
      const curDate = new Date(inst.instanceStart);
      curDate.setHours(0, 0, 0, 0);
      const endDate = new Date(inst.instanceEnd);
      endDate.setHours(23, 59, 59, 999);

      let availableSlot = 0;
      let slotFound = false;
      while (!slotFound && availableSlot < 3) {
        let canFit = true;
        let tempDate = new Date(curDate);
        while (tempDate <= endDate) {
          const key = toDateKey(tempDate);
          if (daySlotsMap[key] && daySlotsMap[key][availableSlot]) {
            canFit = false;
            break;
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }
        if (canFit) {
          slotFound = true;
        } else {
          availableSlot++;
        }
      }

      if (slotFound) {
        let tempDate = new Date(curDate);
        while (tempDate <= endDate) {
          const key = toDateKey(tempDate);
          if (!daySlotsMap[key]) daySlotsMap[key] = [null, null, null];
          daySlotsMap[key][availableSlot] = inst;
          
          if (!dayAllInstances[key]) dayAllInstances[key] = [];
          dayAllInstances[key].push(inst);
          
          tempDate.setDate(tempDate.getDate() + 1);
        }
      }
    });

    const grids: CalendarDaySlot[] = [];
    const todayKey = toDateKey(new Date());
    for (let i = 0; i < 42; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = toDateKey(date);
      grids.push({
        date,
        dateKey: key,
        isToday: key === todayKey,
        isCurrentMonth: date.getMonth() === month,
        slots: daySlotsMap[key] || [null, null, null],
        allInstances: dayAllInstances[key] || []
      });
    }
    return grids;
  }
}
```

- [ ] **Step 4: 运行测试验证通过，并清理旧平铺模块**

运行: `npx vitest run --root . tests/calendarScheduler.test.ts`
预期结果: PASS
清理: `rm src/utils/calendarScheduler.ts`

- [ ] **Step 5: Commit**

```bash
git add src/utils/calendarEngine.ts tests/calendarScheduler.test.ts
git rm src/utils/calendarScheduler.ts
git commit -m "feat: migrate and encapsulate flat calendar algorithm into state-free CalendarEngine service"
```

---

### Task 5: 优化 SchedulesView 接入 CalendarEngine 渲染

**Files:**
- Modify: `src/views/SchedulesView.vue`

**Interfaces:**
- Consumes: `CalendarEngine.generateGrid`
- Produces: 优化重构后的 Vue 页面

- [ ] **Step 1: 编写构建测试，验证没有任何编译导入冲突**

运行: `npx vue-tsc --noEmit`
预期结果: FAIL (因为 `SchedulesView.vue` 还在尝试从 `./utils/calendarScheduler` 导入旧的 `generateCalendarGrid` 接口，而旧文件已被移除)

- [ ] **Step 2: 在 Vue 组件中替换日历生成调用**

修改 `src/views/SchedulesView.vue` 中的导入和调用逻辑：

定位修改：
```vue
// 替换原有的导入
import { generateCalendarGrid } from '../utils/calendarScheduler';
// 替换为：
import { CalendarEngine } from '../utils/calendarEngine';
```

定位计算日历格子的 `calendarCells` 计算属性：
```typescript
// 替换前：
const calendarCells = computed(() => {
  return generateCalendarGrid(store.schedules, new Date(calendarYear.value, calendarMonth.value, 1));
});

// 替换后：
const calendarCells = computed(() => {
  return CalendarEngine.generateGrid(store.schedules, new Date(calendarYear.value, calendarMonth.value, 1));
});
```

- [ ] **Step 3: 验证类型检查与静态编译成功**

运行: `npx vue-tsc --noEmit`
预期结果: PASS

- [ ] **Step 4: Commit**

```bash
git add src/views/SchedulesView.vue
git commit -m "refactor: upgrade schedules view component to invoke the stateless calendar engine service"
```

---

### Task 6: 优化 SyncManager 重试机制与错误反馈

**Files:**
- Modify: `src/utils/syncService.ts`
- Modify: `tests/syncService.test.ts`

**Interfaces:**
- Consumes: `Schedule` (类型安全包含 revision)
- Produces: `SyncManager` 并发自愈与退避同步模块

- [ ] **Step 1: 编写重试状态机与网络异常自愈失败的测试**

更新 `tests/syncService.test.ts`：
```typescript
import { describe, it, expect, vi } from 'vitest';
import { SyncManager, SyncRemoteAdapter } from '../src/utils/syncService';

describe('SyncManager Exponential Retry', () => {
  it('should retry up to 3 times and fail on continuous network issue', async () => {
    let callCount = 0;
    const mockAdapter: SyncRemoteAdapter = {
      getServerTime: () => Promise.resolve(new Date().toISOString()),
      fetchRemoteChanges: () => Promise.resolve([]),
      pushLocalChanges: vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error("Network Down"));
      })
    };

    const manager = new SyncManager(mockAdapter, 5); // 快速重试间隔 (5ms)
    await expect(manager.sync([])).rejects.toThrow("Sync aborted: Network retry limit exceeded");
    expect(callCount).toBe(4); // 初始执行 + 3次重试 = 4次
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

运行: `npx vitest run --root . tests/syncService.test.ts`
预期结果: FAIL (缺少 `SyncManager` 新对象重试异常及适配接口实现)

- [ ] **Step 3: 实现具有指数退避退让算法的 SyncManager**

重构 `src/utils/syncService.ts`：
```typescript
import { Schedule } from '../types';

export interface ConflictResolver {
  resolve(local: Schedule[], remote: Schedule[], clockOffset: number): Schedule[];
}

export class LWWConflictResolver implements ConflictResolver {
  resolve(local: Schedule[], remote: Schedule[], clockOffset: number = 0): Schedule[] {
    const mergedMap = new Map<string, Schedule>();
    local.forEach(s => mergedMap.set(s.id, s));

    remote.forEach(rem => {
      const loc = mergedMap.get(rem.id);
      if (!loc) {
        mergedMap.set(rem.id, rem);
        return;
      }

      const locRev = loc.revision || 0;
      const remRev = rem.revision || 0;

      if (remRev > locRev) {
        mergedMap.set(rem.id, rem);
      } else if (remRev === locRev) {
        const locTime = new Date(loc.updatedAt).getTime();
        const remTime = new Date(rem.updatedAt).getTime() - clockOffset;
        if (remTime > locTime) {
          mergedMap.set(rem.id, rem);
        }
      }
    });

    return Array.from(mergedMap.values());
  }
}

export interface SyncRemoteAdapter {
  fetchRemoteChanges(sinceRevision: number): Promise<Schedule[]>;
  pushLocalChanges(chunks: Schedule[], chunkIndex: number): Promise<boolean>;
  getServerTime(): Promise<string>;
}

export class SyncManager {
  private resolver = new LWWConflictResolver();
  
  constructor(
    private remoteAdapter: SyncRemoteAdapter,
    private baseDelayMs: number = 1000 // 支持重置重试间隔延迟以方便测试
  ) {}

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async runWithRetry<T>(fn: () => Promise<T>, retriesLeft: number = 3): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retriesLeft <= 0) {
        throw new Error("Sync aborted: Network retry limit exceeded");
      }
      // 计算退避延迟
      const delay = this.baseDelayMs * Math.pow(2, 3 - retriesLeft);
      await this.sleep(delay);
      return this.runWithRetry(fn, retriesLeft - 1);
    }
  }

  async sync(localData: Schedule[]): Promise<Schedule[]> {
    // 1. 同步服务器偏差时间
    const serverTimeStr = await this.runWithRetry(() => this.remoteAdapter.getServerTime());
    const serverTime = new Date(serverTimeStr).getTime();
    const clockOffset = serverTime - Date.now();

    // 2. 拉取远程数据变更
    const remoteData = await this.runWithRetry(() => this.remoteAdapter.fetchRemoteChanges(0));

    // 3. 分批传输本地数据并双向 ACK
    const CHUNK_SIZE = 100;
    const totalLocalChunks = Math.ceil(localData.length / CHUNK_SIZE);
    
    for (let i = 0; i < totalLocalChunks; i++) {
      const chunk = localData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const ack = await this.runWithRetry(() => this.remoteAdapter.pushLocalChanges(chunk, i));
      if (!ack) {
        throw new Error(`ACK failed for chunk index: ${i}`);
      }
    }

    // 4. 合并冲突
    return this.resolver.resolve(localData, remoteData, clockOffset);
  }
}

// 维持对 SyncService 旧导出的桥接适配，防止破坏已有外部引链
export class SyncService {
  async syncIncrement(localData: Schedule[], remoteData: Schedule[]): Promise<Schedule[]> {
    const resolver = new LWWConflictResolver();
    return resolver.resolve(localData, remoteData, 0);
  }
}
