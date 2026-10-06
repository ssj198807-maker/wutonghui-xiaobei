#!/usr/bin/env bash
# scripts/test-desktop.sh — 快速测试 wutonghui-xiaobei 桌面端（不打包）
#
# 这个脚本会启动 Electron 主进程，加载本地 renderer，spawn OpenClaw daemon
# 用 Ctrl+C 退出

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP="$ROOT/desktop"

cd "$DESKTOP"

echo "=== 检查依赖 ==="
if [ ! -d node_modules/electron ]; then
    echo "  首次运行，先装依赖…"
    npm install --no-audit --no-fund 2>&1 | tail -3
fi

echo ""
echo "=== 检查 daemon 二进制 ==="
DAEMON="$HOME/wutonghui-xiaobei/bin/openclaw"
if [ ! -f "$DAEMON" ]; then
    echo "  ⚠️  未找到 daemon: $DAEMON"
    echo "  主进程会尝试启动，失败时会在 ~/.wutonghui/logs/daemon.log 记录"
fi

echo ""
echo "=== 启动 Electron ==="
echo "  日志目录: ~/.wutonghui/logs/"
echo "  按 Ctrl+C 退出"
echo ""

export WUTONGHUI_DEV=1
exec ./node_modules/.bin/electron .
