#!/usr/bin/env node

/**
 * 数据库迁移验证脚本
 * 检查 Supabase 和本地数据库的迁移状态
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyDatabaseMigration() {
  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  };

  log('\n════════════════════════════════════════', 'cyan');
  log('   OpenAero 数据库迁移验证', 'cyan');
  log('════════════════════════════════════════\n', 'cyan');

  // 1. 检查环境变量
  log('1️⃣  检查环境变量配置...', 'blue');
  const envChecks = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { name: 'DIRECT_URL', value: process.env.DIRECT_URL },
  ];

  envChecks.forEach(check => {
    const passed = !!check.value;
    report.checks.push({
      category: '环境变量',
      name: check.name,
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? '已设置' : '未设置',
    });
    report.summary.total++;
    if (passed) {
      report.summary.passed++;
      log(`   ✅ ${check.name}: 已设置`, 'green');
    } else {
      report.summary.failed++;
      log(`   ❌ ${check.name}: 未设置`, 'red');
    }
  });

  // 2. 检查本地 SQLite 数据库
  log('\n2️⃣  检查本地 SQLite 数据库...', 'blue');
  const sqlitePath = path.join(__dirname, '../prisma/dev.db');
  const sqliteExists = fs.existsSync(sqlitePath);
  
  if (sqliteExists) {
    const stats = fs.statSync(sqlitePath);
    const sizeMB = (stats.size / 1024).toFixed(2);
    report.checks.push({
      category: '本地数据库',
      name: 'SQLite dev.db',
      status: 'WARNING',
      message: `存在 (${sizeMB} KB) - 可能为遗留文件`,
    });
    report.summary.total++;
    report.summary.warnings++;
    log(`   ⚠️  SQLite 数据库存在: ${sizeMB} KB`, 'yellow');
    log('      这可能是历史遗留文件,建议备份后删除', 'yellow');
  } else {
    report.checks.push({
      category: '本地数据库',
      name: 'SQLite dev.db',
      status: 'PASS',
      message: '不存在 - 已完全迁移',
    });
    report.summary.total++;
    report.summary.passed++;
    log('   ✅ 没有本地 SQLite 数据库', 'green');
  }

  // 3. 测试 Supabase 连接
  log('\n3️⃣  测试 Supabase 连接...', 'blue');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // 测试连接
      const { data, error } = await supabase.from('user_profiles').select('count', { count: 'exact', head: true });
      
      if (error) {
        report.checks.push({
          category: 'Supabase连接',
          name: '数据库连接',
          status: 'FAIL',
          message: `连接失败: ${error.message}`,
        });
        report.summary.total++;
        report.summary.failed++;
        log(`   ❌ Supabase 连接失败: ${error.message}`, 'red');
      } else {
        report.checks.push({
          category: 'Supabase连接',
          name: '数据库连接',
          status: 'PASS',
          message: '连接成功',
        });
        report.summary.total++;
        report.summary.passed++;
        log('   ✅ Supabase 连接成功', 'green');
      }
    } catch (err) {
      report.checks.push({
        category: 'Supabase连接',
        name: '数据库连接',
        status: 'FAIL',
        message: `异常: ${err.message}`,
      });
      report.summary.total++;
      report.summary.failed++;
      log(`   ❌ Supabase 连接异常: ${err.message}`, 'red');
    }
  } else {
    report.checks.push({
      category: 'Supabase连接',
      name: '数据库连接',
      status: 'FAIL',
      message: '缺少环境变量',
    });
    report.summary.total++;
    report.summary.failed++;
    log('   ❌ 无法测试 Supabase 连接: 缺少环境变量', 'red');
  }

  // 4. 检查 Supabase 表
  log('\n4️⃣  检查 Supabase 表结构...', 'blue');
  
  const requiredTables = [
    'user_profiles',
    'creator_profiles',
    'user_addresses',
    'user_sessions',
    'audit_logs',
  ];

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    for (const tableName of requiredTables) {
      try {
        const { error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
        
        if (error) {
          report.checks.push({
            category: 'Supabase表结构',
            name: tableName,
            status: 'FAIL',
            message: `表不存在或无权限: ${error.message}`,
          });
          report.summary.total++;
          report.summary.failed++;
          log(`   ❌ 表 "${tableName}": 不存在或无权限`, 'red');
        } else {
          report.checks.push({
            category: 'Supabase表结构',
            name: tableName,
            status: 'PASS',
            message: '表存在且可访问',
          });
          report.summary.total++;
          report.summary.passed++;
          log(`   ✅ 表 "${tableName}": 存在`, 'green');
        }
      } catch (err) {
        report.checks.push({
          category: 'Supabase表结构',
          name: tableName,
          status: 'FAIL',
          message: `检查异常: ${err.message}`,
        });
        report.summary.total++;
        report.summary.failed++;
        log(`   ❌ 表 "${tableName}": 检查异常`, 'red');
      }
    }
  }

  // 5. 检查 Prisma Schema
  log('\n5️⃣  检查 Prisma Schema 配置...', 'blue');
  
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // 检查 provider
    const providerMatch = schemaContent.match(/provider\s*=\s*"(\w+)"/);
    const provider = providerMatch ? providerMatch[1] : 'unknown';
    
    const isPostgres = provider === 'postgresql';
    report.checks.push({
      category: 'Prisma配置',
      name: 'Schema Provider',
      status: isPostgres ? 'PASS' : 'FAIL',
      message: `Provider: ${provider}`,
    });
    report.summary.total++;
    if (isPostgres) {
      report.summary.passed++;
      log(`   ✅ Prisma Provider: ${provider}`, 'green');
    } else {
      report.summary.failed++;
      log(`   ❌ Prisma Provider: ${provider} (应该是 postgresql)`, 'red');
    }
  } else {
    report.checks.push({
      category: 'Prisma配置',
      name: 'Schema文件',
      status: 'FAIL',
      message: 'schema.prisma 不存在',
    });
    report.summary.total++;
    report.summary.failed++;
    log('   ❌ schema.prisma 文件不存在', 'red');
  }

  // 生成总结
  log('\n════════════════════════════════════════', 'cyan');
  log('   验证总结', 'cyan');
  log('════════════════════════════════════════\n', 'cyan');

  const passRate = ((report.summary.passed / report.summary.total) * 100).toFixed(1);
  
  log(`📊 总检查项: ${report.summary.total}`, 'blue');
  log(`✅ 通过: ${report.summary.passed}`, 'green');
  log(`❌ 失败: ${report.summary.failed}`, 'red');
  log(`⚠️  警告: ${report.summary.warnings}`, 'yellow');
  log(`📈 通过率: ${passRate}%\n`, passRate >= 80 ? 'green' : 'yellow');

  // 迁移状态结论
  if (report.summary.failed === 0 && report.summary.warnings <= 1) {
    log('🎉 数据库已完全迁移到 Supabase!', 'green');
  } else if (report.summary.failed > 0) {
    log('⚠️  数据库迁移未完成,存在错误', 'yellow');
  } else {
    log('✅ 数据库大部分已迁移到 Supabase', 'green');
  }

  // 保存报告
  const reportPath = path.join(__dirname, '../database-migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 详细报告已保存: database-migration-report.json\n`, 'blue');

  return report;
}

// 运行验证
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
verifyDatabaseMigration().catch(console.error);
