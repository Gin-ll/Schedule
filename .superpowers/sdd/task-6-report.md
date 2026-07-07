# Task 6 Implementation Report: 优化 SyncManager 重试机制与错误反馈

## 1. 任务背景与目标
本次重构的第 6 步也是最后一步，旨在优化客户端同步的重试机制与冲突解决。在 `src/utils/syncService.ts` 中实现更稳健、支持退避重试和错误隔离的 `SyncManager`。主要目标包括：
* **网络适配器隔离**：声明 `SyncRemoteAdapter` 接口，隔离底层的网络请求（如服务器时间获取、拉取远程变更、推送本地变更），为同步服务提供一致且可测试的外部契约。
* **冲突裁决重构**：重构 `LWWConflictResolver` 中的冲突判定逻辑。直接访问 `Schedule` 结构中的 `revision` 字段，实现类型安全的版本号判定。
* **指数退避重试机制**：在 `SyncManager` 中实现指数退避重试算法（Exponential Backoff Retry），默认支持至多 3 次重试，每次重试时间为 `baseDelayMs * 2^(3 - retriesLeft)`。当重试次数达到上限后抛出 `Sync aborted: Network retry limit exceeded`。
* **双向 ACK 与分批机制**：对于空数据以及分批数据在同步时都进行双向 ACK 确认（在 `sync` 函数中处理，分片计算能够兼容 `localData` 长度为 0 的边界情况）。

---

## 2. 修改文件清单
本次开发修改并新增了以下文件及逻辑：
1. **`src/utils/syncService.ts`**：
   * 声明 `SyncRemoteAdapter` 接口。
   * 实现具有指数退避机制的 `SyncManager` 及其 `runWithRetry` 辅助方法。
   * 优化 `LWWConflictResolver` 消除 `(loc as any).revision` 的 unsafe 强制类型转换，直接利用 `Schedule.revision`。
   * 保留对旧的 `SyncService` 类的桥接导出，防止外部引链中断。
2. **`tests/syncService.test.ts`**：
   * 导入 `vi` 与 `SyncManager`, `SyncRemoteAdapter`。
   * 添加了全新的 `SyncManager Exponential Retry` 单元测试，测试了在网络连续失败（`pushLocalChanges` 持续抛错）下能否正确进行 3 次重试（一共 4 次调用）并最终抛出指定异常。

---

## 3. 实现细节解析

### 3.1 冲突解决器 `LWWConflictResolver`
通过类型安全的 `revision` 处理逻辑，比较本地与远程版本号。若版本号一致，基于时钟偏差修正后的物理时间戳（`updatedAt`）来执行 Last-Write-Wins (LWW) 裁决。
```typescript
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
```

### 3.2 具有指数退避的 `SyncManager`
指数退避算法公式：`delay = baseDelayMs * 2^(3 - retriesLeft)`。
当 `retriesLeft` 从 3 依次递减时，其延迟系数分别对应为 $2^0 = 1$、$2^1 = 2$、$2^2 = 4$。
```typescript
  private async runWithRetry<T>(fn: () => Promise<T>, retriesLeft: number = 3): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retriesLeft <= 0) {
        throw new Error("Sync aborted: Network retry limit exceeded");
      }
      const delay = this.baseDelayMs * Math.pow(2, 3 - retriesLeft);
      await this.sleep(delay);
      return this.runWithRetry(fn, retriesLeft - 1);
    }
  }
```

为了让空数组在同步时同样可以触发双向 ACK 确认并匹配简报中的 `manager.sync([])` 异常流测试，在 `sync()` 中将 `totalLocalChunks` 计算调整为：
```typescript
const totalLocalChunks = localData.length === 0 ? 1 : Math.ceil(localData.length / CHUNK_SIZE);
```

---

## 4. 测试与验证
我们通过在本地环境运行 `npx vitest run --root . tests/syncService.test.ts` 来验证实现结果：

```bash
 RUN  v4.1.10 /Users/aohan/aohan_dev_self_project/Schedule

 ✓ tests/syncService.test.ts (3 tests) 43ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  15:23:16
   Duration  188ms (transform 26ms, setup 0ms, import 36ms, tests 43ms, environment 0ms)
```

测试全部通过（3 passed），重试计数准确为 4 次（1次正常调用 + 3次退避重试），退避时间精确工作。

---

## 5. 结论
本步重构顺利完成，`SyncManager` 获得了符合规范的分布式时钟纠钟与指数退避网络自愈机制，并提供隔离良好的 `SyncRemoteAdapter` 契约，保证客户端同步体验与容错反馈的稳定性。
至此，Schedule 重构的全部 6 个 Task 已经完美收官。
