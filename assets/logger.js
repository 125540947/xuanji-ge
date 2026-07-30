/* 玄机阁 · 本地日志与错误监控 logger.js
   纯本地、零外链：捕获 window.onerror / unhandledrejection，写入内存环形缓冲，
   并在页面顶部展示一条可关闭的提示条。绝不向任何服务器上报（符合本阁零远程约束）。

   设计要点：
   - 浏览器：安装全局错误捕获，异常时在页面顶部给出友好提示（不暴露内部栈给普通用户，但栈存入内存缓冲供排查）。
   - Node（测试环境）：仅做内存记录，不渲染。
   - 隐私：所有日志仅驻留本机内存，刷新即清空，不上传、不落盘。 */
;(function (root) {
  'use strict';

  var isBrowser = (typeof window !== 'undefined' && typeof document !== 'undefined');

  // 环形缓冲容量（取配置，缺省 50）
  var cap = 50;
  try {
    var c = (root.XJ_CONFIG && root.XJ_CONFIG.logRingSize);
    if (typeof c === 'number' && c > 0) cap = c;
  } catch (e) { /* 配置缺失则用缺省 */ }

  var buffer = [];
  var installed = false;

  function push(level, msg, ctx) {
    var entry = {
      t: new Date().toISOString(),
      level: level,
      msg: (msg == null) ? '' : String(msg),
      ctx: ctx || null
    };
    buffer.push(entry);
    if (buffer.length > cap) buffer.shift();
    return entry;
  }

  function error(msg, ctx) { return push('error', msg, ctx); }
  function warn(msg, ctx) { return push('warn', msg, ctx); }
  function info(msg, ctx) { return push('info', msg, ctx); }
  function getBuffer() { return buffer.slice(); }
  function clear() { buffer.length = 0; }

  // 浏览器：在页面顶部渲染一条可关闭的提示条（仅展示简明信息，详情在内存缓冲）
  function showBanner(msg) {
    if (!isBrowser) return;
    try {
      var id = 'xj-error-banner';
      var old = document.getElementById(id);
      if (old && old.parentNode) old.parentNode.removeChild(old);
      var div = document.createElement('div');
      div.id = id;
      div.setAttribute('role', 'alert');
      div.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#3a1d1d;' +
        'color:#f3d9d9;font-size:13px;padding:10px 14px;box-shadow:0 2px 8px rgba(0,0,0,.4);' +
        'display:flex;align-items:center;gap:10px;font-family:system-ui,sans-serif';
      var span = document.createElement('span');
      span.style.flex = '1';
      span.textContent = '本地演算出现异常，已记录（不影响其余功能）：' + msg;
      var btn = document.createElement('button');
      btn.textContent = '×';
      btn.setAttribute('aria-label', '关闭提示');
      btn.style.cssText = 'background:none;border:none;color:#f3d9d9;font-size:18px;cursor:pointer;line-height:1';
      btn.addEventListener('click', function () { if (div.parentNode) div.parentNode.removeChild(div); });
      div.appendChild(span);
      div.appendChild(btn);
      (document.body || document.documentElement).appendChild(div);
    } catch (e) { /* 渲染失败不影响记录 */ }
  }

  // 安装全局捕获（仅浏览器，幂等）
  function install() {
    if (!isBrowser || installed) return installed;
    installed = true;
    window.onerror = function (m, s, l, c, e) {
      var where = (s ? ' @ ' + s + ':' + l : '');
      error('window.onerror: ' + m + where, e ? { stack: e.stack } : null);
      showBanner(typeof m === 'string' ? m : '脚本运行错误');
      return false;
    };
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('unhandledrejection', function (ev) {
        var r = ev && ev.reason;
        var text = (r && r.message) ? r.message : String(r);
        error('unhandledrejection: ' + text, r ? { stack: r.stack } : null);
        showBanner('异步异常：' + text);
      });
    }
    return true;
  }

  var api = {
    error: error, warn: warn, info: info,
    getBuffer: getBuffer, clear: clear, install: install,
    _buffer: buffer
  };
  root.XJ_LOG = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
