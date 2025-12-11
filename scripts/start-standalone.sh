#!/bin/bash
# 启动/验证 Next.js standalone 应用的通用脚本
# 用法：
#   bash scripts/start-standalone.sh            # 启动服务（用于 PM2）
#   bash scripts/start-standalone.sh --verify   # 仅验证关键静态资源

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/.next/standalone"
ENV_FILE="$ROOT_DIR/.env.production"

if [ ! -d "$APP_DIR" ]; then
  echo "❌ 未找到 standalone 目录：$APP_DIR"
  exit 1
fi

# 加载环境变量
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "⚠️  未找到 $ENV_FILE，继续启动但请确认环境变量"
fi

PORT="${PORT:-3000}"
LOGO_URL="${LOGO_URL:-http://localhost:${PORT}/images/openaero-logo-trimmed.png}"
CHUNK_URL="${CHUNK_URL:-http://localhost:${PORT}/_next/static/chunks/main.js}"

verify_assets() {
  echo "验证静态资源..."
  if curl -fI "$LOGO_URL" >/dev/null 2>&1 && curl -fI "$CHUNK_URL" >/dev/null 2>&1; then
    echo "✅ 静态资源校验通过"
    return 0
  else
    echo "❌ 静态资源校验失败"
    return 1
  fi
}

if [ "$1" = "--verify" ]; then
  verify_assets
  exit $?
fi

cd "$APP_DIR"
echo "启动 Next.js standalone，端口：$PORT"
exec node server.js

