import { createRouter, createWebHistory } from 'vue-router';
import SchedulesView from '../views/SchedulesView.vue';
import CategoriesView from '../views/CategoriesView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/schedules' },
    { path: '/schedules', component: SchedulesView },
    { path: '/categories', component: CategoriesView }
  ]
});

export default router;
