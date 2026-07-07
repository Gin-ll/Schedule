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
