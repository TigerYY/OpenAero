#!/usr/bin/env node

/**
 * 修复 console 语句包装后的语法问题
 * 移除多余的分号
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 修复 "};" 后跟分号的问题
    // 匹配模式: if (...) { ... }; 应该是 if (...) { ... }
    content = content.replace(/if\s*\([^)]+\)\s*\{[^}]*\}\s*;/g, (match) => {
      // 检查是否是开发环境检查
      if (match.includes("process.env.NODE_ENV === 'development'")) {
        modified = true;
        return match.replace(/;\s*$/, '');
      }
      return match;
    });

    // 修复 console 语句后缺少分号的问题（在 if 块内）
    content = content.replace(
      /(if\s*\(process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)\s*\{[^}]*console\.(log|error|warn|info|debug)\([^)]+\))\s*([^}]*\})/g,
      (match, p1, p2, p3) => {
        // 检查 console 语句后是否有分号
        if (!p1.endsWith(';') && !p1.endsWith(');')) {
          modified = true;
          return p1 + ';' + p3;
        }
        return match;
      }
    );

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return false;
  }
}

function findFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const filePath = path.join(dir, item);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'out', 'dist', 'coverage', '.git'].includes(item)) {
        files.push(...findFiles(filePath));
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(item) && !/\.(test|spec)\./.test(item)) {
      files.push(filePath);
    }
  }

  return files;
}

function main() {
  const srcDir = path.join(process.cwd(), 'src');
  const files = findFiles(srcDir);
  
  console.log(`找到 ${files.length} 个文件`);
  
  let fixed = 0;
  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
    }
  }
  
  console.log(`修复了 ${fixed} 个文件的语法问题`);
}

if (require.main === module) {
  main();
}

module.exports = { fixFile };

