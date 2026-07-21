# Codex Desktop Sidebar Fix

修复 Windows 版 ChatGPT/Codex Desktop 登录后左侧栏一直显示 **Work**、任务搜索为空，但悬浮窗中的 Codex 任务仍然正常的问题。

## 适用症状

- 退出登录时左侧 Codex 任务列表正常，登录后却只显示 Work。
- 悬浮窗可以正常查看和切换 Codex 任务。
- 左侧搜索不到已有任务。
- 主窗口可能闪回新页面，模型列表也与正常 Codex 界面不同。

本工具只处理客户端运行态返回 `denied / missing-account` 的情况。其他拒绝原因会原样退出，不会绕过工作区或服务器权限。

## 使用方法

1. 打开 ChatGPT/Codex Desktop，登录并等待主窗口完全加载。
2. 下载本仓库源码。
3. 双击 `fix-sidebar.cmd`。
4. 看到“修复成功”后回到主窗口，无需重启。

需要 Node.js 22 或更高版本。脚本也会自动寻找 Codex 本地运行时附带的 Node.js。

## 原理

受影响版本的主窗口已经登录且支持 Codex，但传给本地界面权限判断的 `accountId` 意外为空，于是主侧栏被判定为 `missing-account`。悬浮窗使用不同的界面状态，因此仍能正常工作。

工具在程序完全启动后临时连接 Electron 主进程，仅修复当前进程中的这一项界面状态。它不会修改账号文件、登录令牌、安装目录或服务端权限。ChatGPT 退出后修复自然失效，下次遇到问题可重新运行。

## 已验证环境

- Windows 11
- ChatGPT/Codex Desktop `26.715.9079.0`
- 2026-07-22

客户端更新可能改变内部模块。工具找不到匹配状态时会安全退出，欢迎提交 Issue 并附上客户端版本；不要上传 Token、账号 ID 或包含个人路径的完整日志。

## 安全说明

工具会短暂在本机 `127.0.0.1:9229` 开启 Node/Electron 调试端口，并在完成后从目标进程内部关闭。详细说明见 [SECURITY.md](SECURITY.md)。

## License

[MIT](LICENSE)
