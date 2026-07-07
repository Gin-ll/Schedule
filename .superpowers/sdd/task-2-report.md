# Task 2 实施报告：实现 TauriSqliteAdapter

## 1. 任务背景与目标
实现 `TauriSqliteAdapter` 适配器，使其继承原有 `databaseManager.ts` 中的并发写入 Promise 串行队列 (`writeQueue`)、SQLite WAL 模式以及 `busy_timeout = 5000` 初始化配置。同时，该适配器须继承自 `RepositoryAdapter` 接口，以便后续的仓储层重构。

## 2. 修改/新建的文件
- **新建** `src/utils/tauriSqliteAdapter.ts`：实现 `RepositoryAdapter` 接口，内置 `writeQueue` 串行写入逻辑，并在获取数据库连接时执行 WAL 及 busy_timeout 的初始化 PRAGMA 配置。
- **新建** `tests/tauriSqliteAdapter.test.ts`：编写单元测试用例，包含写入语句的并发串行性测试，以及对常规 `get`、`getAll`、`delete` 操作的验证。

## 3. 开发过程（TDD 流程）
1. **编写失败测试**：
   在 `tests/tauriSqliteAdapter.test.ts` 中根据简报规范并辅以常规 CRUD 操作编写了测试用例。
2. **运行测试验证失败**：
   运行 `npx vitest run --root . tests/tauriSqliteAdapter.test.ts`，由于未创建 `TauriSqliteAdapter` 类，导入报错，测试符合预期地失败。
3. **编写最小实现**：
   在 `src/utils/tauriSqliteAdapter.ts` 中实现 `TauriSqliteAdapter`。由于在 `getDb()` 时会配置 `PRAGMA` 执行 `execute` 语句，微调了测试用例中的断言，对 `PRAGMA` 进行了过滤，重点断言写入操作（`INSERT INTO`）的串行执行顺序。
4. **运行测试验证通过**：
   再次运行测试，成功通过。

## 4. 测试情况记录

### 单元测试运行命令
```bash
npx vitest run --root . tests/tauriSqliteAdapter.test.ts
```

### 单元测试输出
```
 RUN  v4.1.10 /Users/aohan/aohan_dev_self_project/Schedule

 ✓ tests/tauriSqliteAdapter.test.ts (2 tests) 192ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  14:01:13
   Duration  329ms (transform 23ms, setup 0ms, import 40ms, tests 192ms, environment 0ms)
```

### 全局测试运行命令
```bash
npx vitest run --root .
```

### 全局测试输出
```
 RUN  v4.1.10 /Users/aohan/aohan_dev_self_project/Schedule

 ✓ tests/syncService.test.ts (2 tests) 3ms
 ✓ tests/repositoryAdapter.test.ts (2 tests) 2ms
 ✓ tests/calendarScheduler.test.ts (1 test) 4ms
 ✓ tests/platformAdapter.test.ts (1 test) 2ms
 ✓ tests/scheduleStore.test.ts (1 test) 5ms
 ✓ tests/databaseManager.test.ts (1 test) 103ms
 ✓ tests/tauriSqliteAdapter.test.ts (2 tests) 191ms

 Test Files  7 passed (7)
      Tests  10 passed (10)
   Start at  14:01:18
   Duration  352ms (transform 266ms, setup 0ms, import 416ms, tests 309ms, environment 1ms)
```
所有测试均顺利通过。

## 5. 性能优化与测试简化（根据评审报告）
根据审查意见，对 `TauriSqliteAdapter` 进行了性能优化并简化了相关测试逻辑。

### 修改细节
1. **优化数据库初始化逻辑**：
   - 修改了 `src/utils/tauriSqliteAdapter.ts`。
   - 移除了原 `getDb()` 中每次调用都会重复执行 `PRAGMA journal_mode=WAL;` 和 `PRAGMA busy_timeout=5000;` 的逻辑。
   - 在构造函数中使用 `this.initializedDbPromise` 进行链式连接初始化，并在数据库连接建立后自动且仅执行一次 PRAGMA 配置。后续所有的 `getDb()` 调用将直接复用该已初始化的 Promise，消除了重复的 PRAGMA 写入操作开销。

2. **简化单元测试断言**：
   - 修改了 `tests/tauriSqliteAdapter.test.ts`。
   - 移除了原测试中用于过滤 PRAGMA 写入的 `executionOrder.filter` 逻辑。
   - 引入了更精确的断言验证：首先，通过 `expect(mockDbConnection.execute).toHaveBeenCalledTimes(4)` 确切验证了整个测试生命周期中仅执行了 2 次 PRAGMA 配置以及 2 次 `INSERT` 语句；其次，精确验证了 PRAGMA 的初始化和后续的 `INSERT` 语句顺序。

### 测试与检查验证
1. **类型检查**：运行 `npx vue-tsc --noEmit` 检查通过，无类型报错。
2. **单元测试**：运行 `npx vitest run --root . tests/tauriSqliteAdapter.test.ts` 通过：
   ```
   ✓ tests/tauriSqliteAdapter.test.ts (2 tests) 128ms
   Test Files  1 passed (1)
        Tests  2 passed (2)
   ```
