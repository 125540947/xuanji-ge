'use strict';
// 对抗式探针：大量随机合法输入轰击引擎，捕获静默 NaN / undefined / 异常
var path = require('path');
require(path.join(__dirname, 'config.js'));
var XJ = require('./core.js');
var BAZI = require('./bazi.js');
var ZIWEI = require('./ziwei.js');
var HEHUN = require('./hehun.js');
var NAME = require('./nameology.js');
require('./kangxi-strokes.js'); // 设全局 KANGXI_STROKES

var MIN = XJ_CONFIG.calendar.minYear, MAX = XJ_CONFIG.calendar.maxYear;
var GAN = XJ.Gan, ZHI = XJ.Zhi;
function isFiniteInt(v){ return typeof v === 'number' && isFinite(v); }
function strOk(v){ return typeof v === 'string' && v.length > 0; }

function rndDate() {
  var y = MIN + Math.floor(Math.random() * (MAX - MIN + 1));
  var m = 1 + Math.floor(Math.random() * 12);
  // 真实存在的日：1..该月天数（粗略取 1..28 保证合法，再偶尔试 29/30/31 由 validDate 挡）
  var d = 1 + Math.floor(Math.random() * 28);
  if (Math.random() < 0.3) d = 1 + Math.floor(Math.random() * 31);
  return [y, m, d];
}

var problems = [];
function checkBazi(y, m, d, h, g) {
  if (!XJ.validDate(y, m, d)) return;
  var r;
  try { r = BAZI.bazi(y, m, d, h, g); }
  catch (e) { problems.push('bazi 抛错 ' + y + '-' + m + '-' + d + ' h=' + h + ' ' + g + ' :: ' + e.message); return; }
  if (![r.yearGZ, r.monthGZ, r.dayGZ, r.hourGZ].every(strOk)) problems.push('bazi 干支异常 ' + y + '/' + m + '/' + d + ' => ' + JSON.stringify([r.yearGZ,r.monthGZ,r.dayGZ,r.hourGZ]));
  if (!isFiniteInt(r.startAge) || r.startAge < 1) problems.push('bazi startAge 异常 ' + y + '/' + m + '/' + d + ' => ' + r.startAge);
  for (var k = 0; k < r.daYun.length; k++) {
    var dy = r.daYun[k];
    if (!strOk(dy.gz)) problems.push('bazi 大运干支空 ' + y + '/' + m + '/' + d + ' k=' + k);
    if (!isFiniteInt(dy.age) || dy.age < 1) problems.push('bazi 大运岁数异常 ' + y + '/' + m + '/' + d + ' => ' + dy.age);
  }
  if (!r.wx || Object.keys(r.wx).length !== 5) problems.push('bazi 五行缺失 ' + y + '/' + m + '/' + d);
}

function checkZiwei(y, m, d, h, g) {
  if (!XJ.validDate(y, m, d)) return;
  var r;
  try { r = ZIWEI.compute({ year: y, month: m, day: d, hour: h, gender: g }); }
  catch (e) { problems.push('ziwei 抛错 ' + y + '-' + m + '-' + d + ' h=' + h + ' ' + g + ' :: ' + e.message); return; }
  if (![r.gzYear, r.gzMonth, r.gzDay, r.gzHour].every(strOk)) problems.push('ziwei 四柱异常 ' + y + '/' + m + '/' + d + ' => ' + JSON.stringify([r.gzYear,r.gzMonth,r.gzDay,r.gzHour]));
  if (r.palaces.length !== 12) problems.push('ziwei 宫数异常 ' + y + '/' + m + '/' + d + ' => ' + r.palaces.length);
  var hasZiwei = r.palaces.some(function(p){ return p.stars.indexOf('紫微') >= 0; });
  if (!hasZiwei) problems.push('ziwei 紫微未落宫 ' + y + '/' + m + '/' + d);
  if (!r.bureau || !isFiniteInt(r.bureau.num)) problems.push('ziwei 五行局异常 ' + y + '/' + m + '/' + d);
  r.daXian.forEach(function(dx){ if (!strOk(dx.zhi) || !strOk(dx.palace)) problems.push('ziwei 大限空 ' + y + '/' + m + '/' + d); });
}

function checkHehun(a, b) {
  if (!XJ.validDate(a[0],a[1],a[2]) || !XJ.validDate(b[0],b[1],b[2])) return;
  var r;
  try { r = HEHUN.hehun({year:a[0],month:a[1],day:a[2],hour:a[3],gender:a[4]},
                         {year:b[0],month:b[1],day:b[2],hour:b[3],gender:b[4]}); }
  catch (e) { problems.push('hehun 抛错 ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ' :: ' + e.message); return; }
  if (!r.dims || r.dims.length !== 5) problems.push('hehun dims 异常 ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
  if (!isFiniteInt(r.total)) problems.push('hehun total 异常 ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ' => ' + r.total);
  if (!strOk(r.xiang)) problems.push('hehun xiang 空 ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
}

// 随机轰击
var N = 4000;
var genders = ['男','女'];
for (var i = 0; i < N; i++) {
  var a = rndDate().concat([Math.floor(Math.random()*24), genders[Math.floor(Math.random()*2)]]);
  var b = rndDate().concat([Math.floor(Math.random()*24), genders[Math.floor(Math.random()*2)]]);
  checkBazi(a[0],a[1],a[2],a[3],a[4]);
  checkZiwei(a[0],a[1],a[2],a[3],a[4]);
  if (i % 2 === 0) checkHehun(a, b);
}

// 姓名学对抗：含复姓、单双名、边界
var names = [['王','小明'],['欧阳','娜娜'],['司马','光'],['陈','晓华'],['张','伟'],['', '三'], ['李',''], ['abcdef',''], ['龙',''], ['長','孫']];
names.forEach(function(pair){
  var r = NAME.compute(pair[0], pair[1]);
  if (r.error) return; // 缺笔画/空输入是预期
  if (!r.grids || r.grids.length !== 5) problems.push('nameology grids 异常 ' + JSON.stringify(pair));
  r.grids.forEach(function(g){
    if (!isFiniteInt(g.value) || g.value < 1) problems.push('nameology 格值异常 ' + JSON.stringify(pair) + ' ' + g.name + '=' + g.value);
    if (g.level == null || g.ji == null) problems.push('nameology 数理缺失 ' + JSON.stringify(pair) + ' ' + g.name);
  });
});

console.log('=== 对抗式探针 ===');
console.log('随机样本: ' + N + ' 组');
console.log('发现问题: ' + problems.length);
if (problems.length) {
  problems.slice(0, 40).forEach(function(p){ console.log('  ✗ ' + p); });
  if (problems.length > 40) console.log('  … 其余 ' + (problems.length - 40) + ' 条略');
  process.exit(1);
} else {
  console.log('✓ 全部样本无 NaN / undefined / 异常崩溃');
}
