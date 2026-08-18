<template>
  <div class="app-shell" :class="{ 'is-widget': isWidgetWindow }">
    <aside class="sidebar" v-if="!isWidgetWindow">
      <div class="brand">
        <img class="brand-mark" src="@/assets/logo.png" title="Schedule" alt="Logo" />
      </div>
      <nav class="nav">
        <!-- 路由到 schedules 视图 -->
        <router-link to="/schedules" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="日程">
            <Icon icon="lucide:list-todo" width="24" height="24" />
          </button>
        </router-link>

        <!-- 路由到 calendar 视图 -->
        <router-link to="/calendar" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="日历">
            <Icon icon="lucide:calendar" width="24" height="24" />
          </button>
        </router-link>
        
        <!-- 路由到 categories 视图 -->
        <router-link to="/categories" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="分类管理">
            <Icon icon="lucide:folder" width="24" height="24" />
          </button>
        </router-link>

        <!-- 路由到 matters 视图（事项功能暂时注释）
        <router-link to="/matters" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="事项管理">
            <Icon icon="lucide:briefcase" width="24" height="24" />
          </button>
        </router-link>
        -->

        <!-- 路由到 history 视图 -->
        <router-link to="/history" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="历史回顾">
            <Icon icon="lucide:history" width="24" height="24" />
          </button>
        </router-link>

        <!-- 路由到 trash 视图 -->
        <router-link to="/trash" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="回收站">
            <Icon icon="lucide:trash-2" width="24" height="24" />
          </button>
        </router-link>
      </nav>
      <div class="nav-bottom" style="margin-top: auto; padding-bottom: 8px;">
        <button class="nav-item" @click="openWidgetWindow" type="button" title="桌面组件">
          <Icon icon="lucide:layout-template" width="24" height="24" />
        </button>
        <button class="nav-item" @click="isSettingsOpen = true" type="button" title="设置">
          <Icon icon="lucide:settings" width="24" height="24" />
        </button>
      </div>
    </aside>
    <main class="main" :style="isWidgetWindow ? 'padding: 0;' : ''">
      <WidgetView v-if="isWidgetWindow" />
      <router-view v-else />
    </main>

    <Dialog v-model:open="isSettingsOpen">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>
            调整应用程序的偏好设置。
          </DialogDescription>
        </DialogHeader>
        <div class="py-4 flex flex-col gap-4">
          <!-- 颜色模式 -->
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium" style="color: var(--text);">颜色模式</span>
            <div class="flex items-center gap-2">
              <span class="text-xs cursor-pointer select-none" style="color: var(--muted-foreground);" @click="toggleTheme(false)">白天</span>
              <button 
                type="button" 
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                :class="isDarkMode ? 'bg-primary' : 'bg-input'"
                @click="toggleTheme(!isDarkMode)"
              >
                <span 
                  class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform"
                  :class="isDarkMode ? 'translate-x-4' : 'translate-x-0'"
                ></span>
              </button>
              <span class="text-xs cursor-pointer select-none" style="color: var(--muted-foreground);" @click="toggleTheme(true)">黑夜</span>
            </div>
          </div>
          <!-- 开机自启 -->
          <div class="flex items-center justify-between" v-if="!isWidgetWindow">
            <span class="text-sm font-medium" style="color: var(--text);">开机自启</span>
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                :class="isAutostartEnabled ? 'bg-primary' : 'bg-input'"
                @click="toggleAutostart(!isAutostartEnabled)"
              >
                <span 
                  class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform"
                  :class="isAutostartEnabled ? 'translate-x-4' : 'translate-x-0'"
                ></span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { useScheduleStore } from './stores/scheduleStore';
import { startNotificationService } from './utils/notificationService';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Icon } from '@iconify/vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WidgetView from './views/WidgetView.vue';

export default defineComponent({
  name: 'App',
  components: {
    Icon,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    WidgetView
  },
  setup() {
    const store = useScheduleStore();
    const isSettingsOpen = ref(false);
    const isDarkMode = ref(localStorage.getItem('theme') === 'dark');
    const isWidgetWindow = ref(false);
    const isAutostartEnabled = ref(false);

    try {
      const appWindow = getCurrentWindow();
      isWidgetWindow.value = appWindow.label === 'widget';
    } catch (e) {
      console.warn("Not running in Tauri or failed to get window label", e);
    }

    const toggleTheme = (checked: boolean) => {
      isDarkMode.value = checked;
      if (checked) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    };

    onMounted(async () => {
      if (isDarkMode.value) {
        document.documentElement.classList.add('dark');
      }
      if (isWidgetWindow.value) {
        document.body.classList.add('is-widget-body');
      }
      // 自动加载初始数据
      await store.loadAll();

      // 检查开机自启状态 (仅限主窗口)
      if (!isWidgetWindow.value) {
        try {
          const { isEnabled } = await import('@tauri-apps/plugin-autostart');
          isAutostartEnabled.value = await isEnabled();
        } catch (e) {
          console.warn("Failed to check autostart status", e);
        }
        // 启动到期提醒轮询服务（主窗口关闭被隐藏而非销毁，轮询可持续运行）
        startNotificationService(store);
      }

      // 监听多窗口同步事件
      try {
        const { listen } = await import('@tauri-apps/api/event');
        await listen('sync-data', async () => {
          console.log("Received sync-data event, reloading store...");
          await store.loadAll();
        });
      } catch (e) {
        console.warn("Failed to listen for sync-data events", e);
      }
    });

    const toggleAutostart = async (enabled: boolean) => {
      try {
        const { enable, disable } = await import('@tauri-apps/plugin-autostart');
        if (enabled) {
          await enable();
          isAutostartEnabled.value = true;
        } else {
          await disable();
          isAutostartEnabled.value = false;
        }
      } catch (e) {
        console.error("Failed to toggle autostart", e);
      }
    };

    const openWidgetWindow = async () => {
      try {
        let widgetWindow = await WebviewWindow.getByLabel('widget');
        if (widgetWindow) {
          await widgetWindow.show();
          await widgetWindow.setFocus();
        } else {
          widgetWindow = new WebviewWindow('widget', {
            url: '/widget',
            title: 'Desktop Widget',
            width: 320,
            height: 780,
            transparent: true,
            decorations: false,
            alwaysOnTop: false,
            resizable: true,
            visible: false,
            skipTaskbar: true
          });
          widgetWindow.once('tauri://created', () => {
            widgetWindow.show();
            widgetWindow.setFocus();
          });
        }
      } catch (error) {
        console.error('Failed to open widget window:', error);
      }
    };

    return {
      store,
      isSettingsOpen,
      isDarkMode,
      isWidgetWindow,
      isAutostartEnabled,
      toggleTheme,
      toggleAutostart,
      openWidgetWindow
    };
  }
});
</script>

<style scoped>
.app-shell.is-widget {
  background: transparent !important;
}
</style>

<style>
/* 引入全局 styles.css */
@import "./styles.css";

/* 覆盖桌面组件的 body 约束 */
body.is-widget-body {
  min-width: 0 !important;
  background: transparent !important;
}
</style>
