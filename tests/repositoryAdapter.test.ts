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
