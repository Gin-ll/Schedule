# Task 3 实施报告：提炼仓储深层模块并重构 scheduleStore (移除 SQL)

## 1. 任务背景与目标
提炼底层仓储的深层实体模块，重构 Pinia Store `scheduleStore.ts` 以移除所有手写的原生 SQL 语句，替换为对 `scheduleRepo` 和 `categoryRepo` 的纯 TypeScript 逻辑操作。最后，在单元测试中注入 `MockRepositoryAdapter`，实现单元测试与真实 SQLite 数据库的彻底隔离。

## 2. 修改/新建的文件
- **修改** `src/utils/databaseManager.ts`：暴露出 `scheduleRepo` 和 `categoryRepo` 深层仓储实例，并保留了旧的 `DatabaseManager` 和 `dbManager` 接口，以确保原有测试（如 `tests/databaseManager.test.ts`）和全局启动初始化（如 `src/main.ts` 中的完整性检查）的向后兼容。
- **修改** `src/stores/scheduleStore.ts`：将所有原生的 SQL 查询（如 `SELECT * FROM ...`, `INSERT INTO ...`, `UPDATE ...` 等）彻底移除，全量转为使用 `scheduleRepo` 和 `categoryRepo` 提供的 TS 方法操作（`get`, `getAll`, `save`, `delete`）。
- **修改** `tests/scheduleStore.test.ts`：移除原有的针对 `dbManager` 的 `vi.mock`，改为使用 `MockRepositoryAdapter` 进行注入以彻底实现测试隔离。增加了数据级联删除及基本操作的完整性断言。

## 3. 开发过程（TDD 流程）
1. **编写失败测试**：
   在 `tests/scheduleStore.test.ts` 中引入 `MockRepositoryAdapter`，并通过 `scheduleRepo.setAdapter(...)` 进行注入；移除了对 `dbManager` 的 Mock。
2. **运行测试验证失败**：
   运行 `npx vitest run --root . tests/scheduleStore.test.ts`。由于 `scheduleRepo` 还没有被导出和定义 `setAdapter` 方法，测试以 `TypeError` 符合预期地失败。
3. **编写最小实现并重构**：
   - 重构了 `src/utils/databaseManager.ts`，支持 DomainRepository，创建 `scheduleRepo` 和 `categoryRepo`。为了维持外部模块和其它测试的兼容性，保留了原有的 `DatabaseManager` 与 `dbManager.runIntegrityCheck` 的调用和模拟支持。
   - 重构了 `src/stores/scheduleStore.ts`，将所有 SQL 操作替换为纯 `scheduleRepo` 与 `categoryRepo` 的 API 调用。
4. **运行测试验证通过**：
   重新运行测试，测试顺利通过，并且验证了底层的 Mock 适配器状态正常写入和删除。

## 4. 测试情况记录

### 单元测试运行命令
```bash
npx vitest run --root . tests/scheduleStore.test.ts
```

### 单元测试输出
```
 RUN  v4.1.10 /Users/aohan/aohan_dev_self_project/Schedule

 ✓ tests/scheduleStore.test.ts (2 tests) 5ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  14:11:33
   Duration  172ms (transform 31ms, setup 0ms, import 83ms, tests 5ms, environment 0ms)
```

### 全局测试运行命令
```bash
npx vitest run --root .
```

### 全局测试输出
```
 RUN  v4.1.10 /Users/aohan/aohan_dev_self_project/Schedule

 ✓ tests/repositoryAdapter.test.ts (2 tests) 2ms
 ✓ tests/syncService.test.ts (2 tests) 3ms
 ✓ tests/platformAdapter.test.ts (1 test) 2ms
 ✓ tests/calendarScheduler.test.ts (1 test) 3ms
 ✓ tests/scheduleStore.test.ts (2 tests) 5ms
 ✓ tests/databaseManager.test.ts (1 test) 105ms
 ✓ tests/tauriSqliteAdapter.test.ts (2 tests) 128ms

 Test Files  7 passed (7)
      Tests  11 passed (11)
   Start at  14:12:21
   Duration  277ms (transform 228ms, setup 0ms, import 351ms, tests 248ms, environment 1ms)
```
整个项目的单元测试（共 11 个用例）全部绿色通过。

## 5. 细节处理与向后兼容性
在重构 `src/utils/databaseManager.ts` 时，为了不破坏项目中其他可能使用到原生 SQL 的辅助组件，或者在后续任务中需要清理的部分，我们通过以下两种做法实现了平滑重构：
1. **完整性检查和遗留 SQL 执行的平滑降级**：
   保留了原有的 `DatabaseManager` 类以确保 `tests/databaseManager.test.ts` 能像原来一样运行测试并发 and 串行。
2. **零编译报错**：
   在修改后运行项目级别类型检查 `npx vue-tsc --noEmit`，没有任何 TS 编译报错。
