#!/usr/bin/env bash
# scripts/build-mac-arm64.sh — 一键打包 wutonghui-xiaobei 桌面端（macOS Apple Silicon DMG）
#
# 前置条件：
#   - macOS 12+ (Apple Silicon)
#   - Node.js 18+
#   - 已跑过 `bash scripts/install.sh`（OpenClaw daemon 已装到 ~/wutonghui-xiaobei/）
#
# 产物：desktop/release/wutonghui-xiaobei-2.0.0-dev-arm64.dmg

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP="$ROOT/desktop"

cd "$DESKTOP"

echo "=== 步骤 1/3：检查 OpenClaw daemon ==="
DAEMON="$HOME/wutonghui-xiaobei/bin/openclaw"
if [ ! -f "$DAEMON" ]; then
    echo "  ✗ 未找到 OpenClaw daemon: $DAEMON"
    echo "  请先跑：bash scripts/install.sh"
    exit 1
fi
echo "  ✓ daemon 已装：$DAEMON"

echo ""
echo "=== 步骤 2/3：安装 electron + electron-builder ==="
npm install --no-audit --no-fund 2>&1 | tail -3

echo ""
echo "=== 步骤 3/3：构建 DMG ==="
export ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://registry.npmmirror.com/-/binary/electron-builder-binaries/"
npm run build:mac-arm64 2>&1 | tail -10

echo ""
echo "=== 产物 ==="
ls -la release/ 2>&1 | tail
