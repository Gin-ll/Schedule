import { createRouter, createWebHashHistory } from 'vue-router';
import SchedulesView from '../views/SchedulesView.vue';
import CalendarView from '../views/CalendarView.vue';
import CategoriesView from '../views/CategoriesView.vue';
import WidgetView from '../views/WidgetView.vue';
import HistoryView from '../views/HistoryView.vue';
import MattersView from '../views/MattersView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/schedules' },
    { path: '/schedules', component: SchedulesView },
    { path: '/calendar', component: CalendarView },
    { path: '/categories', component: CategoriesView },
    { path: '/matters', component: MattersView },
    { path: '/widget', component: WidgetView },
    { path: '/history', component: HistoryView }
  ]
});

export default router;
