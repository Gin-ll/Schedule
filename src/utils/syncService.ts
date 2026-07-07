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
        // 补偿远程更新时间戳：基于时钟偏差计算
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

  /**
   * 分片传输与 ACK 双向确认机制 (伪代码/空操作桥接)
   * 每 100 条数据分批分页传输，进行 ACK 确认
   */
  async syncInBatches(
    localData: Schedule[],
    remoteData: Schedule[],
    sendChunk: (chunk: Schedule[], chunkIndex: number) => Promise<boolean> = async () => true,
    receiveChunk: (chunkIndex: number) => Promise<Schedule[]> = async () => []
  ): Promise<Schedule[]> {
    const CHUNK_SIZE = 100;
    
    // 1. 发送本地数据分批（Batch Chunking）
    const totalLocalChunks = Math.ceil(localData.length / CHUNK_SIZE);
    for (let i = 0; i < totalLocalChunks; i++) {
      const chunk = localData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      // ACK 双向确认机制 (模拟发送 & 等待 ACK)
      const ack = await sendChunk(chunk, i);
      if (!ack) {
        throw new Error(`ACK failed for chunk index: ${i}`);
      }
    }

    // 2. 接收远程数据分批
    const allRemoteData: Schedule[] = [...remoteData]; // 作为空操作桥接，默认直接使用传入的 remoteData
    // 如果有自定义的分包拉取逻辑，在此拉取
    const totalRemoteChunks = Math.ceil(remoteData.length / CHUNK_SIZE);
    for (let i = 0; i < totalRemoteChunks; i++) {
      const chunk = await receiveChunk(i);
      if (chunk && chunk.length > 0) {
        allRemoteData.push(...chunk);
      }
    }

    // 3. 执行冲突裁决
    return this.syncIncrement(localData, allRemoteData);
  }
}
