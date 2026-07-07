# TailwindCSS v4 与 Shadcn-vue 集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有的 Vue 3 + Vite + Tauri V2 项目中引入 **TailwindCSS v4** 高性能 Rust 样式引擎，并完整初始化 **Shadcn-vue** 组件库环境，为未来的高阶 UI 交互组件提供底层支撑。

**Architecture:**
1. 安装 TailwindCSS v4 及 Vite 官方原生插件；
2. 配置 `vite.config.js` 注册编译插件；
3. 将 `@import "tailwindcss"` 及 shadcn HSL 颜色变量桥接至 `src/styles.css` 中（使用 v4 的 CSS-First `@theme` 指令，从而不需要 `tailwind.config.js` 配置文件）；
4. 提供满足 `shadcn-vue` CLI 所需的 `components.json`，并执行非交互式初始化。

---

### Task 1: 安装与配置 TailwindCSS v4 编译环境

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `src/styles.css`
- Modify: `src/main.ts`
- Modify: `src/index.html`

- [ ] **Step 1: 安装依赖包**

在项目根目录下运行安装命令（引入 tailwindcss 4 和 vite 插件）：
```bash
npm install -D tailwindcss@4.0.0-beta.8 @tailwindcss/vite@4.0.0-beta.8
```

- [ ] **Step 2: 在 vite.config.js 中配置插件**

修改 `vite.config.js`，引入并配置 `@tailwindcss/vite` 插件。
修改后内容：
```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: 'src',
  plugins: [
    vue(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        /^\@tauri-apps\/api/,
        /^\@tauri-apps\/plugin/
      ]
    }
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
});
```

- [ ] **Step 3: 重构 CSS 引入机制（符合 Vite 模块化最佳实践）**

为了让 Vite 能接管并热更新 `styles.css`，我们必须将其从 `index.html` 移入 `main.ts`。

1. 修改 `src/index.html`，删除原静态引入：
   ```diff
   -    <link rel="stylesheet" href="./styles.css" />
   ```
2. 修改 `src/main.ts`，在顶部加入：
   ```typescript
   import './styles.css';
   ```

- [ ] **Step 4: 在 src/styles.css 中导入 TailwindCSS 并声明 @theme 主题映射**

在 `src/styles.css` 文件的**最顶部**（第 1 行）插入以下 Tailwind 指令与主题映射：
```css
@import "tailwindcss";

@theme {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
}
```

---

### Task 2: 初始化 Shadcn-vue 环境

**Files:**
- Create: `components.json`
- Modify: `src/styles.css`

- [ ] **Step 1: 写入 components.json 配置文件**

在根目录下创建 `components.json`，告诉 CLI 相关的路径映射：
```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "default",
  "typescript": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/utils"
  }
}
```

- [ ] **Step 2: 创建伪 tailwind.config.js 以绕过 CLI 校验**

因为 `shadcn-vue` 初始化工具在当前版本仍会强行检查 `tailwind.config.js` 文件是否存在。
在项目根目录下创建一个空的 `tailwind.config.js` 文件：
```javascript
// Dummy file to bypass shadcn-vue CLI verification
module.exports = {};
```

- [ ] **Step 3: 运行 shadcn-vue 初始化命令**

使用 `npx` 执行自动初始化：
```bash
npx shadcn-vue@latest init -y -d
```
*(参数说明：`-y` 自动确认，`-d` 默认参数，无需交互)*

- [ ] **Step 4: 将 Shadcn 的 HSL 变量追加至 src/styles.css**

将底层的 base variables 追加到 `src/styles.css` 文件中：
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}
```

---

### Task 3: 验证构建与静态类型

- [ ] **Step 1: 运行类型校验与编译检查**

运行：`npx vue-tsc --noEmit && npx vitest run --root .`
Expected: PASS (确认引入新库和重构 CSS 引入机制后，测试及编译无任何阻碍)

- [ ] **Step 2: Commit 代码**

```bash
git add .
git commit -m "chore: integrate TailwindCSS v4 and initialize shadcn-vue configuration"
```
