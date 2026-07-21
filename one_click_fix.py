"""Codex Desktop 左侧任务栏一键修复启动器。"""

from __future__ import annotations

import subprocess
import sys
import ctypes
from pathlib import Path


def 设置中文控制台() -> None:
    """统一为 UTF-8，避免不同 Windows 系统代码页导致中文乱码。"""
    try:
        ctypes.windll.kernel32.SetConsoleOutputCP(65001)
        ctypes.windll.kernel32.SetConsoleCP(65001)
    except (AttributeError, OSError):
        pass
    for 文本流 in (sys.stdout, sys.stderr):
        if hasattr(文本流, "reconfigure"):
            文本流.reconfigure(encoding="utf-8", errors="replace")


def 主程序() -> int:
    设置中文控制台()
    仓库目录 = Path(__file__).resolve().parent
    修复脚本 = 仓库目录 / "fix-sidebar.ps1"
    if not 修复脚本.is_file():
        print(f"错误：没有找到修复脚本：{修复脚本}")
        return 2

    print("正在修复 Codex Desktop 左侧任务栏，请稍候……\n", flush=True)
    结果 = subprocess.run(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(修复脚本),
        ],
        cwd=仓库目录,
        check=False,
    )

    if 结果.returncode == 0:
        print("\n完成：现在可以回到 Codex Desktop 查看左侧任务列表。")
    else:
        print(f"\n未完成：修复程序退出代码为 {结果.returncode}。")
    return 结果.returncode


if __name__ == "__main__":
    退出代码 = 主程序()
    if "--no-pause" not in sys.argv:
        try:
            input("\n按回车键关闭窗口……")
        except EOFError:
            pass
    raise SystemExit(退出代码)
