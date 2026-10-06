#!/usr/bin/env node
/**
 * test/mock/openclaw-daemon.js — Mock OpenClaw daemon（用于桌面端集成测试）
 *
 * 实现 OpenClaw daemon 的最小 HTTP API 表面：
 *   GET  /healthz  → 200 {"ok": true}
 *   POST /chat     → 200 {"content": "..."}
 *
 * 用法：node test/mock/openclaw-daemon.js [PORT]
 */
'use strict';

const http = require('node:http');

const PORT = parseInt(process.argv[2] || process.env.DAEMON_PORT || '18789', 10);

const server = http.createServer((req, res) => {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${req.method} ${req.url}`);

  // GET /healthz
  if (req.method === 'GET' && req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'openclaw-mock', version: '0.1.0' }));
    return;
  }

  // POST /chat
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let msg = '';
      try {
        const data = JSON.parse(body);
        msg = (data && data.message) || '';
      } catch (_) { /* ignore */ }

      // Mock 智能路由
      let reply = `收到："${msg}"`;
      if (/小红书|写|内容/.test(msg)) {
        reply = '好的，让 content-producer crew 接手（mock）。';
      } else if (/客户|评论|潜客|线索/.test(msg)) {
        reply = '收到，让 sales-cs crew 处理（mock）。';
      } else if (/网站|PPT|ICP/.test(msg)) {
        reply = '收到，让 it-engineer crew 处理（mock）。';
      } else if (/搜索|调研|找一下/.test(msg)) {
        reply = 'smart-search 收到关键词，去查 18 类信源（mock）。';
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        content: reply,
        crew: 'mock-main',
        tool_calls: [],
        handoff: null,
      }));
    });
    return;
  }

  // 其他 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`[mock-daemon] listening on http://127.0.0.1:${PORT}\n`);
  process.stdout.write(`[mock-daemon] pid: ${process.pid}\n`);
});

// 容错：父进程关闭 pipe 时不抛 EPIPE
process.on('uncaughtException', (err) => {
  if (err && err.code === 'EPIPE') return;  // 父进程关了 stdout pipe
  // 其他错误仍然打印
  try {
    process.stderr.write(`[mock-daemon] uncaught: ${err.message}\n`);
  } catch (_) { /* ignore */ }
});

process.stdin.on('error', () => { /* parent closed stdin */ });
process.stdout.on('error', () => { /* parent closed stdout */ });
process.stderr.on('error', () => { /* parent closed stderr */ });

process.on('SIGTERM', () => {
  console.log('[mock-daemon] SIGTERM received');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
});

process.on('SIGINT', () => {
  console.log('[mock-daemon] SIGINT received');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
});
