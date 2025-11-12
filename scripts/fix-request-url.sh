#!/bin/bash

# 修复所有使用 request.url 的文件
# 将 new URL(request.url) 替换为 request.nextUrl

echo "修复 request.url 使用..."

# 在 src/app/api 目录下查找所有使用 new URL(request.url) 的文件并替换
find src/app/api -name "*.ts" -type f -exec sed -i '' 's/new URL(request\.url)/request.nextUrl/g' {} \;

# 修复特定模式: const { searchParams } = new URL(request.url)
find src/app/api -name "*.ts" -type f -exec sed -i '' 's/const { searchParams } = request\.nextUrl/const searchParams = request.nextUrl.searchParams/g' {} \;

# 修复 requestUrl 变量定义
find src/app/api -name "*.ts" -type f -exec sed -i '' 's/const requestUrl = request\.nextUrl/const requestUrl = request.nextUrl/g' {} \;

echo "✅ 修复完成!"
echo "修复的文件:"
grep -r "request.nextUrl" src/app/api --include="*.ts" -l
