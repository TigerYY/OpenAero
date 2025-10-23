#!/bin/bash

# -----------------------
# Codex Project Initializer
# Supports: macOS, Codex CLI
# Purpose: Enable network access + run specify init
# -----------------------

set -e

## 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

## 日志函数
log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

## 检查 codex 是否安装
if ! command -v codex &> /dev/null; then
  log_error "Codex CLI 未安装。请先安装 Codex CLI 工具。"
fi

## 检查 Codex 是否已启用网络权限
NETWORK_FLAG=$(codex config get network_access 2>/dev/null || echo "restricted")

if [[ "$NETWORK_FLAG" == "restricted" ]]; then
  log_warn "当前 Codex 会话限制网络访问（network_access=restricted）"

  read -p "👉 是否启用联网功能？（y/n）: " CONFIRM
  if [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]]; then
    log_info "🛠 由于 Codex CLI 不支持 config set，请手动重启 Codex CLI："
    echo
    echo "▶ 推荐命令：codex start --network_access=enabled"
    echo "▶ 或修改配置文件加入：\"network_access\": \"enabled\""
    echo
    log_info "💡 重启后再次执行：./codex-init.sh"
    exit 0
  else
    log_error "未开启联网权限，无法初始化 specify，请手动批准或修改配置。"
  fi
else
  log_info "✅ Codex 已启用网络访问"
fi

## 初始化 Git 项目（如未初始化）
if [ ! -d ".git" ]; then
  log_info "初始化 Git 仓库..."
  git init
fi

## 检查 Node / Bun 环境
if command -v bunx &> /dev/null; then
  INIT_CMD="bunx specify init --here --ai codex --force"
elif command -v npx &> /dev/null; then
  INIT_CMD="npx specify init --here --ai codex --force"
else
  log_error "未找到 npx 或 bunx，无法继续。请先安装 Node.js 或 Bun。"
fi

## 执行初始化
log_info "开始执行初始化命令：$INIT_CMD"
eval "$INIT_CMD"

log_info "🎉 初始化完成！你现在可以查看 README.md 等文件。"
