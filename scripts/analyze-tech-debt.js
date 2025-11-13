#!/usr/bin/env node

/**
 * 技术债务标记分析脚本
 * 扫描并分类所有TODO/FIXME标记
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const markers = ['TODO', 'FIXME', 'XXX', 'HACK', 'BUG'];

const results = {
  completed: [],
  needsImplementation: [],
  needsFix: [],
  needsIssue: [],
  unclear: []
};

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(srcDir, filePath);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    markers.forEach(marker => {
      const regex = new RegExp(`\\b${marker}\\b`, 'i');
      if (regex.test(line)) {
        const match = line.match(new RegExp(`${marker}[\\s:]*([^\\n]*)`, 'i'));
        const comment = match ? match[1].trim() : '';
        
        const item = {
          file: relativePath,
          line: lineNum,
          marker: marker,
          comment: comment,
          code: line.trim()
        };

        // 分类标记
        if (comment.toLowerCase().includes('done') || 
            comment.toLowerCase().includes('completed') ||
            comment.toLowerCase().includes('完成')) {
          results.completed.push(item);
        } else if (comment.toLowerCase().includes('implement') ||
                   comment.toLowerCase().includes('add') ||
                   comment.toLowerCase().includes('实现') ||
                   comment.toLowerCase().includes('添加')) {
          results.needsImplementation.push(item);
        } else if (comment.toLowerCase().includes('fix') ||
                   comment.toLowerCase().includes('修复') ||
                   comment.toLowerCase().includes('bug')) {
          results.needsFix.push(item);
        } else if (comment.toLowerCase().includes('issue') ||
                   comment.toLowerCase().includes('ticket')) {
          results.needsIssue.push(item);
        } else {
          results.unclear.push(item);
        }
      }
    });
  });
}

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (item === 'node_modules' || item === '.next' || item === '__tests__') continue;
      scanDirectory(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
      scanFile(fullPath);
    }
  }
}

// 扫描
console.log('🔍 扫描技术债务标记...\n');
scanDirectory(srcDir);

// 输出结果
console.log('📊 技术债务标记分析结果:\n');

console.log(`✅ 已完成标记: ${results.completed.length}`);
if (results.completed.length > 0) {
  console.log('   (可以删除这些标记)');
  results.completed.slice(0, 5).forEach(item => {
    console.log(`   - ${item.file}:${item.line} - ${item.comment || '无注释'}`);
  });
  if (results.completed.length > 5) {
    console.log(`   ... 还有 ${results.completed.length - 5} 个`);
  }
}

console.log(`\n🔧 需要实现的标记: ${results.needsImplementation.length}`);
if (results.needsImplementation.length > 0) {
  results.needsImplementation.slice(0, 5).forEach(item => {
    console.log(`   - ${item.file}:${item.line} - ${item.comment || '无注释'}`);
  });
  if (results.needsImplementation.length > 5) {
    console.log(`   ... 还有 ${results.needsImplementation.length - 5} 个`);
  }
}

console.log(`\n🐛 需要修复的标记: ${results.needsFix.length}`);
if (results.needsFix.length > 0) {
  results.needsFix.slice(0, 5).forEach(item => {
    console.log(`   - ${item.file}:${item.line} - ${item.comment || '无注释'}`);
  });
  if (results.needsFix.length > 5) {
    console.log(`   ... 还有 ${results.needsFix.length - 5} 个`);
  }
}

console.log(`\n📋 需要转换为Issue的标记: ${results.needsIssue.length}`);
if (results.needsIssue.length > 0) {
  results.needsIssue.slice(0, 5).forEach(item => {
    console.log(`   - ${item.file}:${item.line} - ${item.comment || '无注释'}`);
  });
  if (results.needsIssue.length > 5) {
    console.log(`   ... 还有 ${results.needsIssue.length - 5} 个`);
  }
}

console.log(`\n❓ 不明确的标记: ${results.unclear.length}`);
if (results.unclear.length > 0) {
  results.unclear.slice(0, 5).forEach(item => {
    console.log(`   - ${item.file}:${item.line} - ${item.comment || '无注释'}`);
  });
  if (results.unclear.length > 5) {
    console.log(`   ... 还有 ${results.unclear.length - 5} 个`);
  }
}

console.log(`\n📈 总计: ${results.completed.length + results.needsImplementation.length + results.needsFix.length + results.needsIssue.length + results.unclear.length} 个标记`);

// 保存详细报告
const report = {
  summary: {
    total: results.completed.length + results.needsImplementation.length + results.needsFix.length + results.needsIssue.length + results.unclear.length,
    completed: results.completed.length,
    needsImplementation: results.needsImplementation.length,
    needsFix: results.needsFix.length,
    needsIssue: results.needsIssue.length,
    unclear: results.unclear.length
  },
  details: {
    completed: results.completed,
    needsImplementation: results.needsImplementation,
    needsFix: results.needsFix,
    needsIssue: results.needsIssue,
    unclear: results.unclear
  }
};

fs.writeFileSync(
  path.join(process.cwd(), 'tech-debt-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n💾 详细报告已保存到: tech-debt-report.json');

