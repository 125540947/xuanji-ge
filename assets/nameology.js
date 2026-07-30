/*
 * 姓名学引擎（五格剖象法）
 * 纯本地、零依赖、零 AI、零远程。仅用康熙字典笔画（见 kangxi-strokes.js）。
 * 算法：通用五格剖象法（天格/人格/地格/外格/总格）+ 三才五行生克 + 81 数理吉凶。
 * 给象不给令：只作文化演算，不作命运断言。
 */
(function (global) {
  'use strict';

  // —— 康熙笔画查询 ——
  function strokesOf(ch) {
    var table = global.KANGXI_STROKES;
    if (!table) return null;
    var s = table[ch];
    return (typeof s === 'number') ? s : null;
  }

  // 异说笔画查询（可选流派差异，如陳有15/16两说）
  function altStrokesOf(ch) {
    var t = global.KANGXI_ALT_STROKES;
    if (!t) return null;
    var a = t[ch];
    return Array.isArray(a) ? a : null;
  }

  // 把字符串拆成单字并取各自康熙笔画
  // override：{ char: strokes } 异说覆盖（用户选择按异说重算时用）；main 保留主值用于提示
  function splitStrokes(str, override) {
    var arr = Array.from(str || '');
    return arr.map(function (ch) {
      var main = strokesOf(ch);
      var st = (override && Object.prototype.hasOwnProperty.call(override, ch)) ? override[ch] : main;
      return { ch: ch, strokes: st, main: main };
    });
  }

  // —— 五行（依数理个位数：1/2木 3/4火 5/6土 7/8金 9/0水）——
  function wuxingOf(n) {
    var m = ((n % 10) + 10) % 10; // 0-9
    if (m === 1 || m === 2) return '木';
    if (m === 3 || m === 4) return '火';
    if (m === 5 || m === 6) return '土';
    if (m === 7 || m === 8) return '金';
    return '水'; // 9 或 0
  }

  // 五行生克
  var SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  var KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

  function relation(a, b) {
    if (a === b) return '比和';
    if (SHENG[a] === b) return '生';   // a 生 b
    if (KE[a] === b) return '克';       // a 克 b
    if (SHENG[b] === a) return '被生';
    return '被克';
  }

  // —— 81 数理吉凶表 —— 索引 1..81，[等级, 释义]
  // 等级：1=吉 2=凶 3=半吉
  // 等级：1=吉 2=凶 3=半吉；文本为通用「五格剖象法」81 数理释义
  var TABLE = [
    null,
    [1, '太极之数，万物开泰，生发无穷，大吉之象。'],
    [2, '一身孤节，混沌未分，析离破败，辛苦悲凄之数。'],
    [1, '进取如意，茁壮茂盛，名利双收，大业成就之数。'],
    [2, '破败凶变，辛苦磨难，灾难缠身，万物枯衰之数。'],
    [1, '种竹成林，福禄长寿，阴阳和合，安稳余庆之数。'],
    [1, '安稳余庆，慈祥有德，温良和顺，复兴家业之数。'],
    [1, '刚毅果断，独立权威，动静得宜，刚柔兼备之数。'],
    [1, '坚刚志竟，意志坚定，艺能成功，名利双收之数。'],
    [2, '破舟进海，成败难料，陷落穷途，孤苦无依之数。'],
    [2, '零暗之星，万业终熄，黑暗幽沉，空虚灭亡之数。'],
    [1, '旱苗逢雨，草木逢春，挽回收获，挽回颓运之数。'],
    [2, '掘井无泉，意志薄弱，孤立无援，谋事难成之数。'],
    [1, '智略超群，才艺英敏，富有智谋，奏功受福之数。'],
    [2, '破兆之数，灾难迭至，家运衰败，泪滴茫茫之数。'],
    [1, '福寿圆满，富贵荣誉，立身兴家，长寿之数。'],
    [1, '厚重载德，安富尊荣，财官双美，功成名就之数。'],
    [1, '刚强不屈，突破万难，以柔克刚，刚毅果断之数。'],
    [1, '铁镜重磨，权威显达，有见识量力，获得成功之数。'],
    [2, '多难之数，风云蔽日，辛苦重来，虽有智谋亦凶。'],
    [2, '屋下藏金，非业破运，灾难重重，病弱短寿之数。'],
    [1, '明月中天，光风霁月，权威首领，万物成形确立之数。'],
    [2, '秋草逢霜，怀才不遇，薄弱挫折，忧愁困苦之数。'],
    [1, '壮丽之数，旭日东升，权威旺盛，功名荣达之数。'],
    [1, '掘藏得金，家门余庆，金钱丰盈，白手成家之数。'],
    [1, '英俊刚毅，资性英敏，性格刚强，自成大业之数。'],
    [2, '变怪之数，英雄运格，波澜重叠，虽奏大功亦凶。'],
    [2, '增长之数，欲望无止，宜慎戒争，自获天佑则吉。'],
    [2, '阔水浮萍，流浪天涯，一身孤节，豪杰气概亦凶。'],
    [1, '智谋优秀，财力归集，鸣奏大功，势力强大之数。'],
    [3, '非运之数，沉浮不定，凶吉难分，配合他格则吉。'],
    [1, '春日花开，智勇得志，顺调发展，繁荣富贵之数。'],
    [1, '宝马金鞍，侥幸多望，贵人得助，财帛丰盈之数。'],
    [1, '旭日升天，鸾凤相会，才德开展，功威大业之数。'],
    [2, '破家之数，灾难不绝，病弱短命，骨肉离散大凶。'],
    [1, '高楼望月，温和平静，智达通畅，优雅发展之数。'],
    [2, '波澜之数，风浪不息，侠气义情，历尽艰险亦凶。'],
    [1, '猛虎出林，权威显达，热诚忠信，宜涵养雅量吉。'],
    [3, '磨铁成针，意志薄弱，艺术成功，刻意经营半吉。'],
    [1, '富贵荣华，德泽四方，财富丰盈，家门隆昌之数。'],
    [2, '退安之数，谨慎保安，浮沉多端，清高之象半吉。'],
    [1, '有德之数，纯阳独秀，德高望重，事事如意吉。'],
    [2, '寒蝉在柳，十艺九不成，缺乏谋略，薄弱无力凶。'],
    [2, '散财之数，须防外患，薄弱无能，灾害交至凶。'],
    [2, '烦闷之数，破家亡身，暗藏惨淡，难望成功凶。'],
    [1, '顺风扬帆，新生泰和，顺风行舟，得天助而如意吉。'],
    [2, '浪里淘金，载宝沉舟，须防意外，罗网系身凶。'],
    [1, '点石成金，开花结果，权威进气，可获大功吉。'],
    [1, '古松立鹤，德智兼备，泽被乡党，富贵荣华之数。'],
    [2, '转变之数，吉凶难分，辛惨不绝，晚景凄凉凶。'],
    [2, '小舟入海，一成一败，吉凶参半，须防倾覆凶。'],
    [3, '沉浮之数，盛衰交加，须防小人，配合他格半吉。'],
    [1, '达眼之数，先见之明，理想实现，多获成功吉。'],
    [2, '曲卷难星，忧愁苦难，外祥内苦，先甜后苦凶。'],
    [2, '石上栽花，多难悲运，难望成功，身心过劳凶。'],
    [2, '善恶之数，半吉半凶，须防恶死，外祥内苦凶。'],
    [2, '浪里行舟，历尽艰辛，四周障碍，毫无气力凶。'],
    [1, '日照春松，寒雪青松，三才良善，可望长寿吉。'],
    [3, '晚行遇月，先苦后甘，沉浮多端，夜行逢月半吉。'],
    [2, '寒蝉悲风，时运不济，缺乏斗志，愁苦亡身凶。'],
    [2, '无谋之数，争名夺利，黑暗无光，徒劳无功凶。'],
    [1, '牡丹芙蓉，名利双收，家门昌隆，才德开展吉。'],
    [2, '衰败之数，基础虚弱，艰难困苦，病弱短命凶。'],
    [1, '舟归平海，富贵荣华，身心健和，渐进向上吉。'],
    [2, '离愁之数，骨肉分离，流浪天涯，愁苦亡身凶。'],
    [1, '巨流归海，天长地久，家运隆昌，富贵东来吉。'],
    [2, '岩头步马，进退维谷，内外不和，坐食山空凶。'],
    [1, '通达之数，财利丰盈，利路亨通，白手成家吉。'],
    [1, '顺风扬帆，天时地利，智谋经纬，富贵繁荣吉。'],
    [2, '非业之数，坐食山空，陷于穷途，浮沉不定凶。'],
    [2, '残菊逢霜，家运衰退，晚景凄凉，多愁多难凶。'],
    [3, '石上金花，枯荣参半，劳而无功，晚景宜静半吉。'],
    [2, '劳苦之数，荣枯交加，祸福并行，难得安宁凶。'],
    [2, '无勇之数，盛衰难料，外祥内苦，先天薄弱凶。'],
    [2, '残菊逢霜，秋叶飘零，沉沦逆境，晚景凄凉凶。'],
    [2, '退守之数，宜守不宜攻，保守平安，晚景尚可凶。'],
    [2, '离散之数，骨肉分离，内外不合，虽美亦凶凶。'],
    [3, '前半生吉，后半生凶，盛衰交加，须防患未然半吉。'],
    [2, '无始有终，先苦后甜，晚景可望，中途挫败凶。'],
    [2, '云头望月，身疲力尽，虽谋多成，晚景凄凉凶。'],
    [2, '遁逃之数，一生困难，事业无成，万物收束凶。'],
    [1, '万物回春，最吉之数，还原复始，繁荣富贵吉。']
  ];

  var JI_LABEL = { 1: '吉', 2: '凶', 3: '半吉' };

  function numberFate(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 1) {
      return { level: 3, label: '半吉', text: '数理超出常表，吉凶难定。' };
    }
    n = Math.floor(n);
    // 传统折法：超过 81 者减 80 续数（82→2，161→81）；81 本身在表内不折
    var key = n > 81 ? ((n - 2) % 80) + 2 : n;
    var row = TABLE[key];
    if (!row) return { level: 3, label: '半吉', text: '数理超出常表，吉凶难定。' };
    return { level: row[0], label: JI_LABEL[row[0]], text: row[1] };
  }

  // —— 五格计算 ——
  function compute(surname, given, opts) {
    opts = opts || {};
    var altOverride = opts.altOverride || null;
    surname = (surname || '').trim();
    given = (given || '').trim();
    if (!surname || !given) {
      return { error: '请填写姓氏与名字。' };
    }
    var s = splitStrokes(surname, altOverride);
    var g = splitStrokes(given, altOverride);
    if (s.length > 2) {
      return { error: '姓氏至多两字（单姓或复姓），请核对输入。' };
    }
    if (g.length > 2) {
      return { error: '名字至多两字（单名或双名），三字名暂不支持。' };
    }

    // 缺字检测
    var missing = [];
    s.concat(g).forEach(function (it) {
      if (it.strokes === null) missing.push(it.ch);
    });
    if (missing.length) {
      return {
        error: '以下字暂无康熙笔画（生僻字或非常用字）：' + missing.join(' '),
        missing: missing
      };
    }

    var sumS = s.reduce(function (a, b) { return a + b.strokes; }, 0);
    var sumG = g.reduce(function (a, b) { return a + b.strokes; }, 0);
    var isCompound = s.length >= 2;        // 复姓（取前两字参与天地格）
    var sLast = s[s.length - 1].strokes;   // 姓末字
    var gFirst = g[0].strokes;             // 名首字
    var gLast = g[g.length - 1].strokes;   // 名末字

    var tian = isCompound ? sumS : s[0].strokes + 1;
    var ren = sLast + gFirst;
    var di = g.length <= 1 ? gFirst + 1 : sumG;
    var zong = sumS + sumG;
    // 外格通式 = 天格 + 地格 − 人格
    // （等价于传统四则：单姓单名=2；单姓双名=名末+1；复姓单名=姓首+1；复姓双名=姓首+名末）
    var wai = tian + di - ren;

    var grids = [
      { name: '天格', value: tian, from: isCompound ? '姓氏笔画之和' : '姓笔画 + 1' },
      { name: '人格', value: ren, from: '姓末字 + 名首字' },
      { name: '地格', value: di, from: g.length <= 1 ? '名笔画 + 1' : '名字笔画之和' },
      { name: '外格', value: wai, from: '天格 + 地格 − 人格' },
      { name: '总格', value: zong, from: '姓与名笔画之和' }
    ];
    grids.forEach(function (gr) {
      gr.wuxing = wuxingOf(gr.value);
      var fate = numberFate(gr.value);
      gr.level = fate.level;
      gr.ji = fate.label;
      gr.text = fate.text;
    });

    // 三才（天/人/地）
    var wxTian = wuxingOf(tian);
    var wxRen = wuxingOf(ren);
    var wxDi = wuxingOf(di);
    var relTR = relation(wxTian, wxRen);
    var relRD = relation(wxRen, wxDi);
    // 综合论断：统计五格吉凶并给总评
    var jiCount = { 1: 0, 2: 0, 3: 0 };
    grids.forEach(function (g) { jiCount[g.level]++; });
    var goodN = jiCount[1], badN = jiCount[2], midN = jiCount[3];
    var verdict;
    if (badN === 0) verdict = '五格无凶，理数清通，主运平顺。';
    else if (goodN >= badN) verdict = '吉格多于凶格，整体趋吉，偶有波折可化解。';
    else verdict = '凶格偏多，理数有滞，宜以修为转化、以静制动。';
    var summary = { good: goodN, bad: badN, mid: midN, verdict: verdict };

    var sanCai = {
      tian: wxTian, ren: wxRen, di: wxDi,
      relTianRen: relTR, relRenDi: relRD,
      text: evalSanCai(wxTian, wxRen, wxDi, relTR, relRD)
    };

    // 异说提示：收集输入中「有可选流派笔画」的字（始终基于主表 vs 异说表，与主/异说计算无关）
    var alts = [];
    s.concat(g).forEach(function (it) {
      var a = altStrokesOf(it.ch);
      if (a && a.indexOf(it.main) === -1) alts.push({ ch: it.ch, main: it.main, alts: a });
    });
    // 实际采用的异说覆盖（用于展示「已按异说重算」）
    var usedAlt = {};
    if (altOverride) {
      s.concat(g).forEach(function (it) {
        if (Object.prototype.hasOwnProperty.call(altOverride, it.ch) && altOverride[it.ch] !== it.main) {
          usedAlt[it.ch] = altOverride[it.ch];
        }
      });
    }

    return {
      surname: surname,
      given: given,
      compound: isCompound,
      singleGiven: g.length <= 1,
      grids: grids,
      sanCai: sanCai,
      summary: summary,
      alts: alts,
      usedAlt: usedAlt
    };
  }

  function evalSanCai(t, r, d, relTR, relRD) {
    // 以「天人」「人地」两组关系判吉凶：生/比和为吉，克为凶
    function desc(a, b, rel) {
      var map = {
        '比和': a + '与' + b + '比和，气运相安',
        '生': a + '生' + b + '，顺势得助',
        '被生': b + '生' + a + '，得人帮扶',
        '克': a + '克' + b + '，暗藏摩擦',
        '被克': b + '克' + a + '，受制受压'
      };
      return map[rel] || '';
    }
    var good = (relTR === '比和' || relTR === '生' || relTR === '被生') &&
               (relRD === '比和' || relRD === '生' || relRD === '被生');
    var bad = (relTR === '克' || relTR === '被克') && (relRD === '克' || relRD === '被克');
    var verdict = good ? '三才相生（或半吉），主运通顺、根基稳固。' :
                  bad ? '三才相克，起伏波折，宜以德养运、以静制动。' :
                        '三才互有生克，吉凶参半，中年后渐入佳境。';
    return desc(t, r, relTR) + '；' + desc(r, d, relRD) + '。' + verdict;
  }

  // 统计五格五行分布（天/人/地/外/总各计一票）
  function wuxingDist(r) {
    var wx = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    r.grids.forEach(function (g) { if (wx[g.wuxing] !== undefined) wx[g.wuxing]++; });
    return { wx: wx, total: r.grids.length };
  }

  // 姓名五行 vs 八字喜用：给出补益评语（简化推演，仅供文化参考）
  function nameBaziAdvice(nameR, baziR) {
    var dist = wuxingDist(nameR);
    var xiSet = {}, jiSet = {};
    (baziR.xiWx || []).forEach(function (w) { xiSet[w] = true; });
    (baziR.jiWx || []).forEach(function (w) { jiSet[w] = true; });
    var xiCount = 0, jiCount = 0;
    Object.keys(dist.wx).forEach(function (w) {
      if (xiSet[w]) xiCount += dist.wx[w];
      if (jiSet[w]) jiCount += dist.wx[w];
    });
    var advice;
    if (xiCount >= 3) advice = '姓名五行偏重喜用（' + baziR.xiWx.join('、') + '），与八字相济，补益明显。';
    else if (xiCount === 2) advice = '姓名五行中平，喜用（' + baziR.xiWx.join('、') + '）得其二，可资调候。';
    else advice = '姓名五行中喜用（' + baziR.xiWx.join('、') + '）仅得其一，补益有限，可斟酌增配。';
    if (jiCount >= 3) advice += '另须留意忌神（' + baziR.jiWx.join('、') + '）偏重，宜权衡。';
    return { xiCount: xiCount, jiCount: jiCount, xiWx: baziR.xiWx, jiWx: baziR.jiWx, advice: advice };
  }

  var api = {
    compute: compute, wuxingOf: wuxingOf, numberFate: numberFate, strokesOf: strokesOf,
    altStrokesOf: altStrokesOf, wuxingDist: wuxingDist, nameBaziAdvice: nameBaziAdvice
  };
  global.Nameology = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
