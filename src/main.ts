import './styles.css';
import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './router';
import { dbManager } from './utils/databaseManager';
import { platform } from './utils/platformAdapter';

async function init() {
  // 初始化窗口大小和位置
  await platform.initWindow();

  // 检查 SQLite 数据库完整性
  const ok = await dbManager.runIntegrityCheck();
  if (!ok) {
    console.warn("Database corrupted! Auto-rebuild process will run next time");
  }
  
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}

init();
