#!/usr/bin/env bash
# test/integration/test-desktop.sh — 桌面 GUI 集成测试
# 简化版：不用 set -e，不用 trap，不用 exec tee（macOS 上 hang）
# 失败立刻报错退出靠 || 显式 exit

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DESKTOP="$ROOT/desktop"
LOG="$ROOT/test/integration/.last-test.log"

mkdir -p "$(dirname "$LOG")"
echo "========================================" > "$LOG"
echo "  桌面 GUI 集成测试（main.cjs spawn mock daemon）" >> "$LOG"
echo "  时间：$(date)" >> "$LOG"
echo "========================================" >> "$LOG"
echo "" >> "$LOG"

tail -f "$LOG" &
TAIL_PID=$!

# 测试结束清理 tail
trap "kill $TAIL_PID 2>/dev/null" EXIT

echo "[准备] 清理旧进程和 18789 端口" | tee -a "$LOG"
pkill -9 -f "openclaw-daemon" 2>/dev/null
pkill -9 -f "Electron.app" 2>/dev/null
sleep 1
PIDS=$(lsof -ti :18789 2>/dev/null)
[ -n "$PIDS" ] && kill -9 $PIDS
sleep 1
REMAIN=$(lsof -ti :18789 2>/dev/null | wc -l | tr -d ' ')
if [ "$REMAIN" != "0" ]; then
    echo "  X 18789 端口仍被占用 ($REMAIN 个进程)，无法继续测试" | tee -a "$LOG"
    lsof -i :18789
    exit 1
fi
echo "  V 18789 已清空" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ---------- Phase 1: 准备 fake home ----------
echo "[Phase 1] 准备 fake home（含 mock daemon shim）" | tee -a "$LOG"
FAKE_HOME="$ROOT/test/integration/.fake-home"
rm -rf "$FAKE_HOME"
mkdir -p "$FAKE_HOME/wutonghui-xiaobei/bin"

# shim：main.cjs spawn 这个 → 它 exec 真 mock daemon
cat > "$FAKE_HOME/wutonghui-xiaobei/bin/openclaw" << SHIMEOF
#!/bin/bash
exec node "$ROOT/test/mock/openclaw-daemon.js" 18789
SHIMEOF
cp "$FAKE_HOME/wutonghui-xiaobei/bin/openclaw" "$FAKE_HOME/wutonghui-xiaobei/bin/wutonghui-xiaobei"
chmod +x "$FAKE_HOME/wutonghui-xiaobei/bin/openclaw" "$FAKE_HOME/wutonghui-xiaobei/bin/wutonghui-xiaobei"
echo "  V shim: $FAKE_HOME/wutonghui-xiaobei/bin/openclaw" | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ---------- Phase 2: 启动 Electron（main.cjs spawn mock daemon）----------
echo "[Phase 2] 启动 Electron（main.cjs spawn mock daemon）" | tee -a "$LOG"
cd "$DESKTOP" || exit 1

# 启动 Electron（后台）
WUTONGHUI_HOME="$FAKE_HOME" WUTONGHUI_DEV=1 \
./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron . > /tmp/wth-electron-test.log 2>&1 &
ELEC_PID=$!
echo "  Electron PID: $ELEC_PID" | tee -a "$LOG"

# 等 daemon 就绪（最多 30 秒）
echo "  等待 daemon 就绪..." | tee -a "$LOG"
DAEMON_READY=false
for i in $(seq 1 30); do
    sleep 1
    if grep -q "daemon.*就绪" /tmp/wth-electron-test.log 2>/dev/null; then
        DAEMON_READY=true
        echo "  V daemon 已就绪（用时 ${i}s）" | tee -a "$LOG"
        break
    fi
    if ! kill -0 $ELEC_PID 2>/dev/null; then
        echo "  X Electron 进程已死" | tee -a "$LOG"
        cat /tmp/wth-electron-test.log | tail -10
        exit 1
    fi
done

if [ "$DAEMON_READY" != "true" ]; then
    echo "  X 30 秒内 daemon 未就绪" | tee -a "$LOG"
    cat /tmp/wth-electron-test.log | tail -10
    exit 1
fi

ELEC_PROCS=$(ps -ef | grep "Electron.app" | grep -v grep | wc -l | tr -d ' ')
echo "  V Electron 进程: $ELEC_PROCS 个" | tee -a "$LOG"
if [ "$ELEC_PROCS" -lt 2 ]; then
    echo "  X Electron 进程不足（$ELEC_PROCS 个）" | tee -a "$LOG"
    cat /tmp/wth-electron-test.log | tail -10
    exit 1
fi

# 验证 /healthz
HEALTH=$(curl -s -m 3 http://127.0.0.1:18789/healthz 2>&1)
if [[ "$HEALTH" != *"\"ok\":true"* ]]; then
    echo "  X /healthz 异常: $HEALTH" | tee -a "$LOG"
    exit 1
fi
echo "  V /healthz: $HEALTH" | tee -a "$LOG"

# 验证 /chat
CHAT=$(curl -s -m 3 -X POST http://127.0.0.1:18789/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"集成测试","session_id":"e2e"}' 2>&1)
if [[ "$CHAT" != *"\"content\""* ]]; then
    echo "  X /chat 异常: $CHAT" | tee -a "$LOG"
    exit 1
fi
echo "  V /chat: ${CHAT:0:80}..." | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ---------- Phase 3: main.cjs 日志 ----------
echo "[Phase 3] main.cjs 关键日志" | tee -a "$LOG"
grep -E "\[main\]|\[daemon" /tmp/wth-electron-test.log 2>/dev/null | head -10 | sed 's/^/    /' | tee -a "$LOG"
echo "" | tee -a "$LOG"

# ---------- Phase 4: 优雅退出 ----------
echo "[Phase 4] 优雅退出测试" | tee -a "$LOG"
kill -TERM $ELEC_PID 2>/dev/null
sleep 3
if kill -0 $ELEC_PID 2>/dev/null; then
    kill -KILL $ELEC_PID 2>/dev/null
    sleep 1
fi
REMAIN=$(ps -ef | grep "Electron.app" | grep -v grep | wc -l | tr -d ' ')
if [ "$REMAIN" = "0" ]; then
    echo "  V Electron 全部退出（残留: 0）" | tee -a "$LOG"
else
    echo "  X 仍有 $REMAIN 个 Electron 进程残留" | tee -a "$LOG"
    pkill -KILL -f "Electron.app" 2>/dev/null
fi

echo "" | tee -a "$LOG"
echo "========================================" | tee -a "$LOG"
echo "  ✓ 集成测试通过" | tee -a "$LOG"
echo "========================================" | tee -a "$LOG"
echo "" | tee -a "$LOG"
echo "日志：$LOG"

exit 0
