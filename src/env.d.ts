declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@tauri-apps/plugin-sql' {
  const Database: {
    load(path: string): Promise<any>;
  };
  export default Database;
}
