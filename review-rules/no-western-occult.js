// 玄机阁专属自定义规则：禁止出现西玄（塔罗/星座/占星等）词汇
// 依据《玄机阁模块规划》——「塔罗星座因西玄违道风，出域不纳」。
// 此文件本身含这些词（作为检测样本），故已在项目配置中排除扫描本目录。
// 自定义规则格式与内置规则一致：导出规则对象数组，每个含 id/category/severity/appliesTo/description/suggestion/run。
'use strict';

const FORBIDDEN = [
  { re: /塔罗/gi, word: '塔罗' },
  { re: /tarot/gi, word: 'tarot' },
  { re: /星座/g, word: '星座' },
  { re: /占星/g, word: '占星' },
  { re: /astrology/gi, word: 'astrology' },
  { re: /zodiac/gi, word: 'zodiac' },
];

const rules = [
  {
    id: 'xuanji/no-western-occult',
    category: 'domain',
    severity: 'high',
    appliesTo: ['js', 'html', 'css'],
    description: '出现西玄（塔罗/星座/占星）词汇，违背玄机阁「中玄为正、西玄出域」的边界',
    suggestion: '移除西玄内容；玄机阁只做八字/紫微/灵签/黄历等中土术数。',
    run(source, lines) {
      const out = [];
      lines.forEach((ln, i) => {
        for (const f of FORBIDDEN) {
          if (f.re.test(ln)) out.push({ line: i + 1, message: `命中西玄词汇「${f.word}」，玄机阁不纳西玄。` });
        }
      });
      return out;
    },
  },
];

module.exports = rules;
