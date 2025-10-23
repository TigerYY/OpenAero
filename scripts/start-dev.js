#!/usr/bin/env node

/**
 * OpenAero 简化启动脚本
 * 使用标准的相对路径，依赖正确的工作目录
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// 验证项目目录
function validateProjectDirectory() {
  const currentDir = process.cwd();
  log('cyan', `📍 当前工作目录: ${currentDir}`);
  
  // 检查必要文件
  const requiredFiles = ['package.json', 'next.config.js', 'tsconfig.json'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      log('red', `❌ 缺少必要文件: ${file}`);
      log('red', `❌ 请确保在项目根目录下运行此脚本`);
      log('yellow', `💡 正确的项目目录应包含: package.json, next.config.js, tsconfig.json`);
      process.exit(1);
    }
  }
  
  log('green', `✅ 项目目录验证通过`);
}

// 检查端口
function checkPort(port) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti:${port}`;
    
    exec(command, (error, stdout) => {
      if (error) {
        resolve({ occupied: false, pid: null });
        return;
      }
      
      const pid = process.platform === 'win32' 
        ? stdout.trim().split(/\s+/).pop()
        : stdout.trim();
      
      resolve({ occupied: !!pid, pid: pid || null });
    });
  });
}

// 清理端口
async function cleanupPort(port) {
  log('cyan', `🔍 检查端口 ${port} 状态...`);
  
  const portStatus = await checkPort(port);
  
  if (!portStatus.occupied) {
    log('green', `✅ 端口 ${port} 空闲`);
    return true;
  }
  
  log('yellow', `⚠️  端口 ${port} 被进程 ${portStatus.pid} 占用`);
  
  // 杀死进程 - 修复多进程ID问题
  const pids = portStatus.pid.split('\n').filter(pid => pid.trim());
  
  for (const pid of pids) {
    const killCommand = process.platform === 'win32'
      ? `taskkill /PID ${pid} /F`
      : `kill -9 ${pid}`;
    
    try {
      await new Promise((resolve, reject) => {
        exec(killCommand, (error) => {
          if (error) {
            log('yellow', `⚠️  进程 ${pid} 可能已经退出`);
            resolve();
          } else {
            log('green', `✅ 成功终止进程 ${pid}`);
            resolve();
          }
        });
      });
    } catch (err) {
      log('yellow', `⚠️  进程 ${pid} 清理失败，继续尝试其他进程`);
    }
  }
  
  // 等待进程完全退出
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 再次检查端口
  const finalCheck = await checkPort(port);
  if (!finalCheck.occupied) {
    log('green', `✅ 端口 ${port} 清理成功`);
    return true;
  } else {
    log('red', `❌ 端口 ${port} 仍被占用`);
    return false;
  }
}

// 启动开发服务器
function startDevServer() {
  log('blue', `🚀 启动Next.js开发服务器 (端口 ${PORT})...`);
  
  const devProcess = spawn('npx', ['next', 'dev', '-p', PORT.toString()], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: PORT
    }
  });
  
  devProcess.on('error', (error) => {
    log('red', `❌ 启动失败: ${error.message}`);
    process.exit(1);
  });
  
  devProcess.on('exit', (code) => {
    if (code !== 0) {
      log('red', `❌ 服务器异常退出，代码: ${code}`);
      process.exit(code);
    }
  });
  
  // 优雅退出处理
  const cleanup = () => {
    log('yellow', '\n🛑 正在关闭开发服务器...');
    devProcess.kill('SIGTERM');
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// 主函数
async function main() {
  log('magenta', '🚀 OpenAero 开发服务器启动');
  log('cyan', '=====================================');
  log('blue', '📋 功能: 自动清理端口 + 启动Next.js开发服务器');
  
  try {
    // 验证项目目录
    validateProjectDirectory();
    
    // 清理端口
    const cleanupSuccess = await cleanupPort(PORT);
    if (!cleanupSuccess) {
      log('red', '❌ 端口清理失败');
      process.exit(1);
    }
    
    // 启动服务器
    startDevServer();
    
  } catch (error) {
    log('red', `❌ 启动失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
main();
