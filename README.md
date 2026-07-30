# 玄机阁 · 纯本地命理静态站

一个**零依赖、零 AI、零远程**的中文传统命理工具站。全部历法、八字、紫微、姓名学、合婚、黄历、灵签演算都在**访客浏览器本地**完成，站点内没有任何网络请求，生辰数据**永远不会离开用户本机**。

> 纯前端、纯静态、可离线双击运行。适合自托管，也适合托管到任意静态 CDN（已附 Cloudflare Workers 边缘部署配置）。

---

## 特性

- **纯本地运行**：无任何后端、无 `fetch` / 外链、无追踪。断网也能用。
- **零第三方依赖**：不引入任何 CDN 库或框架，所有演算引擎手写。
- **隐私优先**：用户输入的生辰、姓名只在本地浏览器内计算与展示。
- **响应式**：桌面 / 移动端自适应，移动端导航可点。
- **文化参考定位**：所有结果均标注「仅供文化参考，勿执为定数」。

## 功能模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 首页 | `index.html` | 今日农历 / 干支 / 生肖速览，模块导航 |
| 八字 | `modules/bazi.html` | 四柱八字、五行强弱、十神、喜用神 |
| 紫微斗数 | `modules/ziwei.html` | 命盘十二宫、主星辅星安星 |
| 姓名学 | `modules/nameology.html` | 五格剖象、81 数理、康熙笔画、复姓支持、流派异说提示、八字喜用联动 |
| 合婚 | `modules/hehun.html` | 双方八字合参 |
| 黄历 | `modules/huangli.html` | 日历、宜忌、节气 |
| 灵签 | `modules/lingqian.html` | 求签解签 |

## 本地运行

**方式一：直接双击**
打开仓库根目录的 `index.html` 即可。所有脚本均为经典 `<script>`（非 ES module），`file://` 协议下也能完整运行。

**方式二：本地静态服务器**（推荐，避免个别浏览器对本地文件的限制）
```bash
cd 玄机阁
python3 -m http.server 8765
# 浏览器访问 http://localhost:8765/
```

## 部署到 Cloudflare（边缘计算 · 无服务器）

仓库已内置完整部署配置，可在**无后端、无服务器**的情况下通过 Cloudflare 边缘网络分发：

- `wrangler.toml` — Worker 配置，`[assets].directory = "dist"` 指向构建产物目录。
- `worker.js` — 5 行边缘静态分发器，唯一 `fetch` 是 Cloudflare **内部 ASSETS 绑定**（同源静态分发，数据不出本机）。
- `.github/workflows/deploy.yml` — 推送 `main`/`master` 后自动重建 `dist/` 并 `wrangler deploy`。
- `deploy-cloudflare.sh` — 手动部署脚本模板。

**构建产物目录 `dist/` 由 CI 自动生成**（已在 `.gitignore` 排除），请勿手工提交。

详细步骤见 [`DEPLOY.md`](./DEPLOY.md)。

### 一键部署前提
1. 在 Cloudflare 后台连接本仓库（原生 Git 集成，免令牌），或配置 `CLOUDFLARE_API_TOKEN` 仓库密钥（GitHub Actions）。
2. 推送后自动上线，默认获得 `*.workers.dev` 子域，可再绑自定义域名并开启 Always Use HTTPS。

## 项目结构

```
玄机阁/
├── index.html                 # 首页
├── modules/                   # 各功能页面（bazi/ziwei/nameology/hehun/huangli/lingqian）
├── assets/                    # 运行时引擎与样式
│   ├── core.js                # 历法核心（农历/节气/日期校验）
│   ├── bazi.js                # 八字引擎 + 喜用神五行
│   ├── ziwei.js               # 紫微斗数引擎
│   ├── nameology.js           # 姓名学引擎（五格/81数理/异说/喜用联动）
│   ├── hehun.js / qian.js     # 合婚 / 灵签引擎
│   ├── kangxi-strokes.js      # 康熙笔画主表（运行时数据依赖）
│   ├── kangxi-alt.js          # 康熙笔画异说层（陳15/16 等）
│   ├── config.js / logger.js  # 配置与本地日志
│   └── style.css
├── wrangler.toml / worker.js  # Cloudflare 边缘部署
├── .github/workflows/         # 自动部署流水线
├── quality-gate/              # 自审 pre-commit 钩子与说明
├── DEPLOY.md                  # 部署与上线清单
└── review.config.json         # 代码自审配置
```

> 注意：`kangxi-strokes.js` 与 `kangxi-alt.js` 是**运行时数据依赖，必须随站部署**（仅被自审排除，非部署排除）。

## 质量门禁

源码含三套测试，改动引擎后建议全部跑一遍：

```bash
node assets/regression-test.js      # 回归断言（五格/81数理/日期边界/喜用联动等）
node integration-test.js            # jsdom 真实 DOM 集成（7 页）
node assets/adversarial-probe.js    # 4000 组随机日期对抗式轰击
```

代码自审可使用 `code-self-review` 技能（见 `quality-gate/` 与 `.workbuddy/skills/code-self-review`）。

## 许可

本仓库仅供个人学习与传统民俗文化研究使用。命理内容均属文化参考，不构成任何决策建议。
