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
    const totalLocalChunks = localData.length === 0 ? 1 : Math.ceil(localData.length / CHUNK_SIZE);
    
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
