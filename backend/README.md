# 桌面端后端

此目录预留给 Windows 桌面端后端服务。

后续实现同步能力时，建议在这里提供统一 API：

- `/api/desktop/*`：Windows 桌面端使用
- `/api/mobile/*`：Android 移动端使用
- `/api/common/*`：两端共享能力

移动端调用这里的后端接口即可。
