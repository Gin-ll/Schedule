# Schedule Windows 桌面端

此目录存放 Windows 桌面端相关开发文件。

## 当前结构

- `index.html`：桌面端界面入口
- `styles.css`：桌面端样式
- `app.js`：桌面端本地业务逻辑
- `electron/`：Electron 桌面壳入口
- `package.json`：桌面端依赖和打包脚本
- `release/`：桌面端打包产物目录

## 后端约定

后续桌面端后端代码也放在此目录下，建议使用：

- `backend/`：桌面端后端服务
- `backend/routes/desktop/`：桌面端专用接口
- `backend/routes/mobile/`：移动端调用接口

移动端不单独实现后端，直接调用桌面端后端提供的移动端接口。
