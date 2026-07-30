/* 玄机阁 · 集成测试（仅测试用，依赖 jsdom，不进站点）
   在类浏览器环境中真实加载每个页面：内联 <script src> 后由 jsdom 执行，
   验证① 无运行时错误 ② 各模块在 DOMContentLoaded 后正确渲染。
   运行：node integration-test.js */
'use strict';
const fs = require('fs');
const path = require('path');
const JSDOM = require('/Users/macos/.workbuddy/binaries/node/workspace/node_modules/jsdom').JSDOM;
const VirtualConsole = require('/Users/macos/.workbuddy/binaries/node/workspace/node_modules/jsdom').VirtualConsole;

const ROOT = '/Users/macos/WorkBuddy/2026-07-25-22-48-26/玄机阁';
const pages = [
  { file: 'index.html', check: (d) => d.getElementById('today').textContent.includes('今日') },
  { file: 'modules/bazi.html', check: (d) => d.getElementById('out').innerHTML.includes('四柱') },
  { file: 'modules/ziwei.html', check: (d) => d.getElementById('out').innerHTML.includes('命宫') },
  { file: 'modules/hehun.html', check: (d) => d.getElementById('out').innerHTML.includes('其一') },
  { file: 'modules/huangli.html', check: (d) => d.getElementById('yi').textContent.length > 0 },
  { file: 'modules/nameology.html', check: (d) => {
    var out0 = d.getElementById('out').innerHTML;
    var initOk = out0.includes('名盘') && out0.includes('王') && out0.includes('小明') && out0.includes('吉 4') && out0.includes('凶 1');
    // 真实交互：改为复姓「欧阳娜娜」并点击计算，验证复姓识别 + summary 计数
    var xm = d.getElementById('xm'), mz = d.getElementById('mz'), btn = d.getElementById('calcBtn');
    xm.value = '欧阳'; mz.value = '娜娜'; btn.click();
    var out = d.getElementById('out').innerHTML;
    return initOk && out.includes('欧阳') && out.includes('娜娜') && out.includes('吉 3') && out.includes('凶 2');
  } },
  { file: 'modules/lingqian.html', check: (d) => { d.getElementById('drawBtn').click(); return d.getElementById('qNo').textContent.includes('签'); } },
];

let fail = 0, done = 0;
const total = pages.length;

pages.forEach((pg) => {
  const htmlPath = path.join(ROOT, pg.file);
  let html = fs.readFileSync(htmlPath, 'utf8');
  // 将 <script src="..."> 内联为 <script>...</script>，确保 jsdom 按文档顺序执行
  html = html.replace(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g, (m, src) => {
    const p = path.resolve(path.dirname(htmlPath), src);
    const code = fs.readFileSync(p, 'utf8');
    return '<script>\n' + code + '\n</script>';
  });
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.message || e)));
  vc.sendTo({ error: (...a) => errors.push('console.error: ' + a.join(' ')), warn() {}, log() {}, info() {}, debug() {} });

  let dom;
  try {
    dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  } catch (e) {
    console.log('FAIL ' + pg.file + ' | 构建 JSDOM 异常: ' + e.message);
    fail++; done++; checkExit(); return;
  }
  const { window } = dom;
  // 补齐 jsdom 未实现的方法，避免误报
  if (window.HTMLElement && !window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = function () {};
  }
  window.addEventListener('error', (e) => errors.push('window.error: ' + (e.message || e.error)));

  setTimeout(() => {
    let ok = false, detail = '';
    try { ok = pg.check(window.document); } catch (e) { detail = e.message; }
    if (ok && errors.length === 0) {
      console.log('PASS ' + pg.file);
    } else {
      fail++;
      console.log('FAIL ' + pg.file +
        (errors.length ? ' | 运行时错误: ' + errors.join(' || ') : '') +
        (detail ? ' | 断言抛错: ' + detail : (ok ? '' : ' | 断言返回 false')));
    }
    done++; checkExit();
  }, 80);
});

function checkExit() {
  if (done >= total) {
    console.log('\n=== 集成测试 ===');
    console.log('通过 ' + (total - fail) + ' / 失败 ' + fail);
    process.exit(fail ? 1 : 0);
  }
}
