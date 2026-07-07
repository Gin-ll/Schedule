import { describe, it, expect, vi } from 'vitest';
import { WebPlatformAdapter } from '../src/utils/platformAdapter';

describe('WebPlatformAdapter', () => {
  it('should fallback to browser notification API', async () => {
    const mockNotification = vi.fn() as any;
    mockNotification.permission = 'granted';
    vi.stubGlobal('Notification', mockNotification);
    vi.stubGlobal('window', { Notification: mockNotification });
    
    const adapter = new WebPlatformAdapter();
    await adapter.sendNotification('Test Title', 'Test Body');
    expect(mockNotification).toHaveBeenCalled();
  });

  it('should fallback to window.alert for showError', async () => {
    const mockAlert = vi.fn();
    vi.stubGlobal('alert', mockAlert);

    const adapter = new WebPlatformAdapter();
    await adapter.showError('Error Title', 'Something went wrong');
    expect(mockAlert).toHaveBeenCalledWith('Error Title: Something went wrong');
  });
});
