/* 玄机阁 · 全局配置 config.js
   集中管理可调整参数，避免在各引擎中散落硬编码的魔法数。
   纯本地：不依赖远程、不读取环境变量；如需外部覆盖，可在引入本文件前
   于页面或 Node 中设置 window.XJ_CONFIG_OVERRIDE = {...}（仅合并已知字段）。

   重要：历法数据表 lunarInfo 仅覆盖 1900–2100，calendar.minYear/maxYear
   会被各引擎收敛到该区间内，超出部分自动失效（以数据表为准）。 */
;(function (root) {
  'use strict';

  var DEFAULTS = {
    calendar: { minYear: 1900, maxYear: 2100 },
    site: {
      name: '玄机阁',
      version: '1.0.0',
      buildDate: '2026-07-30'
    },
    // 客户端错误日志开关（window.onerror / unhandledrejection 捕获等）。
    // 纯本地，绝不向任何服务器上报数据。
    enableLogger: true,
    // 内存日志环形缓冲容量（最多保留最近 N 条）
    logRingSize: 50
  };

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function deepMerge(base, over) {
    var out = {};
    Object.keys(base).forEach(function (k) {
      if (isObj(base[k]) && isObj(over[k])) out[k] = deepMerge(base[k], over[k]);
      else out[k] = (over[k] !== undefined) ? over[k] : base[k];
    });
    return out;
  }

  var override = (root.XJ_CONFIG_OVERRIDE && isObj(root.XJ_CONFIG_OVERRIDE)) ? root.XJ_CONFIG_OVERRIDE : {};
  var config = deepMerge(DEFAULTS, override);

  // 防御：确保年份为合法整数
  config.calendar.minYear = Math.floor(config.calendar.minYear);
  config.calendar.maxYear = Math.floor(config.calendar.maxYear);

  root.XJ_CONFIG = config;
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
})(typeof window !== 'undefined' ? window : globalThis);
