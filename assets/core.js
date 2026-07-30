/* 玄机阁 · 历法内核 core.js
   纯本地：农历 / 干支 / 节气 / 生肖 / 建除 / 宜忌 / 冲煞
   零外链：所有数据内置，不发生任何 fetch。
   兼容浏览器(window.XJ) 与 Node(module.exports)。 */

;(function (root) {
  'use strict';

  // 集中配置：config.js 须先于本文件载入。日历边界来源于配置，避免硬编码魔法数。
  // 注意：lunarInfo 数据表固定以 1900 为基准年（见下方编码说明），故实际可算范围受数据表覆盖约束。
  var CFG = (root.XJ_CONFIG && root.XJ_CONFIG.calendar) || { minYear: 1900, maxYear: 2100 };
  var MIN_YEAR = CFG.minYear, MAX_YEAR = CFG.maxYear;
  // 农历历元：lunarInfo 数据表以 1900-01-31（农历1900正月初一）为基准。
  // 全站可算下限即此日，validDate 与 solarToLunar 共用同一常量，避免闸门与数据范围错位。
  var LUNAR_EPOCH = Date.UTC(1900, 0, 31);

  // 节气按年缓存：huangli / monthZhiIndex 会反复调用 allTerms(y)，缓存避免重复创建 24 个 Date 对象（性能优化）
  var _termCache = {};
  function allTermsCached(y) {
    if (!_termCache[y]) _termCache[y] = allTerms(y);
    return _termCache[y];
  }

  var Gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var Zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var Animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  // 1900–2100 农历数据表。
  // 编码规则（lunarInfo[y-1900]，32 位整数按位表示当年农历信息）：
  //   bit0..3   闰月月份（0 表示当年无闰月）
  //   bit4..15  12 个农历月的大小月（从正月起，bit4 对应正月；1=大月30天，0=小月29天）
  //   bit16     闰月是否为大月（1=30天，0=29天）
  // 另有 baseDate=1900-01-31 对应农历1900正月初一，用于公历偏移换算。
  var lunarInfo = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15173, 0x052b0, 0x0a9a8,
    0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950,
    0x05b57, 0x056a0, 0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540,
    0x0b5a0, 0x195a6, 0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46,
    0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60,
    0x096d5, 0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0,
    0x092d0, 0x0cab5, 0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15173,
    0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260,
    0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250,
    0x0d558, 0x0b540
  ];

  // 24 节气（寿星天文历近似公式，误差通常 ±1 日，文化用途足够）
  var termList = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551,
    218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210,
    440795, 462224, 483532, 504758];
  var termNames = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满',
    '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
    '立冬', '小雪', '大雪', '冬至'];

  // —— 农历基础 ——
  function leapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
  function leapDays(y) { return leapMonth(y) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0; }
  function monthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
  function yearDays(y) {
    var sum = 348, i;
    for (i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
    return sum + leapDays(y);
  }

  function cnMonth(m) {
    var names = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
    return names[m - 1] + '月';
  }
  function cnDay(d) {
    var s = ['日', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (d === 10) return '初十';
    if (d === 20) return '二十';
    if (d === 30) return '三十';
    var tens = ['', '初', '十', '廿', '三'][Math.floor(d / 10)];
    return tens + s[d % 10];
  }

  // 真实公历日期校验：范围（受 lunarInfo 覆盖约束）+ 当月真实存在日（拒绝 2/30、13月等）
  // 下限统一为农历历元 1900-01-31：早于该日的日期 solarToLunar 无法演算，故一并拒绝，确保闸门与数据范围一致。
  function isRealDate(y, m, d) {
    y = +y; m = +m; d = +d;
    if (!(y >= MIN_YEAR && y <= MAX_YEAR && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
    var dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
    if (Date.UTC(y, m - 1, d) < LUNAR_EPOCH) return false; // 早于农历历元不可算
    return true;
  }
  function validDate(y, m, d) { return isRealDate(y, m, d); }

  // 公历 → 农历
  function solarToLunar(y, m, d) {
    if (!validDate(y, m, d)) {
      throw new Error('日期无效或超出支持范围（须为 1900–2100 年间的真实公历日期）。');
    }
    var baseDate = LUNAR_EPOCH; // 1900-01-31 = 农历1900正月初一
    var offset = Math.round((Date.UTC(y, m - 1, d) - baseDate) / 86400000);
    if (offset < 0) {
      // 防御性兜底：理论上 validDate 已挡掉，此处保留以避免任何绕过闸门的调用崩算
      throw new Error('日期早于 1900 年正月初一（1900-01-31），无法演算');
    }
    var temp = 0, lunarYear = 1900, lunarMonth, isLeap = false;
    for (lunarYear = 1900; lunarYear < (MAX_YEAR + 1) && offset > 0; lunarYear++) {
      temp = yearDays(lunarYear);
      offset -= temp;
    }
    if (offset < 0) { offset += temp; lunarYear--; }
    var ly = lunarYear;
    var leap = leapMonth(ly);
    for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
      if (leap > 0 && lunarMonth === (leap + 1) && !isLeap) {
        --lunarMonth; isLeap = true; temp = leapDays(ly);
      } else {
        temp = monthDays(ly, lunarMonth);
      }
      if (isLeap && lunarMonth === (leap + 1)) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; --lunarMonth; }
    }
    if (offset < 0) { offset += temp; --lunarMonth; }
    var ld = offset + 1;

    var gzYear = Gan[(ly - 4) % 10] + Zhi[(ly - 4) % 12];
    var animal = Animals[(ly - 4) % 12];
    return {
      lYear: ly, lMonth: lunarMonth, lDay: ld, isLeap: isLeap,
      lMonthCn: (isLeap ? '闰' : '') + cnMonth(lunarMonth),
      lDayCn: cnDay(ld),
      gzYear: gzYear, animal: animal
    };
  }

  // 日干支（solarlunar 经典公式，连续日计数对齐）
  function ganZhiDay(y, m, d) {
    var dayCyclical = Math.floor(Date.UTC(y, m - 1, d + 1) / 86400000) + 25567 + 10;
    return Gan[dayCyclical % 10] + Zhi[dayCyclical % 12];
  }

  // 节气：返回第 n 个节气（0..23）在公历 y 年的 {month,day}
  function getTerm(y, n) {
    var offDate = new Date((31556925974.7 * (y - 1900) + termList[n] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
    return { month: Math.floor(n / 2) + 1, day: offDate.getUTCDate(), name: termNames[n] };
  }
  // 返回指定年份所有节气日期数组（索引 0..23）
  function allTerms(y) {
    var arr = [];
    for (var n = 0; n < 24; n++) {
      var t = getTerm(y, n);
      arr.push({ n: n, name: termNames[n], y: y, m: t.month, d: t.day, ms: Date.UTC(y, t.month - 1, t.day) });
    }
    return arr;
  }

  // 月支（节气月，寅为正）：返回 Zhi 下标 0..11
  function monthZhiIndex(y, m, d) {
    var terms = allTermsCached(y);
    var ms = Date.UTC(y, m - 1, d);
    var lastT = -1;
    for (var i = 0; i < terms.length; i++) {
      if (terms[i].ms <= ms) lastT = i;
      else break;
    }
    if (lastT < 0) lastT = 23; // 早于当年小寒 → 上一年冬至后，属子月
    return (1 + Math.floor(lastT / 2)) % 12;
  }

  // 月干（五虎遁）：由年干推寅月天干，再顺推
  function ganZhiMonth(y, m, d) {
    // 月柱年干以立春为界（农历年与干支年仅在春节~立春间差一年，统一用立春判定）
    var lc = getTerm(y, 2); // 立春
    var gzYearNum = (Date.UTC(y, m - 1, d) >= Date.UTC(y, lc.month - 1, lc.day)) ? y : y - 1;
    var yearGan = (gzYearNum - 4) % 10; // 0..9
    var mZhi = monthZhiIndex(y, m, d);
    var firstGan = (yearGan * 2 + 2) % 10; // 寅月天干（五虎遁：甲己丙作首）
    var gan = (firstGan + ((mZhi - 2 + 12) % 12)) % 10;
    return Gan[gan] + Zhi[mZhi];
  }

  // 时辰干支
  function ganZhiHour(dayGanIndex, hour) {
    var zhi = (Math.floor((hour + 1) / 2)) % 12;
    var firstGan = (dayGanIndex * 2) % 10; // 子时天干（五鼠遁：甲己还甲子）
    var gan = (firstGan + zhi) % 10;
    return Gan[gan] + Zhi[zhi];
  }

  // 生肖年（春节边界，用于黄历显示）
  function animalOf(y, m, d) {
    var ly = solarToLunar(y, m, d);
    return ly.animal;
  }

  // 建除十二神
  var jianChu = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];
  function jianChuOf(y, m, d) {
    var dayZhi = Zhi.indexOf(ganZhiDay(y, m, d).charAt(1));
    var mZhi = monthZhiIndex(y, m, d);
    return jianChu[(dayZhi - mZhi + 12) % 12];
  }

  // 宜忌（建除派基础表，文化用途）
  var yiJi = {
    '建': { yi: ['出行', '祈福', '动土', '求嗣'], ji: ['安葬', '开仓', '造船'] },
    '除': { yi: ['祭祀', '解除', '疗病', '扫舍'], ji: ['嫁娶', '出行', '移徙'] },
    '满': { yi: ['嫁娶', '开市', '交易', '立券'], ji: ['动土', '安葬', '修造'] },
    '平': { yi: ['修造', '嫁娶', '安葬', '出行'], ji: ['祈福', '词讼'] },
    '定': { yi: ['嫁娶', '纳采', '祭祀', '安床'], ji: ['词讼', '出行', '医疗'] },
    '执': { yi: ['捕捉', '修造', '纳财'], ji: ['开市', '移徙', '入宅'] },
    '破': { yi: ['破屋', '坏垣', '求医'], ji: ['嫁娶', '出行', '签约', '动土'] },
    '危': { yi: ['安床', '祭祀', '祈福'], ji: ['登高', '出行', '嫁娶'] },
    '成': { yi: ['嫁娶', '开市', '入学', '出行', '动土'], ji: ['词讼', '安葬'] },
    '收': { yi: ['嫁娶', '纳财', '入学', '收藏'], ji: ['放债', '出行', '安葬'] },
    '开': { yi: ['嫁娶', '开市', '求财', '出行', '动土'], ji: ['安葬', '修坟'] },
    '闭': { yi: ['安葬', '纳财', '筑堤'], ji: ['开市', '出行', '手术'] }
  };

  // 冲煞
  function chongSha(y, m, d) {
    var dayZhi = ganZhiDay(y, m, d).charAt(1);
    var map = { '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
      '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳' };
    var sha = { '子': '南', '午': '南', '丑': '东', '未': '东', '寅': '北', '申': '北',
      '卯': '西', '酉': '西', '辰': '南', '戌': '南', '巳': '东', '亥': '东' };
    var chong = map[dayZhi];
    var shaFang = sha[dayZhi];
    return { chong: chong, sha: shaFang, text: '冲' + chong + '煞' + shaFang };
  }

  // 综合：某日黄历
  function huangli(y, m, d) {
    var lun = solarToLunar(y, m, d);
    var gzD = ganZhiDay(y, m, d);
    var gzM = ganZhiMonth(y, m, d);
    var jc = jianChuOf(y, m, d);
    var cs = chongSha(y, m, d);
    // 当日是否为节气
    var terms = allTermsCached(y);
    var ms = Date.UTC(y, m - 1, d);
    var termName = null;
    for (var i = 0; i < terms.length; i++) {
      if (terms[i].ms === ms) { termName = terms[i].name; break; }
    }
    var yj = yiJi[jc] || { yi: [], ji: [] };
    var week = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
    return {
      solar: y + '年' + m + '月' + d + '日',
      solarRaw: { y: y, m: m, d: d },
      week: '星期' + week,
      lunar: (lun.isLeap ? '闰' : '') + cnMonth(lun.lMonth) + cnDay(lun.lDay),
      lYear: lun.lYear, gzYear: lun.gzYear, animal: lun.animal,
      gzMonth: gzM, gzDay: gzD,
      jianChu: jc,
      yi: yj.yi, ji: yj.ji,
      chong: cs.chong, sha: cs.sha, chongSha: cs.text,
      term: termName,
      dayZhi: gzD.charAt(1)
    };
  }

  // 纳音五行（60 甲子纳音表，每对共用一行；取五行首字）
  var NA_YIN = [
    '金', '金', '火', '火', '木', '木', '土', '土', '金', '金',
    '火', '火', '水', '水', '土', '土', '金', '金', '木', '木',
    '水', '水', '土', '土', '火', '火', '木', '木', '水', '水',
    '金', '金', '火', '火', '木', '木', '土', '土', '金', '金',
    '火', '火', '水', '水', '土', '土', '金', '金', '木', '木',
    '水', '水', '土', '土', '火', '火', '木', '木', '水', '水'
  ];
  function naYin(gz) {
    var g = Gan.indexOf(gz.charAt(0)), z = Zhi.indexOf(gz.charAt(1));
    for (var n = 0; n < 60; n++) if (n % 10 === g && n % 12 === z) return NA_YIN[n];
    return '';
  }

  function getTodayLunar() {
    var n = new Date();
    var h = huangli(n.getFullYear(), n.getMonth() + 1, n.getDate());
    return {
      solar: h.solar, lunar: h.lunar, gzDay: h.gzDay, gzMonth: h.gzMonth,
      gzYear: h.gzYear, animal: h.animal, week: h.week, jianChu: h.jianChu,
      yi: h.yi, ji: h.ji, chongSha: h.chongSha, term: h.term
    };
  }

  var api = {
    Gan: Gan, Zhi: Zhi, Animals: Animals,
    solarToLunar: solarToLunar, ganZhiDay: ganZhiDay, ganZhiMonth: ganZhiMonth,
    ganZhiHour: ganZhiHour, monthZhiIndex: monthZhiIndex, getTerm: getTerm, allTerms: allTerms,
    naYin: naYin,
    jianChuOf: jianChuOf, jianChu: jianChu, yiJi: yiJi, chongSha: chongSha,
    huangli: huangli, getTodayLunar: getTodayLunar,
    cnMonth: cnMonth, cnDay: cnDay, leapMonth: leapMonth,
    validDate: validDate, isRealDate: isRealDate
  };

  root.XJ = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
