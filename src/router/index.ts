import { createRouter, createWebHashHistory } from 'vue-router';
import SchedulesView from '../views/SchedulesView.vue';
import CalendarView from '../views/CalendarView.vue';
import CategoriesView from '../views/CategoriesView.vue';
import WidgetView from '../views/WidgetView.vue';
import HistoryView from '../views/HistoryView.vue';
import TrashView from '../views/TrashView.vue';
// 事项功能暂时注释
// import MattersView from '../views/MattersView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/schedules' },
    { path: '/schedules', component: SchedulesView },
    { path: '/calendar', component: CalendarView },
    { path: '/categories', component: CategoriesView },
    // { path: '/matters', component: MattersView },
    { path: '/widget', component: WidgetView },
    { path: '/history', component: HistoryView },
    { path: '/trash', component: TrashView }
  ]
});

export default router;
