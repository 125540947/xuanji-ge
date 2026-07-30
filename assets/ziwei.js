/* 玄机阁 · 紫微斗数内核 ziwei.js
   纯本地：命宫/身宫/十二宫、五行局、紫微落宫、十四主星、年干四化、辅星。
   零外链：复用 core.js，不发生任何 fetch。
   说明：本模块为「入门教学版」排盘，依通行安星诀实现；火星铃星、天空、华盖等
        次要杂曜未纳，仅作文化/娱乐参考，不涉医疗心理咨询，不给断令。
   兼容浏览器(window.XJ_ZIWEI) 与 Node(module.exports)。 */

;(function (root) {
  'use strict';

  var XJ = root.XJ;
  if (!XJ && typeof require !== 'undefined') {
    try { XJ = require('./core.js'); } catch (e) { /* 浏览器由 core.js 先载入 */ }
  }
  if (!XJ) throw new Error('ziwei.js 依赖 core.js，请先加载 assets/core.js');
  var Gan = XJ.Gan, Zhi = XJ.Zhi;

  // —— 六十甲子纳音五行（金木水火土）——
  var NAYIN = [
    '金','金','火','火','木','木','土','土','金','金',
    '火','火','水','水','土','土','金','金','木','木',
    '水','水','土','土','火','火','木','木','水','水',
    '金','金','火','火','木','木','土','土','金','金',
    '火','火','水','水','土','土','金','金','木','木',
    '水','水','土','土','火','火','木','木','水','水'
  ];
  var nayinMap = {};
  for (var i = 0; i < 60; i++) nayinMap[Gan[i % 10] + Zhi[i % 12]] = NAYIN[i];
  var BUREAU = { '金': 4, '木': 3, '水': 2, '火': 6, '土': 5 };
  var BUREAU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };

  // 十二宫名（命宫起逆时针）
  var PALACES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移',
    '交友', '事业', '田宅', '福德', '父母'];

  // 四化（年干 0甲..9癸）：[禄, 权, 科, 忌]
  var SIHUA = [
    ['廉贞', '破军', '武曲', '太阳'], // 甲
    ['天机', '天梁', '紫微', '太阴'], // 乙
    ['天同', '天机', '文昌', '廉贞'], // 丙
    ['太阴', '天同', '天机', '巨门'], // 丁
    ['贪狼', '太阴', '右弼', '天机'], // 戊
    ['武曲', '贪狼', '天梁', '文曲'], // 己
    ['太阳', '武曲', '太阴', '天同'], // 庚
    ['巨门', '太阳', '文曲', '文昌'], // 辛
    ['天梁', '紫微', '左辅', '武曲'], // 壬
    ['破军', '巨门', '太阴', '贪狼']  // 癸
  ];

  // —— 小工具 ——
  function hourZhiIndex(hour) { return Math.floor((hour + 1) / 2) % 12; }
  function yearGanZhi(y, m, d) {
    var lc = XJ.getTerm(y, 2); // 立春
    var yn = (Date.UTC(y, m - 1, d) >= Date.UTC(y, lc.month - 1, lc.day)) ? y : y - 1;
    return { gan: (yn - 4) % 10, zhi: (yn - 4) % 12, yearNum: yn };
  }

  // 命宫地支序（寅起正月顺数至生月，再逆数生时）
  function mingGongZhi(lm, zi) {
    var mIdx = (1 + lm) % 12;
    return ((mIdx - zi) % 12 + 12) % 12;
  }
  // 身宫地支序（顺数生时）
  function shenGongZhi(lm, zi) {
    var mIdx = (1 + lm) % 12;
    return (mIdx + zi) % 12;
  }

  // 命宫干支（五虎遁：年干推命宫地支之干）
  function mingGongGan(yg, mingZhi) {
    var first = (yg * 2 + 2) % 10; // 寅月干
    var steps = (mingZhi - 2 + 12) % 12;
    return (first + steps) % 10;
  }

  // 紫微落宫地支序：生日(农历日) + 五行局数
  function ziweiZhi(day, bureau) {
    var base, palaceIdx;
    if (day % bureau === 0) {
      var q0 = day / bureau;
      base = q0;                 // 从寅(1)顺数商数
      palaceIdx = base;
    } else {
      var X = bureau - (day % bureau); // 最小正数使整除
      var q = (day + X) / bureau;
      base = q;                  // 从寅(1)顺数商数
      palaceIdx = (X % 2 === 1) ? (base - X) : (base + X); // 奇逆偶顺
    }
    palaceIdx = ((palaceIdx - 1) % 12 + 12) % 12 + 1; // 归一 1..12（寅=1）
    return (palaceIdx + 1) % 12; // 转地支序（寅=2）
  }

  // 天府地支序（紫微 z 推天府 t：t = (4 - z) mod 12）
  function tianfuZhi(z) { return ((4 - z) % 12 + 12) % 12; }

  // 十四主星定位，返回 {星名: 地支序}
  function place14(ziwei) {
    var z = ziwei, tf = tianfuZhi(z);
    var s = {};
    // 紫微星系（逆时针，减去）
    s['紫微'] = z;
    s['天机'] = (z - 1 + 12) % 12;
    s['太阳'] = (z - 3 + 12) % 12;
    s['武曲'] = (z - 4 + 12) % 12;
    s['天同'] = (z - 5 + 12) % 12;
    s['廉贞'] = (z - 8 + 12) % 12;
    // 天府星系（顺时针，加）
    s['天府'] = tf;
    s['太阴'] = (tf + 1) % 12;
    s['贪狼'] = (tf + 2) % 12;
    s['巨门'] = (tf + 3) % 12;
    s['天相'] = (tf + 4) % 12;
    s['天梁'] = (tf + 5) % 12;
    s['七杀'] = (tf + 6) % 12;
    s['破军'] = (tf + 10) % 12;
    return s;
  }

  // 辅星定位（口诀：辰上顺正寻左辅，戌上逆正右弼当；戌上逆时觅文昌，辰上顺时文曲位）
  function placeAux(yg, yz, lm, zi) {
    var a = {};
    // 左辅右弼（生月：辰(4)起正月顺 / 戌(10)起正月逆）
    a['左辅'] = (4 + (lm - 1)) % 12;
    a['右弼'] = ((10 - (lm - 1)) % 12 + 12) % 12;
    // 文昌文曲（生时：戌(10)起子时逆 / 辰(4)起子时顺）
    a['文昌'] = ((10 - zi) % 12 + 12) % 12;
    a['文曲'] = (4 + zi) % 12;
    // 地空地劫（生时：亥(11)起子时逆 / 亥起子时顺）
    a['地空'] = ((11 - zi) % 12 + 12) % 12;
    a['地劫'] = (11 + zi) % 12;
    // 天魁天钺（年干口诀：甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎）
    var kuiYue = {
      0: [1, 7], 4: [1, 7], 6: [1, 7],   // 甲戊庚 → 丑未
      1: [0, 8], 5: [0, 8],              // 乙己 → 子申
      2: [11, 9], 3: [11, 9],            // 丙丁 → 亥酉
      7: [6, 2],                         // 辛 → 午寅
      8: [3, 5], 9: [3, 5]               // 壬癸 → 卯巳
    }[yg]; // [魁, 钺]
    a['天魁'] = kuiYue[0]; a['天钺'] = kuiYue[1];
    // 禄存（年干：甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子）
    var lu = { 0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 }[yg];
    a['禄存'] = lu;
    a['擎羊'] = (lu + 1) % 12;
    a['陀罗'] = (lu + 11) % 12;
    // 天马（年支三合：申子辰在寅 / 寅午戌在申 / 巳酉丑在亥 / 亥卯未在巳）
    var ma = { 2: 8, 6: 8, 10: 8, 8: 2, 0: 2, 4: 2, 5: 11, 9: 11, 1: 11, 11: 5, 3: 5, 7: 5 }[yz];
    a['天马'] = ma;
    // 红鸾天喜（年支：卯(3)起子年逆数；天喜为红鸾对宫）
    var hong = ((3 - yz) % 12 + 12) % 12;
    a['红鸾'] = hong;
    a['天喜'] = (hong + 6) % 12;
    return a;
  }

  // 主入口
  function compute(params) {
    var y = +params.year, m = +params.month, d = +params.day, hour = +params.hour;
    if (isNaN(hour) || hour < 0 || hour > 23) hour = 12;
    var gender = params.gender === '女' ? '女' : '男';
    var lun = XJ.solarToLunar(y, m, d);
    var lm = lun.lMonth, ld = lun.lDay;
    var zi = hourZhiIndex(hour);
    var yz0 = yearGanZhi(y, m, d);
    var yg = yz0.gan, yz = yz0.zhi;
    var gzYear = Gan[yg] + Zhi[yz];

    // 四柱
    var gzDay = XJ.ganZhiDay(y, m, d);
    var gzMonth = XJ.ganZhiMonth(y, m, d);
    var dayGan = Gan.indexOf(gzDay.charAt(0));
    var gzHour = XJ.ganZhiHour(dayGan, hour);

    // 命身宫
    var mZ = mingGongZhi(lm, zi);
    var sZ = shenGongZhi(lm, zi);
    var mGan = mingGongGan(yg, mZ);
    var mingGZ = Gan[mGan] + Zhi[mZ];
    var shenGZ = Gan[mingGongGan(yg, sZ)] + Zhi[sZ];

    // 五行局
    var bu = BUREAU[nayinMap[mingGZ]];

    // 紫微 + 主星 + 辅星
    var zv = ziweiZhi(ld, bu);
    var stars14 = place14(zv);
    var aux = placeAux(yg, yz, lm, zi);
    var stars = {};
    Object.keys(stars14).forEach(function (k) { stars[k] = { zhi: stars14[k], main: true }; });
    Object.keys(aux).forEach(function (k) { stars[k] = { zhi: aux[k], main: false }; });

    // 四化
    var hua = SIHUA[yg];
    var four = { '化禄': hua[0], '化权': hua[1], '化科': hua[2], '化忌': hua[3] };

    // 宫名查表：地支序 -> 宫名（命宫起逆时针）
    function palaceNameOf(zhiIdx) {
      var idx = ((mZ - zhiIdx) % 12 + 12) % 12;
      return PALACES[idx];
    }

    // 组装十二宫（从命宫起逆时针）
    var palaces = [];
    for (var p = 0; p < 12; p++) {
      var pz = ((mZ - p) % 12 + 12) % 12; // 该宫地支序
      var inStars = [], inFour = [];
      Object.keys(stars).forEach(function (k) {
        if (stars[k].zhi === pz) inStars.push(k);
      });
      ['化禄', '化权', '化科', '化忌'].forEach(function (h) {
        if (stars[four[h]] && stars[four[h]].zhi === pz) inFour.push(h + '·' + four[h]);
      });
      palaces.push({
        name: PALACES[p], zhi: Zhi[pz], zhiIdx: pz,
        stars: inStars, four: inFour
      });
    }

    // 大限（起限=局数岁；阳男阴女顺，阴男阳女逆）
    var yang = (yg % 2 === 0);
    var forward = (yang && gender === '男') || (!yang && gender === '女');
    var daXian = [];
    var cur = mZ;
    for (var k2 = 0; k2 < 12; k2++) {
      daXian.push({
        age: bu + k2 * 10, zhi: Zhi[cur],
        range: (bu + k2 * 10) + '–' + (bu + k2 * 10 + 9) + '岁',
        palace: palaceNameOf(cur)
      });
      cur = forward ? (cur + 1) % 12 : (cur + 11) % 12;
    }

    return {
      input: { year: y, month: m, day: d, hour: hour, gender: gender },
      lunar: { lYear: lun.lYear, lMonth: lm, lDay: ld, lMonthCn: lun.lMonthCn, lDayCn: lun.lDayCn, isLeap: lun.isLeap },
      gzYear: gzYear, gzMonth: gzMonth, gzDay: gzDay, gzHour: gzHour,
      mingGong: { zhi: Zhi[mZ], gan: Gan[mGan], gz: mingGZ, palaceName: '命宫' },
      shenGong: { zhi: Zhi[sZ], gz: shenGZ, palaceName: '身宫' },
      bureau: { num: bu, name: BUREAU_NAME[bu] },
      ziweiZhi: Zhi[zv],
      stars: stars,
      four: four,
      palaces: palaces,
      daXian: daXian,
      summary: '星盘既成，命宫在' + Zhi[mZ] + '（' + mingGZ + '），五行属' + BUREAU_NAME[bu] +
        '，紫微落' + Zhi[zv] + '宫。十四主星列于十二宫，四化随' + gzYear + '年干飞布。' +
        '此乃入门排盘，星曜之性、宫位之变，须虚心体悟，不可执一而论。'
    };
  }

  var api = { compute: compute, PALACES: PALACES, ziweiZhi: ziweiZhi, place14: place14 };
  root.XJ_ZIWEI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
