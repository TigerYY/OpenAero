#!/bin/bash

# OpenAero 端口清理脚本
# 用于清理可能占用端口的进程，避免端口冲突

echo "🧹 开始清理端口..."

# 定义需要清理的端口列表
PORTS=(3000 3001 3002 3003 3004 3005)

# 清理函数
clean_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    
    if [ ! -z "$pid" ]; then
        echo "🔍 发现端口 $port 被进程 $pid 占用"
        
        # 检查进程名称
        local process_name=$(ps -p $pid -o comm= 2>/dev/null)
        if [ ! -z "$process_name" ]; then
            echo "📋 进程名称: $process_name"
        fi
        
        # 尝试优雅关闭
        echo "🔄 尝试优雅关闭进程 $pid..."
        kill -TERM $pid 2>/dev/null
        
        # 等待2秒
        sleep 2
        
        # 检查进程是否还在运行
        if kill -0 $pid 2>/dev/null; then
            echo "⚠️  进程 $pid 仍在运行，强制关闭..."
            kill -KILL $pid 2>/dev/null
            sleep 1
        fi
        
        # 最终检查
        if kill -0 $pid 2>/dev/null; then
            echo "❌ 无法关闭进程 $pid"
            return 1
        else
            echo "✅ 端口 $port 已释放"
        fi
    else
        echo "✅ 端口 $port 未被占用"
    fi
}

# 清理所有端口
for port in "${PORTS[@]}"; do
    clean_port $port
done

echo "🎉 端口清理完成！"

# 显示当前端口使用情况
echo ""
echo "📊 当前端口使用情况:"
for port in "${PORTS[@]}"; do
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "  ❌ 端口 $port: 被进程 $pid 占用"
    else
        echo "  ✅ 端口 $port: 空闲"
    fi
done
