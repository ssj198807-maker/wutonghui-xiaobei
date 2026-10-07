/**
 * wutonghui-xiaobei preload script
 * 在 renderer 中暴露有限 API，避免直接暴露 node 能力
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wutonghui', {
  // 应用状态
  status: () => ipcRenderer.invoke('app:status'),

  // 外部链接
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  // 日志目录
  revealLogDir: () => ipcRenderer.invoke('app:revealLogDir'),

  // daemon 状态事件订阅
  onDaemonStatus: (cb) => {
    const listener = (_evt, data) => cb(data);
    ipcRenderer.on('daemon:status', listener);
    return () => ipcRenderer.removeListener('daemon:status', listener);
  },
  onDaemonExit: (cb) => {
    const listener = (_evt, data) => cb(data);
    ipcRenderer.on('daemon:exit', listener);
    return () => ipcRenderer.removeListener('daemon:exit', listener);
  },
  // 通过 main.cjs 调 openclaw agent CLI（绕开 WebSocket 复杂性）
  chat: (message, session_id = 'desktop') =>
    ipcRenderer.invoke('app:chat', { message, session_id }),
});
