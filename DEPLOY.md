# 玄机阁 · 部署清单

> 纯本地、零依赖、零远程的中华命理文化站。本清单界定「上线产物」与「不上线物」，并附上线前必跑的验证门禁。

## 一、上线产物（白名单，需保持目录结构一起部署）

| 路径 | 说明 |
|------|------|
| `index.html` | 首页/导航/今日农历 |
| `assets/` | 全部运行时资源 |
| `assets/config.js` | 集中配置（年份边界、站点元信息、日志开关） |
| `assets/logger.js` | 本地错误捕获与横幅（绝不外报） |
| `assets/core.js` | 历法内核（农历/节气/干支） |
| `assets/bazi.js` `ziwei.js` `hehun.js` `nameology.js` `qian.js` | 五大引擎 |
| `assets/kangxi-strokes.js` | **运行时数据依赖**：康熙笔画主表（必部署） |
| `assets/kangxi-alt.js` | **运行时数据依赖**：笔画异说层（必部署） |
| `assets/style.css` | 样式 |
| `modules/` | 六个功能页（lingqian/huangli/bazi/ziwei/hehun/nameology） |

> 注意：`kangxi-strokes.js` 与 `kangxi-alt.js` 仅在「自审」中被 exclude（因其为自动生成的大数据表），**部署时必须包含**，否则姓名学无法运行。

## 二、不部署（开发/质量/历史物）

- `reports/` —— 自审历史报告
- `assets/regression-test.js` `assets/adversarial-probe.js` `integration-test.js` —— 测试脚本
- `review.config.json` `review-rules/` —— 自审配置与自定义规则
- `quality-gate/` —— pre-commit / CI 模板（非运行时，可随仓库但勿进静态根）
- `DEPLOY.md` —— 本清单

## 三、部署方式

1. **静态托管**（推荐）：GitHub Pages / Nginx / 对象存储 / 任意静态服务器，保持上述目录结构即可。
2. **本地离线**：直接双击 `index.html`。全站为经典脚本（无 ES module、无 fetch、无跨域），`file://` 亦可完整运行。

## 四、零外联承诺（硬约束）

- 全站不含任何 `http(s)://` 外链 / `fetch` / `WebSocket` / 远程字体 / CDN。
- 生辰与历法演算 100% 在本机完成，信息不出本机。

## 五、上线前必跑验证门禁

```bash
node assets/regression-test.js      # 期望：通过 82 / 失败 0
node integration-test.js            # 期望：通过 7 / 失败 0
node assets/adversarial-probe.js    # 期望：发现问题 0
node ~/.workbuddy/skills/code-self-review/assets/self-review.js \
  --target . --config review.config.json --out reports --format json --fail-on high
                                   # 期望：扫描 16 文件，命中 0
```

## 六、本次终审结论（2026-07-30）

- 回归 **82/82** · 集成 **7/7** · 对抗探针 **4000 组 0 问题**
- 自审 **16 文件 0 命中**（致命/高危/警告/提示全 0）
- 资源引用 **全部有效** · 生产代码 **零硬编码本地地址** · **零外联**
- 非 ES module，**支持 file:// 双击离线运行**
- 四大历史局限已全部消除（康熙异说、姓名学联动八字喜用、自审接 pre-commit/CI）

**结论：已达到可正式部署上线标准。**

## 七、部署到 Cloudflare Pages

> Cloudflare Pages 是**纯静态 CDN 托管**，无后端、不执行任何服务端逻辑。
> 玄机阁全部历法/八字演算仍在访客浏览器本地进行，站点无任何外链 / `fetch`，
> 因此**部署到 Cloudflare 不破坏「零外联、生辰不出本机」硬约束**——CDN 只分发文件，从不接触生辰。

### 已就绪的生产构件
- `dist/` 已按白名单生成（index.html + assets/ + modules/，约 1.2MB，含运行时数据依赖 `kangxi-strokes.js` / `kangxi-alt.js`）。
- 已本地验证 `dist/` 独立托管时全部资源返回 200，可自包含运行。

### 路径 A：Git 集成（推荐，最省心）
1. 将玄机阁纳入 Git 仓库（建议仅跟踪 `dist/` 内容，或令仓库根 = dist 内容）。
2. 推送到 GitHub / GitLab。
3. Cloudflare 后台 → **Pages → Create a project → Connect Git** → 选仓库。
4. 构建命令：**留空**；构建输出目录：**`dist`**（构件所在目录）。
5. 部署完成后在后台绑定自定义域名、开启 HTTPS（默认已分配 `*.pages.dev` 子域）。

### 路径 B：Wrangler CLI 直传（无需 Git）
```bash
npx wrangler login              # 浏览器授权（你自己的 CF 账号）
npx wrangler pages deploy dist --project-name xuanji-ge --branch main
```
或直接运行本仓库的 `bash deploy-cloudflare.sh`（含前置构件校验）。

### 注意事项
- 部署是静态文件分发，CDN 不接触任何生辰数据；若有自定义域名，记得开启 **Always Use HTTPS**。
- 日后若改引擎：重跑 P13 四门禁 → 重新生成 `dist/`（白名单复制命令见上）→ 重新部署。
- `dist/` 已加入自审 exclude，不会污染「生产代码 16 文件」计数与门禁结果。
- 本机当前未安装 `wrangler` / `cloudflared`；CLI 路径需你联网安装并用自己的 CF 凭证登录（玄微不联网操作你的账号）。

## 八、Cloudflare Workers + GitHub（边缘计算，无需服务器）

> 适用你提出的「Workers + GitHub + 边缘计算」诉求。
> 架构：GitHub 仓库存源码 → push 触发 GitHub Actions → 用 Wrangler 把 Worker（含 Static Assets）部署到 Cloudflare 边缘网络。
> 全程**无服务器、无后端**：Worker 仅做静态文件分发器（`worker.js` 把请求交给 `ASSETS` 绑定），
> 历法/八字演算仍在访客浏览器本地完成，生辰数据不出本机。

### 已就绪的文件
| 文件 | 作用 |
|------|------|
| `wrangler.toml` | Worker 配置：`main=worker.js`，`[assets].directory=dist`（边缘静态资源目录） |
| `worker.js` | 边缘 Worker 入口：仅转发请求给 Static Assets，不读/不传任何用户数据 |
| `.github/workflows/deploy.yml` | GitHub Actions：push 到 `main` 时自动构建 `dist/` 并 `wrangler deploy` |
| `.gitignore` | 排除 `dist/`（构建产物由 CI 重建）、`reports/`、`node_modules/` |

> 说明：`dist/` 由 CI 在每次部署时按白名单重建，**不进仓库**，保证"仓库=源码、部署=产物"。

### 你的操作步骤（需你用自己的凭证完成）
1. **准备 GitHub 仓库**：把本目录 `git init` 后的内容推到你的 GitHub（见下方本地已就绪的提交）。
2. **Cloudflare 凭证（二选一）**：
   - **方式一（推荐，免令牌）**：Cloudflare 后台 → **Workers & Pages → 你的 Worker → Settings → Version Control → Connect Git**，直接连 GitHub 仓库，push 即自动部署（用 CF 原生 Git 集成，不经过上面的 Actions，可二选一）。
   - **方式二（Actions）**：Cloudflare 后台建 API Token（权限 `Account → Workers Scripts Edit` + `Zone → Worker Routes Edit`），到 GitHub 仓库 **Settings → Secrets → Actions** 新增 `CLOUDFLARE_API_TOKEN`。随后 push 即触发 `.github/workflows/deploy.yml` 自动部署。
3. **绑定域名 / HTTPS**：部署后在 CF 后台绑定自定义域名并开启 **Always Use HTTPS**（默认也分配 `*.workers.dev` 子域，可直接访问验证）。

### 本地已为你做（无需联网）
- 已 `git init` 并完成初始提交（含源码、`wrangler.toml`、`worker.js`、`.github/`、`deploy-cloudflare.sh` 等）。
- **尚未** `git remote add` 与 `git push`：需你提供 GitHub 仓库地址后执行，或用 CF 原生 Git 集成免推送。

### 改引擎后的发布流程
重跑四门禁 → `git commit` 改动 → `git push` 到 `main` → CI 自动重建 `dist/` 并部署；或 CF 原生集成自动接管。
