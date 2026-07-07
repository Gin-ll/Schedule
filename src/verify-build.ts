import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import router from './router';

export function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  return app;
}
