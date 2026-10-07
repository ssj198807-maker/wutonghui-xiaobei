#!/bin/bash
# scripts/install-fast.sh — 快速安装真 OpenClaw daemon（绕开 install.sh 网络限速）
#
# 与 scripts/install.sh 的区别：
#   - install.sh      → 从父仓库 release 拉预构建 tarball（~140 MB），网络慢易失败
#   - install-simple.sh → 降级方案，下 OpenClaw 上游 zip（~251 MB），同样网络慢
#   - install-fast.sh  → 直接 npm install openclaw@2026.9.8（~50 MB deps，国内镜像快）
#
# 适用：
#   - 网络环境限制（GitHub release zip 下不完）
#   - 只想装 OpenClaw daemon 本体，不需要完整 xiaobei crew + 微信插件

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WUTONGHUI_ROOT="${WUTONGHUI_HOME:-$HOME/wutonghui-xiaobei}"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"

echo "========================================"
echo "  wutonghui-xiaobei 快速安装（npm 路线）"
echo "  时间：$(date)"
echo "========================================"
echo ""
echo "  WUTONGHUI_ROOT (程序)：$WUTONGHUI_ROOT"
echo "  OPENCLAW_HOME   (数据)：$OPENCLAW_HOME"
echo ""

# ---- 1. 准备 .npmrc（npmmirror 加速）----
cat > "$HOME/.npmrc" << 'EOF'
registry=https://registry.npmmirror.com/
fetch-retries=5
fetch-timeout=300000
EOF

# ---- 2. 装 OpenClaw + 拷 fork 资源 ----
echo "[Phase 1] 装 OpenClaw + 拷 fork crews/skills"
mkdir -p "$WUTONGHUI_ROOT/tools"
cd "$WUTONGHUI_ROOT/tools"
if [ ! -d node_modules/openclaw ]; then
    npm init -y > /dev/null 2>&1
    npm install openclaw@2026.9.8 --no-audit --no-fund 2>&1 | tail -3
fi
echo "  V openclaw 装好: $(./node_modules/.bin/openclaw --version 2>&1)"

# 软链接（main.cjs 找 ~/wutonghui-xiaobei/bin/openclaw）
mkdir -p "$WUTONGHUI_ROOT/bin"
ln -sfn "$WUTONGHUI_ROOT/tools/node_modules/.bin/openclaw" "$WUTONGHUI_ROOT/bin/openclaw"
ln -sfn "$WUTONGHUI_ROOT/tools/node_modules/.bin/openclaw" "$WUTONGHUI_ROOT/bin/wutonghui-xiaobei"
echo "  V 软链接: ~/wutonghui-xiaobei/bin/openclaw"

# 拷 fork 资源
for d in crews skills awada config-templates patches; do
    if [ -d "$ROOT/$d" ]; then
        cp -R "$ROOT/$d" "$WUTONGHUI_ROOT/$d/" 2>&1 | tail -1
    fi
done
echo ""

# ---- 3. 启动 daemon（前台）----
echo "[Phase 2] 启动 daemon（前台，按 Ctrl+C 退出）"
echo "  cd $WUTONGHUI_ROOT/tools"
echo "  ./node_modules/.bin/openclaw gateway run --dev --port 18789 --bind loopback"
echo ""
echo "  另开终端验证：curl http://127.0.0.1:18789/healthz"
echo ""
cd "$WUTONGHUI_ROOT/tools"
exec ./node_modules/.bin/openclaw gateway run --dev --port 18789 --bind loopback
