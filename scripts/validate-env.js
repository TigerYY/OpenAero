#!/usr/bin/env node

/**
 * OpenAero 环境验证脚本
 * 验证开发环境配置和依赖项
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 验证结果
const validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings: [],
};

// 检查文件是否存在
function checkFileExists(filePath, description) {
  const fullPath = path.resolve(filePath);
  if (fs.existsSync(fullPath)) {
    log('green', `✅ ${description}: ${filePath}`);
    validationResults.passed++;
    return true;
  } else {
    log('red', `❌ ${description}: ${filePath} (文件不存在)`);
    validationResults.failed++;
    validationResults.errors.push(`${description} 文件不存在: ${filePath}`);
    return false;
  }
}

// 检查目录是否存在
function checkDirectoryExists(dirPath, description) {
  const fullPath = path.resolve(dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    log('green', `✅ ${description}: ${dirPath}`);
    validationResults.passed++;
    return true;
  } else {
    log('red', `❌ ${description}: ${dirPath} (目录不存在)`);
    validationResults.failed++;
    validationResults.errors.push(`${description} 目录不存在: ${dirPath}`);
    return false;
  }
}

// 检查Node.js版本
function checkNodeVersion() {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion >= 18) {
      log('green', `✅ Node.js 版本: ${version} (>= 18.0.0)`);
      validationResults.passed++;
      return true;
    } else {
      log('red', `❌ Node.js 版本: ${version} (需要 >= 18.0.0)`);
      validationResults.failed++;
      validationResults.errors.push(`Node.js 版本过低: ${version}，需要 >= 18.0.0`);
      return false;
    }
  } catch (error) {
    log('red', `❌ 无法检查 Node.js 版本: ${error.message}`);
    validationResults.failed++;
    validationResults.errors.push(`无法检查 Node.js 版本: ${error.message}`);
    return false;
  }
}

// 检查npm版本
function checkNpmVersion() {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(version.split('.')[0]);
    
    if (majorVersion >= 9) {
      log('green', `✅ npm 版本: ${version} (>= 9.0.0)`);
      validationResults.passed++;
      return true;
    } else {
      log('red', `❌ npm 版本: ${version} (需要 >= 9.0.0)`);
      validationResults.failed++;
      validationResults.errors.push(`npm 版本过低: ${version}，需要 >= 9.0.0`);
      return false;
    }
  } catch (error) {
    log('red', `❌ 无法检查 npm 版本: ${error.message}`);
    validationResults.failed++;
    validationResults.errors.push(`无法检查 npm 版本: ${error.message}`);
    return false;
  }
}

// 检查依赖项是否安装
function checkDependencies() {
  const packageJsonPath = path.resolve('package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log('red', '❌ package.json 文件不存在');
    validationResults.failed++;
    validationResults.errors.push('package.json 文件不存在');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const nodeModulesPath = path.resolve('node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log('red', '❌ node_modules 目录不存在，请运行 npm install');
    validationResults.failed++;
    validationResults.errors.push('node_modules 目录不存在，请运行 npm install');
    return false;
  }

  // 检查关键依赖
  const criticalDeps = [
    'next',
    'react',
    'react-dom',
    'typescript',
    '@types/node',
    '@types/react',
    '@types/react-dom',
  ];

  let allDepsInstalled = true;
  for (const dep of criticalDeps) {
    const depPath = path.resolve('node_modules', dep);
    if (fs.existsSync(depPath)) {
      log('green', `✅ 依赖项: ${dep}`);
      validationResults.passed++;
    } else {
      log('red', `❌ 依赖项: ${dep} (未安装)`);
      validationResults.failed++;
      validationResults.errors.push(`关键依赖项未安装: ${dep}`);
      allDepsInstalled = false;
    }
  }

  return allDepsInstalled;
}

// 检查TypeScript配置
function checkTypeScriptConfig() {
  const tsconfigPath = path.resolve('tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    log('red', '❌ tsconfig.json 文件不存在');
    validationResults.failed++;
    validationResults.errors.push('tsconfig.json 文件不存在');
    return false;
  }

  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    
    // 检查关键配置
    const requiredConfigs = [
      'compilerOptions.strict',
      'compilerOptions.target',
      'compilerOptions.lib',
      'compilerOptions.jsx',
    ];

    let configValid = true;
    for (const configPath of requiredConfigs) {
      const keys = configPath.split('.');
      let current = tsconfig;
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          log('red', `❌ TypeScript 配置缺失: ${configPath}`);
          validationResults.failed++;
          validationResults.errors.push(`TypeScript 配置缺失: ${configPath}`);
          configValid = false;
          break;
        }
      }
    }

    if (configValid) {
      log('green', '✅ TypeScript 配置有效');
      validationResults.passed++;
    }

    return configValid;
  } catch (error) {
    log('red', `❌ TypeScript 配置解析失败: ${error.message}`);
    validationResults.failed++;
    validationResults.errors.push(`TypeScript 配置解析失败: ${error.message}`);
    return false;
  }
}

// 检查Next.js配置
function checkNextConfig() {
  const nextConfigPath = path.resolve('next.config.js');
  if (!fs.existsSync(nextConfigPath)) {
    log('red', '❌ next.config.js 文件不存在');
    validationResults.failed++;
    validationResults.errors.push('next.config.js 文件不存在');
    return false;
  }

  try {
    // 尝试加载配置文件
    require(nextConfigPath);
    log('green', '✅ Next.js 配置有效');
    validationResults.passed++;
    return true;
  } catch (error) {
    log('red', `❌ Next.js 配置加载失败: ${error.message}`);
    validationResults.failed++;
    validationResults.errors.push(`Next.js 配置加载失败: ${error.message}`);
    return false;
  }
}

// 检查环境变量
function checkEnvironmentVariables() {
  const envExamplePath = path.resolve('env.example');
  if (!fs.existsSync(envExamplePath)) {
    log('yellow', '⚠️  env.example 文件不存在');
    validationResults.warnings++;
    validationResults.warnings.push('env.example 文件不存在');
    return false;
  }

  const envLocalPath = path.resolve('.env.local');
  if (!fs.existsSync(envLocalPath)) {
    log('yellow', '⚠️  .env.local 文件不存在，将使用默认配置');
    validationResults.warnings++;
    validationResults.warnings.push('.env.local 文件不存在，将使用默认配置');
  } else {
    log('green', '✅ .env.local 文件存在');
    validationResults.passed++;
  }

  return true;
}

// 检查端口可用性
function checkPortAvailability() {
  const ports = [3000, 3001, 3002];
  let availablePorts = [];

  for (const port of ports) {
    try {
      execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
      log('yellow', `⚠️  端口 ${port} 被占用`);
      validationResults.warnings++;
      validationResults.warnings.push(`端口 ${port} 被占用`);
    } catch (error) {
      log('green', `✅ 端口 ${port} 可用`);
      availablePorts.push(port);
      validationResults.passed++;
    }
  }

  if (availablePorts.length === 0) {
    log('red', '❌ 没有可用端口');
    validationResults.failed++;
    validationResults.errors.push('没有可用端口');
    return false;
  }

  return true;
}

// 运行TypeScript类型检查
function runTypeScriptCheck() {
  try {
    log('cyan', '🔍 运行 TypeScript 类型检查...');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    log('green', '✅ TypeScript 类型检查通过');
    validationResults.passed++;
    return true;
  } catch (error) {
    log('red', '❌ TypeScript 类型检查失败');
    validationResults.failed++;
    validationResults.errors.push('TypeScript 类型检查失败');
    return false;
  }
}

// 运行ESLint检查
function runESLintCheck() {
  try {
    log('cyan', '🔍 运行 ESLint 检查...');
    execSync('npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0', { stdio: 'pipe' });
    log('green', '✅ ESLint 检查通过');
    validationResults.passed++;
    return true;
  } catch (error) {
    log('red', '❌ ESLint 检查失败');
    validationResults.failed++;
    validationResults.errors.push('ESLint 检查失败');
    return false;
  }
}

// 主验证函数
async function main() {
  log('magenta', '🔍 开始环境验证...');
  log('cyan', '');

  // 基础环境检查
  log('blue', '📋 基础环境检查:');
  checkNodeVersion();
  checkNpmVersion();
  log('');

  // 项目结构检查
  log('blue', '📁 项目结构检查:');
  checkFileExists('package.json', 'package.json');
  checkFileExists('tsconfig.json', 'tsconfig.json');
  checkFileExists('next.config.js', 'next.config.js');
  checkFileExists('tailwind.config.js', 'tailwind.config.js');
  checkFileExists('.eslintrc.json', '.eslintrc.json');
  checkFileExists('.prettierrc', '.prettierrc');
  checkDirectoryExists('src', 'src 目录');
  checkDirectoryExists('public', 'public 目录');
  checkDirectoryExists('scripts', 'scripts 目录');
  log('');

  // 依赖项检查
  log('blue', '📦 依赖项检查:');
  checkDependencies();
  log('');

  // 配置文件检查
  log('blue', '⚙️  配置文件检查:');
  checkTypeScriptConfig();
  checkNextConfig();
  checkEnvironmentVariables();
  log('');

  // 端口检查
  log('blue', '🌐 端口检查:');
  checkPortAvailability();
  log('');

  // 代码质量检查
  log('blue', '🔍 代码质量检查:');
  runTypeScriptCheck();
  runESLintCheck();
  log('');

  // 显示结果摘要
  log('magenta', '📊 验证结果摘要:');
  log('green', `✅ 通过: ${validationResults.passed}`);
  log('red', `❌ 失败: ${validationResults.failed}`);
  log('yellow', `⚠️  警告: ${validationResults.warnings}`);

  if (validationResults.errors.length > 0) {
    log('red', '');
    log('red', '❌ 错误详情:');
    validationResults.errors.forEach(error => {
      log('red', `  • ${error}`);
    });
  }

  if (validationResults.warnings.length > 0) {
    log('yellow', '');
    log('yellow', '⚠️  警告详情:');
    validationResults.warnings.forEach(warning => {
      log('yellow', `  • ${warning}`);
    });
  }

  // 退出状态
  if (validationResults.failed > 0) {
    log('red', '');
    log('red', '❌ 环境验证失败，请修复上述错误后重试');
    process.exit(1);
  } else {
    log('green', '');
    log('green', '🎉 环境验证通过！项目已准备好进行开发');
    process.exit(0);
  }
}

// 运行主函数
main().catch(error => {
  log('red', `❌ 验证过程出错: ${error.message}`);
  process.exit(1);
});