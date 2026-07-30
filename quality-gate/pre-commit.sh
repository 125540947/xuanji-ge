#!/usr/bin/env bash
# 玄机阁 · 提交前代码自审钩子（复用 user-level code-self-review 引擎）
# 阻止提交带 critical/high 问题的代码，保证玄机阁纯本地零依赖规格不被破坏。
#
# 启用（玄机阁目前尚未 git init，先建库再装钩子）：
#   cd 玄机阁
#   git init
#   cp quality-gate/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
# 之后每次 commit 会自动对全站跑自审；若要跳过单次提交：git commit --no-verify
set -euo pipefail

# 指向 user-level skill 的自审引擎（跨项目复用，零依赖）
SELF_REVIEW="${SELF_REVIEW:-$HOME/.workbuddy/skills/code-self-review/assets/self-review.js}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG="$ROOT/review.config.json"
OUT="$ROOT/.self-review-reports"
FORMAT="${FORMAT:-both}"
FAIL_ON="${FAIL_ON:-high}"

if [ ! -f "$SELF_REVIEW" ]; then
  echo "[self-review] 未找到 self-review.js：$SELF_REVIEW" >&2
  echo "[self-review] 请安装 code-self-review skill，或设置 SELF_REVIEW 环境变量。本次跳过。" >&2
  exit 0
fi

ARGS=(--target "$ROOT" --out "$OUT" --format "$FORMAT" --fail-on "$FAIL_ON")
if [ -f "$CFG" ]; then ARGS+=(--config "$CFG"); fi

echo "[self-review] 玄机阁代码质量门禁（fail-on=$FAIL_ON）…"
node "$SELF_REVIEW" "${ARGS[@]}"
code=$?
if [ "$code" -ne 0 ]; then
  echo "[self-review] 发现 critical/high 问题，已阻止提交。报告见：$OUT" >&2
  echo "[self-review] 修复后重新 git add 并 commit。" >&2
  exit 1
fi
echo "[self-review] 通过 ✔"
exit 0
