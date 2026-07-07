<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark" title="Schedule">S</span>
      </div>
      <nav class="nav">
        <!-- 路由到 schedules 视图 -->
        <router-link to="/schedules" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="日程与日历">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        </router-link>
        
        <!-- 路由到 categories 视图 -->
        <router-link to="/categories" custom v-slot="{ navigate, isActive }">
          <button class="nav-item" :class="{ active: isActive }" @click="navigate" type="button" title="分类管理">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
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

export default defineComponent({
  name: 'App',
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
