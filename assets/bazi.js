/* 玄机阁 · 八字排盘 bazi.js
   纯本地：四柱（立春/节气/时辰边界）、五行、十神、大运起运。
   复用 core.js 历法内核。零外链。 */
(function (root) {
  'use strict';
  var XJ = (typeof require !== 'undefined') ? require('./core.js') : root.XJ;
  var Gan = XJ.Gan, Zhi = XJ.Zhi;

  // 集中配置：日历边界来自 config.js，避免与 core.js 重复硬编码
  var CFG = (root.XJ_CONFIG && root.XJ_CONFIG.calendar) || { minYear: 1900, maxYear: 2100 };

  var ganWx = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  var ganYin = { '甲': 0, '丙': 0, '戊': 0, '庚': 0, '壬': 0, '乙': 1, '丁': 1, '己': 1, '辛': 1, '癸': 1 }; // 0阳 1阴
  var zhiBenGan = {
    '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
    '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
  };
  var zhiYin = { '子': 0, '寅': 0, '辰': 0, '午': 0, '申': 0, '戌': 0, '丑': 1, '卯': 1, '巳': 1, '未': 1, '酉': 1, '亥': 1 };
  var wxOrder = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
  var wxByIx = ['木', '火', '土', '金', '水'];

  // 喜用五行推导（简化推演，仅供文化参考）
  // 身弱：喜 比劫(同我) + 印(生我)；身旺：喜 克我(官杀) + 我克(财) + 我生(食伤)
  function xiWuXing(meWx, strong) {
    var i = wxOrder[meWx];
    var bi = i;             // 比劫（同我）
    var yin = (i + 4) % 5;  // 印（生我）
    var shi = (i + 1) % 5;  // 我生（食伤）
    var cai = (i + 2) % 5;  // 我克（财）
    var guan = (i + 3) % 5; // 克我（官杀）
    if (strong) {
      return {
        xi: [guan, cai, shi].map(function (x) { return wxByIx[x]; }),
        ji: [bi, yin].map(function (x) { return wxByIx[x]; })
      };
    }
    return {
      xi: [bi, yin].map(function (x) { return wxByIx[x]; }),
      ji: [shi, cai, guan].map(function (x) { return wxByIx[x]; })
    };
  }

  // 60 甲子索引
  function gzIndex(ganChar, zhiChar) {
    var g = Gan.indexOf(ganChar), z = Zhi.indexOf(zhiChar);
    for (var n = 0; n < 60; n++) if (n % 10 === g && n % 12 === z) return n;
    return 0;
  }
  function idxToGz(n) { return Gan[((n % 10) + 10) % 10] + Zhi[((n % 12) + 12) % 12]; }

  // 十神：以日主（me）对他干（other）
  function tenGod(meGan, otherGan) {
    if (meGan === otherGan) return '比肩';
    var meW = ganWx[meGan], oW = ganWx[otherGan];
    var meI = ganYin[meGan], oI = ganYin[otherGan];
    var same = (meI === oI);
    var meIx = wxOrder[meW], oIx = wxOrder[oW];
    if ((oIx + 1) % 5 === meIx) return same ? '正印' : '偏印';   // 生我
    if ((meIx + 1) % 5 === oIx) return same ? '食神' : '伤官';   // 我生
    if ((meIx + 2) % 5 === oIx) return same ? '正财' : '偏财';   // 我克
    if ((oIx + 2) % 5 === meIx) return same ? '正官' : '七杀';   // 克我
    return '比肩';
  }

  // 年柱（八字以立春为界）
  function yearGZ(y, m, d) {
    var lc = XJ.getTerm(y, 2); // 立春
    var year = (Date.UTC(y, m - 1, d) < Date.UTC(y, lc.month - 1, lc.day)) ? y - 1 : y;
    return { year: year, gz: Gan[(year - 4) % 10] + Zhi[(year - 4) % 12] };
  }

  // 大运：年/月/日/时柱定后，需找距离出生最近的「节」（偶数位节气：立春/惊蛰/清明…）。
  // 取 y-1、y、y+1 三年的节，合并排序后向前/向后取最近一个，计算起运天数（三天为一岁）。
  function jieDates(y) {
    var arr = [];
    for (var yy = y - 1; yy <= y + 1; yy++) {
      for (var n = 0; n < 24; n += 2) { // 节（0=小寒? 实际 2=立春 起；这里 n 为偶数位即节）
        var t = XJ.getTerm(yy, n);
        arr.push(Date.UTC(yy, t.month - 1, t.day));
      }
    }
    arr.sort(function (a, b) { return a - b; });
    return arr;
  }

  function bazi(y, m, d, hour, gender) {
    if (!XJ.validDate(y, m, d)) {
      throw new Error('出生日期无效或超出范围（须为 ' + CFG.minYear + '–' + CFG.maxYear + ' 年间的真实公历日期）。');
    }
    hour = (hour == null || isNaN(hour) || hour < 0 || hour > 23) ? 12 : Math.floor(hour);
    var yg = yearGZ(y, m, d);
    var yGan = yg.gz.charAt(0), yZhi = yg.gz.charAt(1);
    var mgz = XJ.ganZhiMonth(y, m, d);
    var mGan = mgz.charAt(0), mZhi = mgz.charAt(1);
    var dgz = XJ.ganZhiDay(y, m, d);
    var dGan = dgz.charAt(0), dZhi = dgz.charAt(1);
    var dayGanIdx = Gan.indexOf(dGan);
    var hgz = XJ.ganZhiHour(dayGanIdx, hour);
    var hGan = hgz.charAt(0), hZhi = hgz.charAt(1);

    var me = dGan; // 日主
    // 十神（天干）
    var tg = [tenGod(me, yGan), tenGod(me, mGan), '日主', tenGod(me, hGan)];
    // 十神（地支本气）
    var dz = [tenGod(me, zhiBenGan[yZhi]), tenGod(me, zhiBenGan[mZhi]),
      tenGod(me, zhiBenGan[dZhi]), tenGod(me, zhiBenGan[hZhi])];

    // 五行统计（天干 + 地支本气）
    var wx = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    [yGan, mGan, dGan, hGan].forEach(function (g) { wx[ganWx[g]]++; });
    [yZhi, mZhi, dZhi, hZhi].forEach(function (z) { wx[ganWx[zhiBenGan[z]]]++; });
    var meWx = ganWx[me];
    var meCount = wx[meWx];

    // 大运
    var yangYear = (Gan.indexOf(yGan) % 2 === 0);
    var forward = (yangYear && gender === '男') || (!yangYear && gender === '女');
    var birthMs = Date.UTC(y, m - 1, d, hour);
    var jies = jieDates(y);
    var startDays = 0, startAge;
    if (forward) {
      for (var i = 0; i < jies.length; i++) { if (jies[i] > birthMs) { startDays = (jies[i] - birthMs) / 86400000; break; } }
    } else {
      for (var j = jies.length - 1; j >= 0; j--) { if (jies[j] < birthMs) { startDays = (birthMs - jies[j]) / 86400000; break; } }
    }
    startAge = Math.max(1, Math.round(startDays / 3)); // 三天为一岁
    var mIdx = gzIndex(mGan, mZhi);
    var daYun = [];
    for (var k = 1; k <= 8; k++) {
      var ni = forward ? mIdx + k : mIdx - k;
      var age = startAge + (k - 1) * 10;
      daYun.push({ age: age, gz: idxToGz(ni) });
    }

    // 简析（简化推演，仅供文化参考）
    var strong = meCount >= 3; // 日主得党偏多
    var xi = strong ? ['克我之官杀', '我克之财', '我生之食伤'] : ['比劫', '生我之印'];
    var xiw = xiWuXing(meWx, strong);
    var piller = {
      gan: [yGan, mGan, dGan, hGan],
      zhi: [yZhi, mZhi, dZhi, hZhi],
      tg: tg, dz: dz
    };
    return {
      yearGZ: yg.gz, monthGZ: mgz, dayGZ: dgz, hourGZ: hgz,
      me: me, meWx: meWx,
      piller: piller,
      wx: wx, meCount: meCount,
      strong: strong,
      xi: xi,
      xiWx: xiw.xi,
      jiWx: xiw.ji,
      startAge: startAge, forward: forward,
      daYun: daYun,
      // 用于显示
      text: {
        four: [yg.gz, mgz, dgz, hgz],
        wxLine: '木' + wx['木'] + ' 火' + wx['火'] + ' 土' + wx['土'] + ' 金' + wx['金'] + ' 水' + wx['水'],
        meLine: '日主' + me + '（' + meWx + '）' + (strong ? '得党偏旺' : '偏弱'),
        daYunLine: '约 ' + startAge + ' 岁起运，' + (forward ? '顺排' : '逆排')
      }
    };
  }

  var api = { bazi: bazi, tenGod: tenGod, ganWx: ganWx, zhiBenGan: zhiBenGan, xiWuXing: xiWuXing };
  root.XJ_BAZI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
