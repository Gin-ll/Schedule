export interface PlatformAdapter {
  initWindow(): Promise<void>;
  sendNotification(title: string, body: string): Promise<void>;
  requestPermission(): Promise<boolean>;
  showError(title: string, message: string): Promise<void>;
}

export class TauriPlatformAdapter implements PlatformAdapter {
  async initWindow() {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      if (win.label !== 'main') {
        return;
      }
      const { PhysicalPosition, PhysicalSize } = await import('@tauri-apps/api/dpi');

      // 1. 设置默认的固定窗口尺寸 (物理像素 1798x1277)
      await win.setSize(new PhysicalSize(1798, 1277));

      // 2. 设置默认的固定窗口位置 (物理像素 x=401, y=183)
      await win.setPosition(new PhysicalPosition(401, 183));

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
  async showError(title: string, message: string) {
    try {
      const { message: tauriMessage } = await import('@tauri-apps/plugin-dialog');
      await tauriMessage(message, { title, kind: 'error' });
    } catch (e) {
      console.error("Tauri dialog error:", e);
      alert(`${title}: ${message}`);
    }
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
  async showError(title: string, message: string) {
    alert(`${title}: ${message}`);
  }
}

export const platform = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ 
  ? new TauriPlatformAdapter() 
  : new WebPlatformAdapter();
