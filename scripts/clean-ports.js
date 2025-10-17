#!/usr/bin/env node

/**
 * OpenAero 端口清理脚本 (跨平台)
 * 用于清理可能占用端口的进程，避免端口冲突
 */

const { exec, spawn } = require('child_process');
const os = require('os');

// 需要清理的端口列表
const PORTS = [3000, 3001, 3002, 3003, 3004, 3005];

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

// 获取进程ID
function getProcessId(port) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -ti:${port}`;
    }
    
    exec(command, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }
      
      if (platform === 'win32') {
        const lines = stdout.trim().split('\n');
        if (lines.length > 0) {
          const parts = lines[0].trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          resolve(pid);
        } else {
          resolve(null);
        }
      } else {
        const pid = stdout.trim();
        resolve(pid || null);
      }
    });
  });
}

// 获取进程名称
function getProcessName(pid) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = `tasklist /FI "PID eq ${pid}" /FO CSV`;
    } else {
      command = `ps -p ${pid} -o comm=`;
    }
    
    exec(command, (error, stdout) => {
      if (error) {
        resolve('Unknown');
        return;
      }
      
      if (platform === 'win32') {
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const processName = lines[1].split(',')[0].replace(/"/g, '');
          resolve(processName);
        } else {
          resolve('Unknown');
        }
      } else {
        resolve(stdout.trim() || 'Unknown');
      }
    });
  });
}

// 关闭进程
function killProcess(pid) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = `taskkill /PID ${pid} /F`;
    } else {
      command = `kill -TERM ${pid}`;
    }
    
    exec(command, (error) => {
      if (error) {
        // 如果优雅关闭失败，尝试强制关闭
        if (platform === 'win32') {
          exec(`taskkill /PID ${pid} /F /T`, (error2) => {
            resolve(!error2);
          });
        } else {
          exec(`kill -KILL ${pid}`, (error2) => {
            resolve(!error2);
          });
        }
      } else {
        resolve(true);
      }
    });
  });
}

// 检查进程是否还在运行
function isProcessRunning(pid) {
  return new Promise((resolve) => {
    const platform = os.platform();
    let command;
    
    if (platform === 'win32') {
      command = `tasklist /FI "PID eq ${pid}"`;
    } else {
      command = `kill -0 ${pid}`;
    }
    
    exec(command, (error) => {
      resolve(platform === 'win32' ? !error : !!error);
    });
  });
}

// 清理单个端口
async function cleanPort(port) {
  log('cyan', `🔍 检查端口 ${port}...`);
  
  const pid = await getProcessId(port);
  
  if (!pid) {
    log('green', `✅ 端口 ${port} 未被占用`);
    return true;
  }
  
  log('yellow', `🔍 发现端口 ${port} 被进程 ${pid} 占用`);
  
  const processName = await getProcessName(pid);
  log('blue', `📋 进程名称: ${processName}`);
  
  log('yellow', `🔄 尝试关闭进程 ${pid}...`);
  const success = await killProcess(pid);
  
  if (success) {
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检查进程是否还在运行
    const stillRunning = await isProcessRunning(pid);
    
    if (stillRunning) {
      log('red', `❌ 无法关闭进程 ${pid}`);
      return false;
    } else {
      log('green', `✅ 端口 ${port} 已释放`);
      return true;
    }
  } else {
    log('red', `❌ 关闭进程 ${pid} 失败`);
    return false;
  }
}

// 主函数
async function main() {
  log('magenta', '🧹 开始清理端口...');
  
  let allSuccess = true;
  
  for (const port of PORTS) {
    const success = await cleanPort(port);
    if (!success) {
      allSuccess = false;
    }
  }
  
  log('magenta', '🎉 端口清理完成！');
  
  // 显示当前端口使用情况
  log('cyan', '');
  log('cyan', '📊 当前端口使用情况:');
  
  for (const port of PORTS) {
    const pid = await getProcessId(port);
    if (pid) {
      log('red', `  ❌ 端口 ${port}: 被进程 ${pid} 占用`);
    } else {
      log('green', `  ✅ 端口 ${port}: 空闲`);
    }
  }
  
  if (allSuccess) {
    log('green', '');
    log('green', '🎊 所有端口清理成功！');
    process.exit(0);
  } else {
    log('red', '');
    log('red', '⚠️  部分端口清理失败，请手动检查');
    process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  log('red', `❌ 脚本执行失败: ${error.message}`);
  process.exit(1);
});
