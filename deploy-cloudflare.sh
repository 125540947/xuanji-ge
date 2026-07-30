#!/usr/bin/env bash
# 玄机阁 → Cloudflare Pages 部署脚本（纯静态托管）
# ⚠️ 本脚本会联网：① 用 npx 拉取 wrangler；② 首次运行需在浏览器登录你自己的 Cloudflare 账号。
#    玄机阁自身仍是纯本地演算，部署只是把静态文件放到 CDN，访客生辰绝不会离开其浏览器。
set -euo pipefail

PROJ="xuanji-ge"   # 可改为你想要的 Pages 项目名
DIST="dist"        # 已按白名单生成的生产构件目录

echo "▶ 校验构件目录：$DIST"
test -f "$DIST/index.html" || { echo "缺少 $DIST/index.html，请先按白名单构建构件"; exit 1; }

echo "▶ 登录 Cloudflare（浏览器授权，需你自己的账号凭证）"
npx wrangler login

echo "▶ 部署到 Cloudflare Pages"
npx wrangler pages deploy "$DIST" --project-name "$PROJ" --branch main

echo "✅ 部署完成。在 Cloudflare Pages 后台可绑定自定义域名并开启 HTTPS。"
