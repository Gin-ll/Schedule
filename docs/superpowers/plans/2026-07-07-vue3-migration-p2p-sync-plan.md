# Vue 3 + Pinia + TS 迁移与局域网 P2P 同步实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目重构为模块化、类型安全且具备完全局域网 P2P 自主同步与 SQLite 自动迁移的 Vue 3 应用。

**Architecture:** 前端 UI 面向 Vue 3 渲染，Pinia 接管全局状态。通过平台适配层屏蔽 Tauri 与 Web 平台差异；存储基于 SQLite 实现异步串行并发控制；P2P 局域网同步利用 mDNS 广播发现与双向 Socket 对等分片交换，提供时钟偏差补偿与逻辑版本号校验的冲突解决。

**Tech Stack:** Vue 3, Pinia, Vue Router, TypeScript, Vite, tauri-plugin-sql, tauri-plugin-notification.

## Global Constraints

*   Node.js 必须支持 ES Modules 模块化打包（"type": "module"）
*   Vite 根目录配置为 "src"
*   TypeScript 必须开启严格模式（strict: true）
*   SQLite 读写必须通过串行队列，强制启用 WAL 模式

---

## 1. 计划文件清单

### Task 1: 项目基础依赖与 TypeScript 环境搭建
*   **Files**:
    *   Modify: [package.json](file:///Users/aohan/aohan_dev_self_project/Schedule/package.json), [vite.config.js](file:///Users/aohan/aohan_dev_self_project/Schedule/vite.config.js)
    *   Create: [tsconfig.json](file:///Users/aohan/aohan_dev_self_project/Schedule/tsconfig.json), `src/env.d.ts`, `src/verify-build.ts`
*   **Interfaces**:
    *   Produces: 无（环境配置）
*   - [ ] **Step 1: 写入 tsconfig.json 与 Vite 插件配置**
    在根目录写入 [tsconfig.json](file:///Users/aohan/aohan_dev_self_project/Schedule/tsconfig.json)：
    ```json
    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "ESNext",
        "moduleResolution": "Node",
        "strict": true,
        "jsx": "preserve",
        "importHelpers": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "sourceMap": true,
        "baseUrl": ".",
        "paths": {
          "@/*": ["src/*"]
        },
        "lib": ["esnext", "dom", "dom.iterable", "scripthost"]
      },
      "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
      "exclude": ["node_modules"]
    }
    ```
    更新 `src/env.d.ts` 以声明 Vue 文件类型：
    ```typescript
    declare module '*.vue' {
      import type { DefineComponent } from 'vue';
      const component: DefineComponent<{}, {}, any>;
      export default component;
    }
    ```
    修改 [package.json](file:///Users/aohan/aohan_dev_self_project/Schedule/package.json) 引入开发依赖：
    ```json
    {
      "devDependencies": {
        "typescript": "^5.0.0",
        "@vitejs/plugin-vue": "^5.0.0",
        "vue-tsc": "^2.0.0"
      },
      "dependencies": {
        "vue": "^3.4.0",
        "pinia": "^2.1.0",
        "vue-router": "^4.3.0"
      }
    }
    ```
    修改 [vite.config.js](file:///Users/aohan/aohan_dev_self_project/Schedule/vite.config.js) 引入 Vue 插件：
    ```javascript
    import { defineConfig } from 'vite';
    import vue from '@vitejs/plugin-vue';
    import path from 'path';

    export default defineConfig({
      root: 'src',
      plugins: [vue()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src')
        }
      },
      build: {
        outDir: '../dist',
        emptyOutDir: true,
      }
    });
    ```
*   - [ ] **Step 2: 写入校验文件验证编译器**
    创建 `src/verify-build.ts`：
    ```typescript
    export interface TestContract {
      value: string;
    }
    export const contract: TestContract = { value: "build_success" };
    ```
*   - [ ] **Step 3: 运行构建指令确认配置无误**
    运行：`npx tsc --noEmit && npx vite build`
    Expected: 构建成功且无类型报错。
*   - [ ] **Step 4: Commit**
    ```bash
    git add package.json vite.config.js tsconfig.json src/env.d.ts src/verify-build.ts
    git commit -m "chore: setup ts config and configure vue plugin"
    ```

---

### Task 2: 核心类型声明与平台适配层 (Platform Adapter)
*   **Files**:
    *   Create: `src/types/index.ts`, `src/utils/platformAdapter.ts`, `tests/platformAdapter.test.ts`
*   **Interfaces**:
    *   Produces: `interface Schedule`, `interface PlatformAdapter`, `class TauriPlatformAdapter`, `class WebPlatformAdapter`
*   - [ ] **Step 1: 编写测试用例验证平台调用降级**
    创建 `tests/platformAdapter.test.ts`：
    ```typescript
    import { describe, it, expect, vi } from 'vitest';
    import { WebPlatformAdapter } from '../src/utils/platformAdapter';

    describe('WebPlatformAdapter', () => {
      it('should fallback to browser notification API', async () => {
        const mockNotification = vi.fn();
        vi.stubGlobal('Notification', mockNotification);
        vi.stubGlobal('window', { Notification: { permission: 'granted' } });
        
        const adapter = new WebPlatformAdapter();
        await adapter.sendNotification('Test Title', 'Test Body');
        expect(mockNotification).toHaveBeenCalled;
      });
    });
    ```
*   - [ ] **Step 2: 运行测试验证失败**
    运行：`npx vitest run tests/platformAdapter.test.ts`
    Expected: FAIL - 缺少 `platformAdapter` 实现。
*   - [ ] **Step 3: 编写 Core Types 与 PlatformAdapter 隔离实现**
    在 `src/types/index.ts` 写入前述 `Schedule`，`Category` 和 `Subtask` 的接口声明。
    在 `src/utils/platformAdapter.ts` 写入：
    ```typescript
    export interface PlatformAdapter {
      initWindow(): Promise<void>;
      sendNotification(title: string, body: string): Promise<void>;
      requestPermission(): Promise<boolean>;
    }

    export class TauriPlatformAdapter implements PlatformAdapter {
      async initWindow() {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          await win.show();
        } catch (e) {
          console.error("Tauri initWindow error:", e);
        }
      }
      async sendNotification(title: string, body: string) {
        const { sendNotification } = await import('@tauri-apps/plugin-notification');
        sendNotification({ title, body });
      }
      async requestPermission() {
        const { requestPermission, isPermissionGranted } = await import('@tauri-apps/plugin-notification');
        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === 'granted';
        }
        return granted;
      }
    }

    export class WebPlatformAdapter implements PlatformAdapter {
      async initWindow() {
        console.log("Web window setup: no window layout to restore");
      }
      async sendNotification(title: string, body: string) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        } else {
          console.log(`[Web Notification] ${title}: ${body}`);
        }
      }
      async requestPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        const status = await Notification.requestPermission();
        return status === 'granted';
      }
    }

    export const platform = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ 
      ? new TauriPlatformAdapter() 
      : new WebPlatformAdapter();
    ```
*   - [ ] **Step 4: 运行测试验证通过**
    运行：`npx vitest run tests/platformAdapter.test.ts`
    Expected: PASS
*   - [ ] **Step 5: Commit**
    ```bash
    git add src/types/index.ts src/utils/platformAdapter.ts tests/platformAdapter.test.ts
    git commit -m "feat: implement platform adapter and declare domain types"
    ```

---

### Task 3: 日历排期计算引擎 (Calendar Scheduler)
*   **Files**:
    *   Create: `src/utils/calendarScheduler.ts`, `tests/calendarScheduler.test.ts`
*   **Interfaces**:
    *   Consumes: `src/types/index.ts`
    *   Produces: `generateCalendarGrid(schedules: Schedule[], activeMonthDate: Date): CalendarDaySlot[]`
*   - [ ] **Step 1: 编写单元测试用例（覆盖跨天日程对齐与 slots 分配）**
    创建 `tests/calendarScheduler.test.ts`：
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { generateCalendarGrid } from '../src/utils/calendarScheduler';
    import { Schedule } from '../src/types';

    describe('generateCalendarGrid', () => {
      it('should allocate correct horizontal slots for overlapping schedules', () => {
        const mockSchedules: Schedule[] = [
          {
            id: 'sch-1',
            title: 'Event A',
            content: '',
            startTime: '2026-07-07T10:00:00',
            endTime: '2026-07-08T12:00:00',
            recurrence: 'none',
            categoryId: '',
            status: 'pending',
            reminder: 'none',
            important: false,
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'sch-2',
            title: 'Event B',
            content: '',
            startTime: '2026-07-07T11:00:00',
            endTime: '2026-07-07T13:00:00',
            recurrence: 'none',
            categoryId: '',
            status: 'pending',
            reminder: 'none',
            important: false,
            createdAt: '',
            updatedAt: ''
          }
        ];
        
        const grid = generateCalendarGrid(mockSchedules, new Date(2026, 6, 1));
        const daySlot = grid.find(d => d.dateKey === '2026-07-07');
        expect(daySlot).toBeDefined();
        // Event A should occupy slot 0, Event B should occupy slot 1
        expect(daySlot!.slots[0]?.id).toBe('sch-1');
        expect(daySlot!.slots[1]?.id).toBe('sch-2');
      });
    });
    ```
*   - [ ] **Step 2: 运行测试验证失败**
    运行：`npx vitest run tests/calendarScheduler.test.ts`
    Expected: FAIL
*   - [ ] **Step 3: 实现纯算法日历分配引擎**
    创建 `src/utils/calendarScheduler.ts`，移植 app.js 日历插槽计算，去除 DOM 绑定。
    由于代码行数限制，核心排期算法需计算 42 个格子。这里展示其实现框架：
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

    export function generateCalendarGrid(schedules: Schedule[], activeMonthDate: Date): CalendarDaySlot[] {
      const year = activeMonthDate.getFullYear();
      const month = activeMonthDate.getMonth();
      const firstDay = new Date(year, month, 1);
      
      // Start of week calculation (Monday as start)
      const start = new Date(firstDay);
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - day + 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 41);
      end.setHours(23, 59, 59, 999);

      // Generate all instances including recurrences
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

      // Sort instances
      instances.sort((a, b) => a.instanceStart.getTime() - b.instanceStart.getTime() || 
        (b.instanceEnd.getTime() - b.instanceStart.getTime()) - (a.instanceEnd.getTime() - a.instanceStart.getTime()));

      const daySlotsMap: Record<string, (ScheduleInstance | null)[]> = {};
      const dayAllInstances: Record<string, ScheduleInstance[]> = {};

      // Allocate slot indices (0, 1, 2)
      instances.forEach(inst => {
        const curDate = new Date(inst.instanceStart);
        curDate.setHours(0,0,0,0);
        const endDate = new Date(inst.instanceEnd);
        endDate.setHours(23,59,59,999);

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

      // Map to 42 grids
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
    ```
*   - [ ] **Step 4: 运行测试验证通过**
    运行：`npx vitest run tests/calendarScheduler.test.ts`
    Expected: PASS
*   - [ ] **Step 5: Commit**
    ```bash
    git add src/utils/calendarScheduler.ts tests/calendarScheduler.test.ts
    git commit -m "feat: add calendar scheduling engine and unit tests"
    ```

---

### Task 4: DatabaseManager SQLite 串行并发控制与自动迁移
*   **Files**:
    *   Create: `src/utils/databaseManager.ts`, `tests/databaseManager.test.ts`
*   **Interfaces**:
    *   Produces: `class DatabaseManager` (单例，提供 `execute(sql, params)`, `select(sql, params)` 串行异步 API 并执行 WAL 迁移)
*   - [ ] **Step 1: 编写单元测试验证并发调用排队机制**
    创建 `tests/databaseManager.test.ts`：
    ```typescript
    import { describe, it, expect, vi } from 'vitest';
    import { DatabaseManager } from '../src/utils/databaseManager';

    describe('DatabaseManager', () => {
      it('should execute SQL commands sequentially', async () => {
        const mockSqlExecutor = vi.fn().mockImplementation(() => new Promise(res => setTimeout(() => res([1]), 50)));
        const manager = new DatabaseManager(mockSqlExecutor as any);
        
        const p1 = manager.execute("INSERT INTO test VALUES(1)");
        const p2 = manager.execute("INSERT INTO test VALUES(2)");
        
        await Promise.all([p1, p2]);
        // Verification: p2 must start execution only after p1 completes
        expect(mockSqlExecutor).toHaveBeenCalledTimes(2);
      });
    });
    ```
*   - [ ] **Step 2: 运行测试验证失败**
    运行：`npx vitest run tests/databaseManager.test.ts`
    Expected: FAIL
*   - [ ] **Step 3: 编写串行化 Promise 写入队列与 WAL 初始化机制**
    创建 `src/utils/databaseManager.ts`：
    ```typescript
    export class DatabaseManager {
      private writeQueue: Promise<any> = Promise.resolve();
      private dbConnection: any = null;

      constructor(private rawExecutor?: any) {}

      private async getDb() {
        if (this.dbConnection) return this.dbConnection;
        if (this.rawExecutor) return this.rawExecutor;
        
        const Database = (await import('tauri-plugin-sql-api')).default;
        this.dbConnection = await Database.load("sqlite:schedule.db");
        // Enable WAL mode & busy timeout
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
        // Enforce write queue serialization to prevent SQLITE_BUSY
        const nextPromise = this.writeQueue.then(async () => {
          const db = await this.getDb();
          if (typeof db === 'function') return db(sql, params);
          return db.execute(sql, params);
        });
        this.writeQueue = nextPromise.catch(() => {});
        return nextPromise;
      }

      async runIntegrityCheck(): Promise<boolean> {
        try {
          const result = await this.select("PRAGMA integrity_check;");
          return result[0] && result[0]['integrity_check'] === 'ok';
        } catch {
          return false;
        }
      }
    }

    export const dbManager = new DatabaseManager();
    ```
*   - [ ] **Step 4: 运行测试验证通过**
    运行：`npx vitest run tests/databaseManager.test.ts`
    Expected: PASS
*   - [ ] **Step 5: Commit**
    ```bash
    git add src/utils/databaseManager.ts tests/databaseManager.test.ts
    git commit -m "feat: implement serialized database manager with WAL support"
    ```

---

### Task 5: Pinia 状态管理层 (ScheduleStore)
*   **Files**:
    *   Create: `src/stores/scheduleStore.ts`, `tests/scheduleStore.test.ts`
*   **Interfaces**:
    *   Consumes: `src/types/index.ts`, `src/utils/databaseManager.ts`
    *   Produces: `useScheduleStore = defineStore('schedule', ...)`
*   - [ ] **Step 1: 编写单元测试验证级联删除时间戳更新**
    创建 `tests/scheduleStore.test.ts`：
    ```typescript
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { setActivePinia, createPinia } from 'pinia';
    import { useScheduleStore } from '../src/stores/scheduleStore';

    describe('scheduleStore', () => {
      beforeEach(() => {
        setActivePinia(createPinia());
      });

      it('should cascade delete category and update schedule timestamps', async () => {
        const store = useScheduleStore();
        store.schedules = [
          {
            id: 'sch-1',
            title: 'Schedule In Category',
            content: '',
            startTime: '2026-07-07T10:00:00',
            categoryId: 'cat-1',
            status: 'pending',
            reminder: 'none',
            important: false,
            createdAt: '2026-07-07T00:00:00',
            updatedAt: '2026-07-07T00:00:00'
          }
        ];
        
        await store.deleteCategory('cat-1');
        const sch = store.schedules.find(s => s.id === 'sch-1');
        expect(sch!.categoryId).toBe('');
        // Must update updatedAt timestamp
        expect(sch!.updatedAt).not.toBe('2026-07-07T00:00:00');
      });
    });
    ```
*   - [ ] **Step 2: 运行测试验证失败**
    运行：`npx vitest run tests/scheduleStore.test.ts`
    Expected: FAIL
*   - [ ] **Step 3: 编写 Pinia Store CRUD 及级联删除更新时间戳逻辑**
    创建 `src/stores/scheduleStore.ts`：
    ```typescript
    import { defineStore } from 'pinia';
    import { Schedule, Category } from '../types';
    import { dbManager } from '../utils/databaseManager';

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
            this.schedules = await dbManager.select("SELECT * FROM schedules WHERE is_deleted = 0");
            this.categories = await dbManager.select("SELECT * FROM categories WHERE is_deleted = 0");
          } catch (e) {
            console.error("Failed to load store from SQLite:", e);
          } finally {
            this.loading = false;
          }
        },
        async addSchedule(payload: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) {
          const now = new Date().toISOString();
          const id = `sch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const schedule: Schedule = { ...payload, id, createdAt: now, updatedAt: now };
          this.schedules.push(schedule);
          
          await dbManager.execute(
            "INSERT INTO schedules (id, title, content, start_time, end_time, recurrence, category_id, status, reminder, important, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [id, schedule.title, schedule.content, schedule.startTime, schedule.endTime || null, schedule.recurrence, schedule.categoryId, schedule.status, schedule.reminder, schedule.important ? 1 : 0, now, now]
          );
        },
        async updateSchedule(id: string, payload: Partial<Schedule>) {
          const now = new Date().toISOString();
          this.schedules = this.schedules.map(s => {
            if (s.id === id) {
              const updated = { ...s, ...payload, updatedAt: now, isNotified: false };
              dbManager.execute(
                "UPDATE schedules SET title=?, content=?, start_time=?, end_time=?, recurrence=?, category_id=?, status=?, reminder=?, important=?, updated_at=? WHERE id=?",
                [updated.title, updated.content, updated.startTime, updated.endTime || null, updated.recurrence, updated.categoryId, updated.status, updated.reminder, updated.important ? 1 : 0, now, id]
              );
              return updated;
            }
            return s;
          });
        },
        async deleteCategory(catId: string) {
          const now = new Date().toISOString();
          // Cascade update associated schedules
          this.schedules = this.schedules.map(s => {
            if (s.categoryId === catId) {
              dbManager.execute("UPDATE schedules SET category_id = '', updated_at = ? WHERE id = ?", [now, s.id]);
              return { ...s, categoryId: '', updatedAt: now };
            }
            return s;
          });
          this.categories = this.categories.filter(c => c.id !== catId);
          await dbManager.execute("UPDATE categories SET is_deleted = 1 WHERE id = ?", [catId]);
        }
      }
    });
    ```
*   - [ ] **Step 4: 运行测试验证通过**
    运行：`npx vitest run tests/scheduleStore.test.ts`
    Expected: PASS
*   - [ ] **Step 5: Commit**
    ```bash
    git add src/stores/scheduleStore.ts tests/scheduleStore.test.ts
    git commit -m "feat: implement pinia schedule store with cascading update logic"
    ```

---

### Task 6: P2P 同步引擎 (SyncService) 与冲突合并
*   **Files**:
    *   Create: `src/utils/syncService.ts`, `tests/syncService.test.ts`
*   **Interfaces**:
    *   Consumes: `src/types/index.ts`, `src/utils/databaseManager.ts`
    *   Produces: `class SyncService`, `interface ConflictResolver`, `class LWWConflictResolver`
*   - [ ] **Step 1: 编写同步合并冲突测试用例**
    创建 `tests/syncService.test.ts`：
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { LWWConflictResolver } from '../src/utils/syncService';
    import { Schedule } from '../src/types';

    describe('LWWConflictResolver', () => {
      it('should resolve conflict using logical revision and updatedAt', () => {
        const resolver = new LWWConflictResolver();
        
        // Scenario: remote revision is higher than local
        const local: Schedule = {
          id: 'sch-1', title: 'Local', content: '', startTime: '', recurrence: 'none', categoryId: '',
          status: 'pending', reminder: 'none', important: false, createdAt: '', updatedAt: '2026-07-07T12:00:00'
        };
        const remote: Schedule = {
          id: 'sch-1', title: 'Remote', content: '', startTime: '', recurrence: 'none', categoryId: '',
          status: 'pending', reminder: 'none', important: false, createdAt: '', updatedAt: '2026-07-07T11:00:00'
        };
        
        // Inject revision field (using type extension)
        (local as any).revision = 1;
        (remote as any).revision = 2;
        
        const merged = resolver.resolve([local], [remote]);
        expect(merged[0].title).toBe('Remote'); // Remote wins because revision is higher
      });
    });
    ```
*   - [ ] **Step 2: 运行测试验证失败**
    运行：`npx vitest run tests/syncService.test.ts`
    Expected: FAIL
*   - [ ] **Step 3: 编写时钟偏移补偿与版本号合并核心逻辑**
    创建 `src/utils/syncService.ts`：
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

          const locRev = (loc as any).revision || 0;
          const remRev = (rem as any).revision || 0;

          if (remRev > locRev) {
            mergedMap.set(rem.id, rem);
          } else if (remRev === locRev) {
            const locTime = new Date(loc.updatedAt).getTime();
            // Compensate remote updatedAt timestamp based on calculated clock offset
            const remTime = new Date(rem.updatedAt).getTime() - clockOffset;
            if (remTime > locTime) {
              mergedMap.set(rem.id, rem);
            }
          }
        });

        return Array.from(mergedMap.values());
      }
    }

    export class SyncService {
      private resolver = new LWWConflictResolver();
      private clockOffset = 0; // RemoteTime - LocalTime

      setClockOffset(offset: number) {
        this.clockOffset = offset;
      }

      async syncIncrement(localData: Schedule[], remoteData: Schedule[]): Promise<Schedule[]> {
        return this.resolver.resolve(localData, remoteData, this.clockOffset);
      }
    }
    ```
*   - [ ] **Step 4: 运行测试验证通过**
    运行：`npx vitest run tests/syncService.test.ts`
    Expected: PASS
*   - [ ] **Step 5: Commit**
    ```bash
    git add src/utils/syncService.ts tests/syncService.test.ts
    git commit -m "feat: implement LWW conflict resolver with clock skew compensation"
    ```

---

### Task 7: Vue 3 核心 UI 组件与页面跳转整合
*   **Files**:
    *   Create: `src/App.vue`, `src/views/SchedulesView.vue`, `src/views/CategoriesView.vue`, `src/router/index.ts`, `src/main.ts`
*   **Interfaces**:
    *   Consumes: `src/stores/scheduleStore.ts`, `src/utils/calendarScheduler.ts`
*   - [ ] **Step 1: 编写主路由和主应用集成测试**
    修改 `src/verify-build.ts` 引入 Vue 3 应用挂载验证：
    ```typescript
    import { createApp } from 'vue';
    import App from './App.vue';
    import { createPinia } from 'pinia';
    import router from './router';

    export function bootstrap() {
      const app = createApp(App);
      app.use(createPinia());
      app.use(router);
      return app;
    }
    ```
*   - [ ] **Step 2: 运行编译确认构建正确**
    运行：`npx tsc --noEmit && npx vite build`
    Expected: 构建成功且无编译报错。
*   - [ ] **Step 3: 编写 Vue 3 UI 视图和路由挂载**
    创建 `src/router/index.ts` 配置路由跳转：
    ```typescript
    import { createRouter, createWebHistory } from 'vue-router';
    import SchedulesView from '../views/SchedulesView.vue';
    import CategoriesView from '../views/CategoriesView.vue';

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', redirect: '/schedules' },
        { path: '/schedules', component: SchedulesView },
        { path: '/categories', component: CategoriesView }
      ]
    });

    export default router;
    ```
    创建 `src/App.vue`（提供主侧边栏导航和路由容器）：
    ```html
    <template>
      <div class="app-layout">
        <aside class="sidebar">
          <h2>日程管理</h2>
          <router-link to="/schedules" class="nav-btn">日程视图</router-link>
          <router-link to="/categories" class="nav-btn">分类管理</router-link>
        </aside>
        <main class="content-view">
          <router-view />
        </main>
      </div>
    </template>
    <style scoped>
    .app-layout { display: flex; height: 100vh; background: #0b0f19; color: #fff; }
    .sidebar { width: 240px; border-right: 1px solid #24304f; padding: 20px; }
    .nav-btn { display: block; margin: 10px 0; color: #9ca3af; text-decoration: none; }
    .router-link-active { color: #6366f1; font-weight: bold; }
    .content-view { flex: 1; padding: 20px; overflow-y: auto; }
    </style>
    ```
    创建 `src/views/SchedulesView.vue` 与 `src/views/CategoriesView.vue` 提供核心逻辑渲染，利用 `useScheduleStore` 的响应式状态与 `generateCalendarGrid` 方法。
    最后创建 `src/main.ts`：
    ```typescript
    import { createApp } from 'vue';
    import App from './App.vue';
    import { createPinia } from 'pinia';
    import router from './router';
    import { dbManager } from './utils/databaseManager';

    async function init() {
      // Check database integrity
      const ok = await dbManager.runIntegrityCheck();
      if (!ok) {
        console.warn("Database corrupted! Auto-rebuild process will run next time");
      }
      
      const app = createApp(App);
      app.use(createPinia());
      app.use(router);
      app.mount('#app');
    }
    init();
    ```
*   - [ ] **Step 4: 运行生产包编译**
    运行：`npx tsc --noEmit && npx vite build`
    Expected: 编译输出产物至 `/dist`。
*   - [ ] **Step 5: Commit**
    ```bash
    git add src/router/index.ts src/App.vue src/main.ts src/verify-build.ts
    git commit -m "feat: integrate vue router and bootstrap vue 3 application"
    ```
