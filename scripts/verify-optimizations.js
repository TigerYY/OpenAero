#!/usr/bin/env node

/**
 * 验证数据库优化效果
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

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

async function checkRLSPolicies() {
  log('\n📋 检查RLS策略...', 'cyan');
  log('='.repeat(80), 'cyan');
  
  try {
    const policies = await prisma.$queryRaw`
      SELECT 
        tablename,
        COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY policy_count DESC, tablename;
    `;
    
    if (policies.length === 0) {
      log('⚠️  未找到RLS策略', 'yellow');
      return false;
    }
    
    log(`✅ 找到 ${policies.length} 个表配置了RLS策略`, 'green');
    policies.forEach(p => {
      log(`   - ${p.tablename}: ${p.policy_count} 个策略`, 'blue');
    });
    
    return true;
  } catch (error) {
    log(`❌ 检查RLS策略失败: ${error.message}`, 'red');
    return false;
  }
}

async function checkIndexes() {
  log('\n📊 检查数据库索引...', 'cyan');
  log('='.repeat(80), 'cyan');
  
  try {
    const indexes = await prisma.$queryRaw`
      SELECT 
        tablename,
        COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      GROUP BY tablename
      ORDER BY index_count DESC, tablename;
    `;
    
    if (indexes.length === 0) {
      log('⚠️  未找到自定义索引', 'yellow');
      return false;
    }
    
    const totalIndexes = indexes.reduce((sum, idx) => sum + Number(idx.index_count), 0);
    log(`✅ 找到 ${totalIndexes} 个自定义索引，分布在 ${indexes.length} 个表`, 'green');
    
    // 显示索引最多的前5个表
    log('\n   索引最多的表:', 'blue');
    indexes.slice(0, 5).forEach(idx => {
      log(`   - ${idx.tablename}: ${idx.index_count} 个索引`, 'blue');
    });
    
    return true;
  } catch (error) {
    log(`❌ 检查索引失败: ${error.message}`, 'red');
    return false;
  }
}

async function checkOptimizedFunctions() {
  log('\n⚡ 检查优化函数...', 'cyan');
  log('='.repeat(80), 'cyan');
  
  try {
    const functions = await prisma.$queryRaw`
      SELECT 
        proname as function_name,
        pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname IN (
          'get_published_solutions',
          'get_popular_solutions',
          'get_creator_solution_stats',
          'get_active_creators',
          'get_user_orders',
          'get_system_stats',
          'search_solutions',
          'refresh_materialized_views'
        )
      ORDER BY proname;
    `;
    
    if (functions.length === 0) {
      log('⚠️  未找到优化函数', 'yellow');
      return false;
    }
    
    log(`✅ 找到 ${functions.length} 个优化函数`, 'green');
    functions.forEach(fn => {
      log(`   - ${fn.function_name}()`, 'blue');
    });
    
    return true;
  } catch (error) {
    log(`❌ 检查优化函数失败: ${error.message}`, 'red');
    return false;
  }
}

async function checkMaterializedViews() {
  log('\n📈 检查物化视图...', 'cyan');
  log('='.repeat(80), 'cyan');
  
  try {
    const views = await prisma.$queryRaw`
      SELECT 
        schemaname,
        matviewname,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
      FROM pg_matviews
      WHERE schemaname = 'public'
      ORDER BY matviewname;
    `;
    
    if (views.length === 0) {
      log('⚠️  未找到物化视图', 'yellow');
      return false;
    }
    
    log(`✅ 找到 ${views.length} 个物化视图`, 'green');
    views.forEach(v => {
      log(`   - ${v.matviewname} (${v.size})`, 'blue');
    });
    
    return true;
  } catch (error) {
    log(`❌ 检查物化视图失败: ${error.message}`, 'red');
    return false;
  }
}

async function testQueryPerformance() {
  log('\n⏱️  测试查询性能...', 'cyan');
  log('='.repeat(80), 'cyan');
  
  const tests = [];
  
  // 测试1: 基础查询
  try {
    const start1 = Date.now();
    await prisma.solution.findMany({
      where: { status: 'PUBLISHED' },
      take: 10,
    });
    const duration1 = Date.now() - start1;
    tests.push({ name: '基础查询 (10条)', duration: duration1, success: true });
    log(`   ✅ 基础查询: ${duration1}ms`, duration1 < 100 ? 'green' : 'yellow');
  } catch (error) {
    tests.push({ name: '基础查询', success: false, error: error.message });
    log(`   ❌ 基础查询失败: ${error.message}`, 'red');
  }
  
  // 测试2: 带关联查询
  try {
    const start2 = Date.now();
    await prisma.solution.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        creator: {
          include: {
            user: {
              select: {
                display_name: true,
              },
            },
          },
        },
      },
      take: 10,
    });
    const duration2 = Date.now() - start2;
    tests.push({ name: '关联查询 (10条)', duration: duration2, success: true });
    log(`   ✅ 关联查询: ${duration2}ms`, duration2 < 200 ? 'green' : 'yellow');
  } catch (error) {
    tests.push({ name: '关联查询', success: false, error: error.message });
    log(`   ❌ 关联查询失败: ${error.message}`, 'red');
  }
  
  // 测试3: 统计查询
  try {
    const start3 = Date.now();
    await prisma.solution.count({
      where: { status: 'PUBLISHED' },
    });
    const duration3 = Date.now() - start3;
    tests.push({ name: '统计查询', duration: duration3, success: true });
    log(`   ✅ 统计查询: ${duration3}ms`, duration3 < 50 ? 'green' : 'yellow');
  } catch (error) {
    tests.push({ name: '统计查询', success: false, error: error.message });
    log(`   ❌ 统计查询失败: ${error.message}`, 'red');
  }
  
  const avgDuration = tests
    .filter(t => t.success && t.duration)
    .reduce((sum, t) => sum + t.duration, 0) / tests.filter(t => t.success).length;
  
  if (avgDuration > 0) {
    log(`\n   平均响应时间: ${avgDuration.toFixed(2)}ms`, avgDuration < 100 ? 'green' : 'yellow');
  }
  
  return tests.every(t => t.success);
}

async function generateReport() {
  log('\n' + '='.repeat(80), 'cyan');
  log('📊 优化验证报告', 'cyan');
  log('='.repeat(80), 'cyan');
  
  const results = {
    rls: false,
    indexes: false,
    functions: false,
    views: false,
    performance: false,
  };
  
  results.rls = await checkRLSPolicies();
  results.indexes = await checkIndexes();
  results.functions = await checkOptimizedFunctions();
  results.views = await checkMaterializedViews();
  results.performance = await testQueryPerformance();
  
  log('\n' + '='.repeat(80), 'cyan');
  log('📋 验证总结', 'cyan');
  log('='.repeat(80), 'cyan');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  log(`\n✅ 通过: ${passed}/${total} (${percentage}%)`, passed === total ? 'green' : 'yellow');
  
  log('\n详细状态:', 'cyan');
  log(`   ${results.rls ? '✅' : '❌'} RLS策略配置`, results.rls ? 'green' : 'red');
  log(`   ${results.indexes ? '✅' : '❌'} 数据库索引`, results.indexes ? 'green' : 'red');
  log(`   ${results.functions ? '✅' : '❌'} 优化函数`, results.functions ? 'green' : 'red');
  log(`   ${results.views ? '✅' : '❌'} 物化视图`, results.views ? 'green' : 'red');
  log(`   ${results.performance ? '✅' : '❌'} 性能测试`, results.performance ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 所有优化已成功应用！', 'green');
    log('\n建议:', 'blue');
    log('   - 定期刷新物化视图: SELECT refresh_materialized_views();', 'blue');
    log('   - 监控查询性能', 'blue');
    log('   - 根据实际使用调整索引', 'blue');
  } else {
    log('\n⚠️  部分优化未应用，请执行:', 'yellow');
    if (!results.rls) log('   - ./scripts/apply-optimizations.sh (选项1: RLS策略)', 'yellow');
    if (!results.indexes) log('   - ./scripts/apply-optimizations.sh (选项2: 索引)', 'yellow');
    if (!results.functions) log('   - ./scripts/apply-optimizations.sh (选项3: 优化函数)', 'yellow');
  }
  
  log('\n' + '='.repeat(80), 'cyan');
  
  return passed === total;
}

async function main() {
  try {
    const success = await generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n❌ 验证过程出错: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
