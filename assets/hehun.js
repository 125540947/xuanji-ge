/* 玄机阁 · 合婚 hehun.js
   纯本地：生肖冲合 / 纳音相参 / 日柱夫妻宫 / 五行互补 / 十神情缘。
   复用 core.js（历法·纳音）与 bazi.js（八字四柱）。零外链。
   定位：合参之「象」，非论断之「令」。仅供文化参详。 */
(function (root) {
  'use strict';
  var XJ = (typeof require !== 'undefined') ? require('./core.js') : root.XJ;
  var BAZI = (typeof require !== 'undefined') ? require('./bazi.js') : root.XJ_BAZI;
  if (!XJ || !BAZI) throw new Error('hehun.js 依赖 core.js 与 bazi.js，请先加载');
  var Gan = XJ.Gan, Zhi = XJ.Zhi;

  var WX = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
  function sheng(a, b) { return (WX[a] + 1) % 5 === WX[b]; } // a 生 b
  function ke(a, b) { return (WX[a] + 2) % 5 === WX[b]; }    // a 克 b

  // —— 生肖（年支）关系表 ——
  var LIU_HE = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
  var SAN_HE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
  var LIU_CHONG = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
  var LIU_HAI = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
  var XING = [['子', '卯'], ['寅', '巳'], ['巳', '申'], ['寅', '申'], ['丑', '戌'], ['戌', '未'], ['丑', '未']];
  var ZI_XING = ['辰', '午', '酉', '亥'];

  function pairRelation(z1, z2) {
    var rel = [];
    if (LIU_HE.some(function (p) { return (p[0] === z1 && p[1] === z2) || (p[0] === z2 && p[1] === z1); })) rel.push('六合');
    if (SAN_HE.some(function (p) { return p.indexOf(z1) >= 0 && p.indexOf(z2) >= 0; })) rel.push('三合');
    if (LIU_CHONG.some(function (p) { return (p[0] === z1 && p[1] === z2) || (p[0] === z2 && p[1] === z1); })) rel.push('六冲');
    if (LIU_HAI.some(function (p) { return (p[0] === z1 && p[1] === z2) || (p[0] === z2 && p[1] === z1); })) rel.push('六害');
    if (XING.some(function (p) { return (p.indexOf(z1) >= 0 && p.indexOf(z2) >= 0); })) rel.push('相刑');
    if (z1 === z2 && ZI_XING.indexOf(z1) >= 0) rel.push('自刑');
    if (z1 === z2) rel.push('同肖');
    return rel;
  }

  // 日干五合
  var GAN_HE = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];
  function ganHe(g1, g2) {
    return GAN_HE.some(function (p) { return (p[0] === g1 && p[1] === g2) || (p[0] === g2 && p[1] === g1); });
  }

  function levelText(level) {
    return ['下', '中下', '中', '中上', '上'][level + 2];
  }

  function hehun(a, b) {
    var A = BAZI.bazi(a.year, a.month, a.day, a.hour, a.gender);
    var B = BAZI.bazi(b.year, b.month, b.day, b.hour, b.gender);
    A.yearZhi = A.yearGZ.charAt(1); A.yearNaYin = XJ.naYin(A.yearGZ);
    A.dayGan = A.dayGZ.charAt(0); A.dayZhi = A.dayGZ.charAt(1);
    A.animal = XJ.Animals[Zhi.indexOf(A.yearZhi)];
    B.yearZhi = B.yearGZ.charAt(1); B.yearNaYin = XJ.naYin(B.yearGZ);
    B.dayGan = B.dayGZ.charAt(0); B.dayZhi = B.dayGZ.charAt(1);
    B.animal = XJ.Animals[Zhi.indexOf(B.yearZhi)];

    var dims = [];

    // 1) 生肖冲合
    var sxRel = pairRelation(A.yearZhi, B.yearZhi);
    var sxScore, sxLevel, sxText;
    if (sxRel.indexOf('六合') >= 0 || sxRel.indexOf('三合') >= 0) {
      sxLevel = 2; sxScore = 2; sxText = '六合三合之象，性情相投，如磁引针，初交便觉投契。';
    } else if (sxRel.indexOf('六冲') >= 0) {
      sxLevel = -2; sxScore = -2; sxText = '六冲之象，初遇或见锋棱，久处需以柔化刚、各留余地。';
    } else if (sxRel.indexOf('六害') >= 0 || sxRel.indexOf('相刑') >= 0 || sxRel.indexOf('自刑') >= 0) {
      sxLevel = -1; sxScore = -1; sxText = '相害相刑之象，细微龃龉时或有之，贵在直言相谅、不积嫌隙。';
    } else if (sxRel.indexOf('同肖') >= 0) {
      sxLevel = 0; sxScore = 0; sxText = '同肖同心，然亦同执，相处贵有回旋、互不相逼。';
    } else {
      sxLevel = 1; sxScore = 1; sxText = '生肖无显合无显冲，平处见长，以日常相知为基。';
    }
    dims.push({ key: 'shengxiao', title: '生肖冲合', rel: sxRel, level: sxLevel, score: sxScore,
      text: sxText, meta: '【' + A.animal + '】与【' + B.animal + '】' });

    // 2) 纳音相参
    var n1 = A.yearNaYin, n2 = B.yearNaYin, nRel, nLevel, nScore, nText;
    if (sheng(n1, n2) || sheng(n2, n1)) {
      nRel = '相生'; nLevel = 2; nScore = 2; nText = '纳音相生，如春木得雨，彼此滋荣，气场相长。';
    } else if (n1 === n2) {
      nRel = '比和'; nLevel = 1; nScore = 1; nText = '纳音比和，气类相从，于平淡中见真味。';
    } else {
      nRel = '相克'; nLevel = -1; nScore = -1; nText = '纳音相克，刚柔相激，当以退为进、以容化之。';
    }
    dims.push({ key: 'nayin', title: '纳音相参', rel: [nRel], level: nLevel, score: nScore,
      text: nText, meta: '年柱纳音【' + n1 + '】与【' + n2 + '】' + nRel });

    // 3) 日柱夫妻宫
    var gHe = ganHe(A.dayGan, B.dayGan);
    var zRel = pairRelation(A.dayZhi, B.dayZhi);
    var rLevel, rScore, rText, rRel = [];
    if (gHe) rRel.push('日干相合');
    rRel = rRel.concat(zRel.map(function (x) { return '日支' + x; }));
    if (gHe && (zRel.indexOf('六合') >= 0 || zRel.indexOf('三合') >= 0)) {
      rLevel = 2; rScore = 2; rText = '日干相合、日支相合，心意相契、居处相安，夫妻宫明畅。';
    } else if (gHe) {
      rLevel = 1; rScore = 1; rText = '日干相合，言笑有投，然支上无显合，习性需以时日相融。';
    } else if (zRel.indexOf('六合') >= 0 || zRel.indexOf('三合') >= 0) {
      rLevel = 1; rScore = 1; rText = '日支相合，居处相安、习性相融，静处见情。';
    } else if (zRel.indexOf('六冲') >= 0) {
      rLevel = -1; rScore = -1; rText = '日支相冲，起居偶舛，分寸之间多见情意深浅。';
    } else if (zRel.indexOf('相刑') >= 0 || zRel.indexOf('六害') >= 0) {
      rLevel = -1; rScore = -1; rText = '日支相害相刑，细微处各有执念，宜各守分际。';
    } else {
      rLevel = 0; rScore = 0; rText = '日柱无显合无显冲，平处见长，不以星言辞、而以人本心。';
    }
    dims.push({ key: 'rizhu', title: '日柱夫妻宫', rel: rRel, level: rLevel, score: rScore,
      text: rText, meta: '日柱【' + A.dayGZ + '】与【' + B.dayGZ + '】' });

    // 4) 五行互补
    var keys = ['木', '火', '土', '金', '水'];
    var comb = {}; keys.forEach(function (k) { comb[k] = A.wx[k] + B.wx[k]; });
    var maxC = 0, minC = 99; keys.forEach(function (k) { maxC = Math.max(maxC, comb[k]); minC = Math.min(minC, comb[k]); });
    var spread = maxC - minC;
    // 互补：一方所缺（0），他方所厚（>=2）
    var complement = 0;
    keys.forEach(function (k) { if ((A.wx[k] === 0 && B.wx[k] >= 2) || (B.wx[k] === 0 && A.wx[k] >= 2)) complement++; });
    var wLevel, wScore, wText;
    if (spread <= 4 && complement >= 1) {
      wLevel = 2; wScore = 2; wText = '五行相济，刚柔互藏，彼此补短而全其美。';
    } else if (spread <= 6) {
      wLevel = 1; wScore = 1; wText = '五行各有所偏，然未至失衡，以相知相让而调和。';
    } else {
      wLevel = -1; wScore = -1; wText = '五行偏颇各执，所好不同，宜以迁就与成全处之。';
    }
    dims.push({ key: 'wuxing', title: '五行互补', rel: [complement > 0 ? ('互补' + complement + '行') : '各执'], level: wLevel, score: wScore,
      text: wText, meta: '合参五行：木' + comb['木'] + ' 火' + comb['火'] + ' 土' + comb['土'] + ' 金' + comb['金'] + ' 水' + comb['水'] });

    // 5) 十神情缘（妻星/夫星）
    var male = (a.gender === '男') ? A : (b.gender === '男') ? B : null;
    var female = (a.gender === '女') ? A : (b.gender === '女') ? B : null;
    var sRel = [], sLevel = 0, sScore = 0, sText, sMeta = '';
    if (male && female) {
      var qiWx = keys[(WX[male.meWx] + 2) % 5];     // 男 我克者=财=妻星
      var fuWx = keys[(WX[female.meWx] + 3) % 5];    // 女 克我者=官杀=夫星
      var qiDe = (female.meWx === qiWx);
      var fuDe = (male.meWx === fuWx);
      if (qiDe || fuDe) {
        sRel.push('妻夫星得位'); sLevel = 1; sScore = 1;
        sText = '妻星夫星各得其所，情之所钟，自然相吸，缘分有凭。';
      } else {
        sRel.push('妻夫星各安'); sLevel = 0; sScore = 0;
        sText = '妻星夫星各安其位，情非由星定，而在乎人之处心积虑与体谅。';
      }
      sMeta = '男日主【' + male.me + '】妻星属【' + qiWx + '】' + (qiDe ? '得位' : '未显') +
        '；女日主【' + female.me + '】夫星属【' + fuWx + '】' + (fuDe ? '得位' : '未显');
    } else {
      // 同性别合参：以日主生克论相宜
      var gA = A.meWx, gB = B.meWx;
      if (sheng(gA, gB) || sheng(gB, gA)) { sRel.push('日主相生'); sLevel = 1; sScore = 1; sText = '二日主相生，气相扶、意相成，相处多顺。'; }
      else if (gA === gB) { sRel.push('日主比和'); sLevel = 0; sScore = 0; sText = '二日主比和，同道同心，亦需各留余地。'; }
      else { sRel.push('日主相克'); sLevel = -1; sScore = -1; sText = '二日主相克，各有主张，以敬重化刚。'; }
      sMeta = '日主【' + A.me + '·' + gA + '】与【' + B.me + '·' + gB + '】';
    }
    dims.push({ key: 'shishen', title: '十神情缘', rel: sRel, level: sLevel, score: sScore, text: sText, meta: sMeta });

    // —— 总象 ——
    var total = dims.reduce(function (s, d) { return s + d.score; }, 0); // 范围约 -8..10
    var xiang, poem;
    if (total >= 7) { xiang = '天作之合'; poem = '三星在天两心同，芝兰玉树一庭中。\n莫言前定皆由命，相顾温言便是功。'; }
    else if (total >= 4) { xiang = '琴瑟和鸣'; poem = '丝桐合奏韵偏清，呼应从容意自平。\n偶有宫商微错处，相调指下便成声。'; }
    else if (total >= 1) { xiang = '相敬如宾'; poem = '春山并立两从容，敬以将心礼以躬。\n细水长流无尽意，寻常灯火即春风。'; }
    else if (total >= -2) { xiang = '宜缓图之'; poem = '初交如玉未全温，且放慢舟探浅深。\n莫为浮云遮望眼，真心磨处见真金。'; }
    else { xiang = '时乖运蹇'; poem = '萍水相逢各有涯，刚柔相激未相谐。\n若教分寸留余地，柳暗花明或可期。'; }

    return {
      A: A, B: B,
      dims: dims,
      total: total,
      xiang: xiang,
      poem: poem,
      disclaimer: '以上合参，乃以传统命理之象设辞，仅供文化参详与自省，不作任何姻缘论断、不预卜吉凶、不替人事决断。缘在人谋，福由心造。'
    };
  }

  var api = { hehun: hehun, pairRelation: pairRelation, ganHe: ganHe };
  root.XJ_HEHUN = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
