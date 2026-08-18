import { describe, it, expect, beforeAll } from 'vitest';
import { LocalStorageAdapter, MockRepositoryAdapter } from '../src/utils/repositoryAdapter';

// Mock window and localStorage for node environment
if (typeof window === 'undefined') {
  const storage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      for (const key in storage) {
        delete storage[key];
      }
    },
    length: 0,
    key: (index: number) => null,
  };
  globalThis.window = {
    localStorage: mockLocalStorage
  } as any;
  globalThis.localStorage = mockLocalStorage as any;
}

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

describe('Soft delete / trash semantics', () => {
  it('MockRepositoryAdapter: delete hides, getDeleted lists, restore brings back, purge removes forever', async () => {
    const adapter = new MockRepositoryAdapter();
    const item = { id: 'sch-trash', title: 'Trash Me', isDeleted: 0 };
    await adapter.save('sch-trash', item);

    await adapter.delete('sch-trash');
    expect(await adapter.get('sch-trash')).toBeNull();
    expect((await adapter.getAll()).length).toBe(0);

    const deleted = await adapter.getDeleted();
    expect(deleted.length).toBe(1);
    expect(deleted[0].id).toBe('sch-trash');

    await adapter.restore('sch-trash');
    expect((await adapter.getDeleted()).length).toBe(0);
    expect(await adapter.get('sch-trash')).not.toBeNull();
    expect((await adapter.getAll()).length).toBe(1);

    await adapter.delete('sch-trash');
    await adapter.purge('sch-trash');
    expect((await adapter.getDeleted()).length).toBe(0);
    expect((await adapter.getAll()).length).toBe(0);
  });

  it('LocalStorageAdapter follows the same soft delete semantics', async () => {
    const adapter = new LocalStorageAdapter('test_trash_key');
    await adapter.save('sch-1', { id: 'sch-1', title: 'A' });
    await adapter.save('sch-2', { id: 'sch-2', title: 'B' });

    await adapter.delete('sch-1');
    expect(await adapter.get('sch-1')).toBeNull();
    expect((await adapter.getDeleted()).length).toBe(1);
    expect((await adapter.getAll()).length).toBe(1);

    await adapter.restore('sch-1');
    expect((await adapter.getDeleted()).length).toBe(0);
    expect((await adapter.getAll()).length).toBe(2);

    await adapter.delete('sch-2');
    await adapter.purge('sch-2');
    expect((await adapter.getAll()).length).toBe(1);
  });
});
