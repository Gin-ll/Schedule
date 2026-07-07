<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-mark" src="@/assets/logo.png" title="Schedule" alt="Logo" />
      </div>
      <nav class="nav">
        <!-- 路由到 schedules 视图 -->
        <router-link to="/schedules" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="日程与日历">
            <Icon icon="lucide:calendar-days" width="24" height="24" />
          </button>
        </router-link>
        
        <!-- 路由到 categories 视图 -->
        <router-link to="/categories" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="分类管理">
            <Icon icon="lucide:folder" width="24" height="24" />
          </button>
        </router-link>
      </nav>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { useScheduleStore } from './stores/scheduleStore';
import { Icon } from '@iconify/vue';

export default defineComponent({
  name: 'App',
  components: {
    Icon
  },
  setup() {
    const store = useScheduleStore();
    onMounted(async () => {
      // 自动加载初始数据
      await store.loadAll();
    });
  }
});
</script>

<style>
/* 引入全局 styles.css */
@import "./styles.css";
</style>
