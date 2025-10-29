#!/bin/bash

# 查找项目中的大型文件和目录
# 用于识别可能占用过多空间的文件

set -e

echo "🔍 项目大型文件分析工具"
echo "================================"
echo ""

# 配置
MIN_SIZE=${1:-500k}  # 默认查找大于 500KB 的文件
TOP_N=${2:-20}       # 默认显示前 20 个

echo "📋 分析配置:"
echo "   - 最小文件大小: $MIN_SIZE"
echo "   - 显示数量: $TOP_N"
echo ""

# 排除的目录
EXCLUDE_DIRS="node_modules .git .next coverage dist build out .cache"

echo "=== 1. 大型文件（> $MIN_SIZE）==="
echo ""
find . -type f -size +$MIN_SIZE \
  $(for dir in $EXCLUDE_DIRS; do echo -not -path "./$dir/*"; done) \
  -exec ls -lh {} \; 2>/dev/null | \
  awk '{printf "%10s %s\n", $5, $9}' | \
  sort -hr | \
  head -$TOP_N

echo ""
echo "=== 2. 目录大小统计（Top $TOP_N）==="
echo ""
du -sh */ .*/ 2>/dev/null | \
  grep -vE "^\..*/\s*$|^node_modules|^\.git" | \
  sort -hr | \
  head -$TOP_N

echo ""
echo "=== 3. 常见大型目录检查 ==="
echo ""
for dir in node_modules .next .git backup backups logs uploads coverage dist build out .cache; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" 2>/ anything | cut -f1)
    file_count=$(find "$dir" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "$dir: $size ($file_count files)"
  fi
done

echo ""
echo "=== 4. 大型图片文件（> 100KB）==="
echo ""
find . -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.svg" -o -name "*.webp" \) \
  $(for dir in $EXCLUDE_DIRS; do echo -not -path "./$dir/*"; done) \
  -size +100k -exec ls -lh {} \; 2>/dev/null | \
  awk '{printf "%10s %s\n", $5, $9}' | \
  sort -hr | \
  head -10

echo ""
echo "=== 5. 数据库文件 ==="
echo ""
find . -type f \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" -o -name "*.db-shm" -o -name "*.db-wal" \) \
  $(for dir in $EXCLUDE_DIRS; do echo -not -path "./$dir/*"; done) \
  -exec ls -lh {} \; 2>/dev/null | \
  awk '{printf "%10s %s\n", $5, $9}' || echo "  无数据库文件"

echo ""
echo "=== 6. 备份和压缩文件 ==="
echo ""
find . -type f \( -name "*.tar.gz" -o -name "*.zip" -o -name "*.tar" -o -name "*.gz" -o -name "*.bz2" -o -name "*.7z" \) \
  $(for dir in $EXCLUDE_DIRS; do echo -not -path "./$dir/*"; done) \
  -exec ls -lh {} \; 2>/dev/null | \
  awk '{printf "%10s %s\n", $5, $9}' | \
  head -10 || echo "  无备份/压缩文件"

echo ""
echo "=== 7. 日志文件（> 50KB）==="
echo ""
find . -type f -name "*.log" -size +50k \
  $(for dir in $EXCLUDE_DIRS; do echo -not -path "./$dir/*"; done) \
  -exec ls -lh {} \; 2>/dev/null | \
  awk '{printf "%10s %s\n", $5, $9}' | \
  sort -hr | \
  head -10 || echo "  无大型日志文件"

echo ""
echo "=== 8. 总体统计 ==="
echo ""
total_size=$(du -sh . 2>/dev/null | cut -f1)
echo "项目总大小: $total_size"
echo ""

# 按文件类型统计
echo "按文件类型统计（> 100KB）:"
echo ""
find . -type f -size +100k \
  $(for dir in $EXCLUDE_DIRS; do echo -not -path "./$dir/*"; done) \
  -exec sh -c 'echo "$(basename "$1" | sed "s/.*\.//" || echo "noext")"' _ {} \; 2>/dev/null | \
  sort | uniq -c | sort -rn | head -10

echo ""
echo "✅ 分析完成"
echo ""
echo "💡 优化建议:"
echo "   - 大图片应考虑压缩或使用 CDN"
echo "   - 数据库文件应定期清理"
echo "   - 日志文件应配置轮转"
echo "   - 备份文件应移到专用存储"

