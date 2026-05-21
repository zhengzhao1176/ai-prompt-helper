#!/usr/bin/env bash
# 一键搭建 Turso 数据库并把现有数据迁移上去。
# 用法：在项目目录运行   bash setup-turso.sh
set -e
cd "$(dirname "$0")"

echo "========== 1/5 · 安装 Turso CLI =========="
if command -v turso >/dev/null 2>&1; then
  echo "Turso CLI 已安装"
else
  brew install tursodatabase/tap/turso
fi

echo
echo "========== 2/5 · 检查 Turso 登录状态 =========="
# 注意：Turso CLI 未登录时命令仍会“成功退出”，所以这里按输出内容判断。
WHOAMI="$(turso auth whoami 2>&1 || true)"
if echo "$WHOAMI" | grep -qiE "not logged in|未登录"; then
  echo ">>> 需要登录。浏览器会打开，请用 GitHub 登录 / 注册 Turso（免费）<<<"
  turso auth login || true
  WHOAMI="$(turso auth whoami 2>&1 || true)"
fi
if echo "$WHOAMI" | grep -qiE "not logged in|未登录"; then
  echo
  echo "!! 登录未完成。请手动运行下面这条，完成浏览器登录后再重新跑本脚本："
  echo "     turso auth login"
  exit 1
fi
echo "已登录：$WHOAMI"

echo
echo "========== 3/5 · 创建数据库 ai-prompt-helper =========="
if turso db list 2>/dev/null | grep -q "ai-prompt-helper"; then
  echo "数据库 ai-prompt-helper 已存在，跳过创建"
else
  turso db create ai-prompt-helper
fi

echo
echo "========== 4/5 · 获取连接信息 =========="
TURSO_DATABASE_URL="$(turso db show ai-prompt-helper --url)"
TURSO_AUTH_TOKEN="$(turso db tokens create ai-prompt-helper --expiration none 2>/dev/null || turso db tokens create ai-prompt-helper)"
if ! echo "$TURSO_DATABASE_URL" | grep -qiE '^(libsql|https?)://'; then
  echo "!! 获取连接信息失败，拿到的是：$TURSO_DATABASE_URL"
  echo "请确认已登录（turso auth whoami），再重跑本脚本。"
  exit 1
fi
export TURSO_DATABASE_URL TURSO_AUTH_TOKEN
echo "URL：$TURSO_DATABASE_URL"

echo
echo "========== 5/5 · 迁移现有数据到 Turso =========="
node scripts/migrate-to-turso.mjs || echo "（迁移这步失败了 —— 把上面的报错发给 Claude；下面的连接信息仍然有效）"

echo
echo "================================================================"
echo "  完成。把下面两行整段复制，发给 Claude："
echo "================================================================"
echo
echo "TURSO_DATABASE_URL=$TURSO_DATABASE_URL"
echo "TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN"
echo
echo "================================================================"
