/* 玄机阁 · 回归自测（Node 本地运行，不入站点）
   覆盖本轮修复项：外格公式 / 81折回 / 辅星安星 / 边界守卫 / NaN 防护 */
'use strict';
var path = require('path');
require(path.join(__dirname, 'config.js')); // 先于引擎载入，使 core/bazi 读到集中配置
require(path.join(__dirname, 'kangxi-strokes.js'));
require(path.join(__dirname, 'kangxi-alt.js'));
var NM = require(path.join(__dirname, 'nameology.js'));
var XJ = require(path.join(__dirname, 'core.js'));
var BAZI = require(path.join(__dirname, 'bazi.js'));
var ZW = require(path.join(__dirname, 'ziwei.js'));
var HH = require(path.join(__dirname, 'hehun.js'));
var QIAN = require(path.join(__dirname, 'qian.js'));

var pass = 0, fail = 0;
function eq(name, got, want) {
  var ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; } else { fail++; console.log('FAIL ' + name + ' got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want)); }
}
function truthy(name, v) { if (v) pass++; else { fail++; console.log('FAIL ' + name); } }

function grid(r, n) { var g = null; r.grids.forEach(function (x) { if (x.name === n) g = x; }); return g.value; }

// —— 姓名学：外格四则 ——
var r1 = NM.compute('张', '伟'); // 单姓单名：外格=2
eq('外格·单姓单名(张伟)', grid(r1, '外格'), 2);
var r2 = NM.compute('王', '小明'); // 单姓双名：外格=名末+1=8+1=9
eq('外格·单姓双名(王小明)', grid(r2, '外格'), 9);
var r3 = NM.compute('欧阳', '娜'); // 复姓单名：外格=姓首+1=15+1=16
eq('外格·复姓单名(欧阳娜)', grid(r3, '外格'), 16);
var r4 = NM.compute('欧阳', '娜娜'); // 复姓双名：外格=姓首+名末=15+10=25
eq('外格·复姓双名(欧阳娜娜)', grid(r4, '外格'), 25);

// —— 姓名学：81 数理折回 ——
eq('数理81不折', NM.numberFate(81).level, 1);
eq('数理82→2', NM.numberFate(82).text, NM.numberFate(2).text);
eq('数理161→81', NM.numberFate(161).text, NM.numberFate(81).text);
eq('数理0防护', NM.numberFate(0).label, '半吉');
eq('数理NaN防护', NM.numberFate(NaN).label, '半吉');

// —— 姓名学：输入守卫 ——
truthy('姓氏三字报错', NM.compute('爱新觉', '罗').error);
truthy('名字三字报错', NM.compute('王', '一二三').error);
truthy('空输入报错', NM.compute('', '').error);

// —— 姓名学：综合论断 summary ——
var rs = NM.compute('王', '小明');
eq('summary键集', Object.keys(rs.summary).sort(), ['bad', 'good', 'mid', 'verdict']);
truthy('五格计数之和=5', rs.summary.good + rs.summary.mid + rs.summary.bad === 5);
truthy('王小明吉格≥凶格', rs.summary.good >= rs.summary.bad);
truthy('summary.verdict为字符串', typeof rs.summary.verdict === 'string' && rs.summary.verdict.length > 0);
var ro = NM.compute('欧阳', '娜娜');
truthy('复姓欧阳娜娜计数和=5', ro.summary.good + ro.summary.mid + ro.summary.bad === 5);
truthy('复姓summary结构完整', typeof ro.summary.good === 'number' && typeof ro.summary.verdict === 'string');

// —— 紫微：辅星安星口诀 ——
// place14/placeAux 非导出全量，经 compute 验证；地支序：子0丑1寅2卯3辰4巳5午6未7申8酉9戌10亥11
// 用 1990-06-15 12时 男（庚午年）验证年干庚：魁丑1、钺未7；禄存在申8
var zr = ZW.compute({ year: 1990, month: 6, day: 15, hour: 12, gender: '男' });
eq('庚年天魁在丑', zr.stars['天魁'].zhi, 1);
eq('庚年天钺在未', zr.stars['天钺'].zhi, 7);
eq('庚年禄存在申', zr.stars['禄存'].zhi, 8);
eq('庚年擎羊在酉', zr.stars['擎羊'].zhi, 9);
eq('庚年陀罗在未', zr.stars['陀罗'].zhi, 7);
// 农历五月（lm=5）：左辅=辰起顺数至五月=申8；右弼=戌起逆数至五月=午6
eq('五月左辅在申', zr.stars['左辅'].zhi, (4 + (zr.lunar.lMonth - 1)) % 12);
// 午时（zi=6）：文昌=戌逆数6=辰4；文曲=辰顺数6=戌10
eq('午时文昌在辰', zr.stars['文昌'].zhi, 4);
eq('午时文曲在戌', zr.stars['文曲'].zhi, 10);
// 午年（yz=6）红鸾=卯起逆数6=酉9；天喜对宫=卯3
eq('午年红鸾在酉', zr.stars['红鸾'].zhi, 9);
eq('午年天喜在卯', zr.stars['天喜'].zhi, 3);
// 癸年（1993）魁卯3钺巳5；禄存在子0
var zr2 = ZW.compute({ year: 1993, month: 6, day: 15, hour: 12, gender: '女' });
eq('癸年天魁在卯', zr2.stars['天魁'].zhi, 3);
eq('癸年天钺在巳', zr2.stars['天钺'].zhi, 5);
eq('癸年禄存在子', zr2.stars['禄存'].zhi, 0);

// —— core：范围守卫 ——
var threw = false;
try { XJ.solarToLunar(1899, 6, 1); } catch (e) { threw = true; }
truthy('1899年抛出明确错误', threw);
threw = false;
try { XJ.solarToLunar(1900, 1, 15); } catch (e) { threw = true; }
truthy('1900年正月初一前抛错', threw);
truthy('2100-12-31可算', XJ.solarToLunar(2100, 12, 31).lYear >= 2100 - 1);
// 已知锚点：2026-07-30
var h = XJ.huangli(2026, 7, 30);
truthy('2026-07-30干支日非空', /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(h.gzDay));

// —— 八字：hour 越界与 NaN ——
var b0 = BAZI.bazi(1990, 6, 15, 12, '男');
var b1 = BAZI.bazi(1990, 6, 15, NaN, '男');
truthy('八字hour=NaN兜底12', b1.hourGZ === b0.hourGZ);
var b2 = BAZI.bazi(1990, 6, 15, 99, '女');
truthy('八字hour=99兜底12', b2.hourGZ === b0.hourGZ);
truthy('起运岁为有限数', isFinite(b2.startAge) && b2.startAge >= 1);

// —— 日期真实存在性校验（边界覆盖核心）——
truthy('合法闰年2/29通过', XJ.validDate(2024, 2, 29) === true);
truthy('非法2/30拒绝', XJ.validDate(2024, 2, 30) === false);
truthy('平年2/29拒绝', XJ.validDate(2023, 2, 29) === false);
truthy('13月拒绝', XJ.validDate(2000, 13, 1) === false);
truthy('越界年拒绝', XJ.validDate(1800, 1, 1) === false);
truthy('越界日31/4拒绝', XJ.validDate(2000, 4, 31) === false);
// 农历历元下限（1900-01-31）统一闸门：早于该日的日期 solarToLunar 无法演算，validDate 须一并拒绝
truthy('历元前1900-01-08拒绝', XJ.validDate(1900, 1, 8) === false);
truthy('历元前1900-01-30拒绝', XJ.validDate(1900, 1, 30) === false);
truthy('历元当日1900-01-31通过', XJ.validDate(1900, 1, 31) === true);
threw = false; try { ZW.compute({ year: 1900, month: 1, day: 8, hour: 12, gender: '男' }); } catch (e) { threw = true; }
truthy('紫微·历元前日期抛错(闸门一致)', threw);

// 八字：非法日期须明确抛错（而非静默错盘）
threw = false; try { BAZI.bazi(2024, 2, 30, 12, '男'); } catch (e) { threw = true; }
truthy('八字·2/30抛错', threw);
threw = false; try { BAZI.bazi(1899, 1, 1, 12, '男'); } catch (e) { threw = true; }
truthy('八字·1800年抛错', threw);
truthy('八字·合法日可算', (function(){ try { return !!BAZI.bazi(2000,2,29,12,'男').yearGZ; } catch(e){ return false; } })());

// 紫微：非法日期经 solarToLunar 抛错
threw = false; try { ZW.compute({ year: 2024, month: 2, day: 30, hour: 12, gender: '男' }); } catch (e) { threw = true; }
truthy('紫微·2/30抛错', threw);

// 合婚：任一造非法日期抛错
threw = false; try { HH.hehun({ year: 2024, month: 2, day: 30, hour: 12, gender: '男' },
                              { year: 1992, month: 3, day: 8, hour: 8, gender: '女' }); } catch (e) { threw = true; }
truthy('合婚·非法日期抛错', threw);

// 黄历：非法日期抛错
threw = false; try { XJ.huangli(2024, 2, 30); } catch (e) { threw = true; }
truthy('黄历·2/30抛错', threw);

// —— 合婚：跑通 + 总分有限 ——
var hh = HH.hehun({ year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
                  { year: 1992, month: 3, day: 8, hour: 8, gender: '女' });
truthy('合婚五维齐全', hh.dims.length === 5);
truthy('合婚总分有限', isFinite(hh.total));

// —— 灵签：seed 负数不越界 ——
truthy('灵签负seed', QIAN.draw(-3) && QIAN.draw(-3).no >= 1);
truthy('灵签大seed', QIAN.draw(1e9).no >= 1 && QIAN.draw(1e9).no <= QIAN.count);

// —— 配置模块 config.js ——
var CFG = require(path.join(__dirname, 'config.js'));
eq('配置·年份下限', CFG.calendar.minYear, 1900);
eq('配置·年份上限', CFG.calendar.maxYear, 2100);
truthy('配置·版本号字符串', typeof CFG.site.version === 'string' && CFG.site.version.length > 0);
truthy('配置·启用日志', CFG.enableLogger === true);
truthy('配置·可被读取', !!(CFG && CFG.calendar && CFG.logRingSize > 0));

// —— 日志模块 logger.js（Node 环境：仅内存记录，不渲染、不联网）——
var LOG = require(path.join(__dirname, 'logger.js'));
truthy('日志·install在Node返回false(幂等)', LOG.install() === false);
LOG.clear();
LOG.error('单元测试错误');
truthy('日志·error入缓冲', LOG.getBuffer().length === 1 && LOG.getBuffer()[0].msg === '单元测试错误');
LOG.warn('w'); LOG.info('i');
truthy('日志·级别正确', LOG.getBuffer()[1].level === 'warn' && LOG.getBuffer()[2].level === 'info');
LOG.clear();
for (var i = 0; i < 60; i++) LOG.info('x' + i);
truthy('日志·环形缓冲截断至容量', LOG.getBuffer().length === CFG.logRingSize);

// —— core：节气缓存键存在性（性能优化点）——
truthy('节气·全年24项', XJ.allTerms(2026).length === 24);
truthy('节气·首项目录小寒', XJ.allTerms(2026)[0].name === '小寒');
truthy('节气·末项冬至', XJ.allTerms(2026)[23].name === '冬至');

// —— bazi 错误消息含配置边界（而非硬编码魔法数）——
threw = false; var msg = '';
try { BAZI.bazi(1800, 1, 1, 12, '男'); } catch (e) { threw = true; msg = e.message; }
truthy('八字·越界错含下限1900', threw && msg.indexOf('1900') >= 0);

// —— 姓名学：康熙笔画异说层（陳15/16两说）——
var rc = NM.compute('陈', '晓华');
truthy('异说·提示陳/陈含15画一说', rc.alts.some(function (a) { return (a.ch === '陳' || a.ch === '陈') && a.alts.indexOf(15) >= 0; }));
truthy('异说·主值仍为16不破坏默认', rc.grids[0].value === 17); // 单姓陈=16+1=17 天格
var rcAlt = NM.compute('陈', '晓华', { altOverride: { '陈': 15 } });
truthy('异说·按15画重算天格变16', rcAlt.grids[0].value === 16);
truthy('异说·usedAlt记录覆盖', rcAlt.usedAlt['陈'] === 15);
truthy('异说·无异常字不报提示', NM.compute('王', '小明').alts.length === 0);

// —— 八字喜用五行 + 姓名联动 ——
var bzx = BAZI.bazi(1990, 6, 15, 12, '男');
truthy('八字·喜用五行为非空数组', Array.isArray(bzx.xiWx) && bzx.xiWx.length > 0);
truthy('八字·忌神五行为非空数组', Array.isArray(bzx.jiWx) && bzx.jiWx.length > 0);
truthy('八字·喜用忌神互不相交', bzx.xiWx.every(function (w) { return bzx.jiWx.indexOf(w) < 0; }));
var nr = NM.compute('王', '小明');
var ndist = NM.wuxingDist(nr);
truthy('姓名五行分布五格之和=5', ndist.total === 5);
var adv = NM.nameBaziAdvice(nr, bzx);
truthy('联动·advice为字符串', typeof adv.advice === 'string' && adv.advice.length > 0);
truthy('联动·返回xiCount数值', typeof adv.xiCount === 'number' && typeof adv.jiCount === 'number');

console.log('\n=== 回归自测 ===');
console.log('通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
