# 玄机阁 · 代码质量门禁（quality-gate）

玄机阁坚持**纯本地、零依赖、零外链**规格。为在持续迭代时不破坏这一规格（误引入外部 fetch、eval、未转义注入、长行/风格漂移等），把 `code-self-review` 自审引擎接入了提交卡点。

## 文件

- `pre-commit.sh` —— Git pre-commit 钩子本体，提交前对全站跑自审，`--fail-on high` 即阻止提交。
- 自审引擎来自 user-level skill：`~/.workbuddy/skills/code-self-review/assets/self-review.js`（由钩子 `SELF_REVIEW` 变量定位，可改）。
- 项目根 `review.config.json` —— 扫描范围与规则强度（已 `exclude` 测试脚本与 1MB 康熙笔画数据，避免自命中与误报）。

## 启用步骤

玄机阁当前**尚未初始化 git 仓库**，需先建库再装钩子：

```bash
cd 玄机阁
git init
cp quality-gate/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

之后每次 `git commit` 会自动跑门禁。临时跳过某次提交：`git commit --no-verify`。

## CI（可选）

若未来托管到 GitHub，可放入 `.github/workflows/self-review.yml`（模板见 user-level skill `assets/hooks/github-actions.yml`）：把 `code-self-review/assets` 复制为项目内 `self-review/`，CI 引用 `self-review/self-review.js` 即可卡点 PR。

## 规则强度

默认 `high` 级（含 critical）阻断提交；`info`/`style` 误报可酌情清理或调 `review.config.json` 降级。**注意**：自审为启发式正则，可能漏报/误报，重要逻辑（历法/命理公式）仍以 `assets/regression-test.js` + `integration-test.js` + `assets/adversarial-probe.js` 三类测试兜底。
