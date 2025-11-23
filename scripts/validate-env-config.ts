#!/usr/bin/env ts-node

/**
 * 环境配置验证脚本
 * 用于验证环境变量配置的完整性和正确性
 */

import { checkRequiredEnvVars, getEnvSummary, validateEnv } from '../src/config/env';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  summary: Record<string, string | boolean>;
}

/**
 * 验证环境配置
 */
function validateEnvironmentConfig(): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    summary: {},
  };

  console.log('🔍 开始验证环境配置...\n');

  // 1. 检查必需的环境变量
  console.log('📋 检查必需的环境变量...');
  const { missing, present } = checkRequiredEnvVars();
  
  if (missing.length > 0) {
    result.success = false;
    result.errors.push(`缺少必需的环境变量: ${missing.join(', ')}`);
    console.error(`❌ 缺少必需的环境变量: ${missing.join(', ')}`);
  } else {
    console.log(`✅ 所有必需的环境变量已设置 (${present.length} 个)`);
  }

  // 2. 验证环境变量格式
  console.log('\n🔍 验证环境变量格式...');
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    validateEnv(isProduction);
    console.log('✅ 环境变量格式验证通过');
  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`环境变量格式验证失败: ${errorMessage}`);
    console.error(`❌ 环境变量格式验证失败: ${errorMessage}`);
  }

  // 3. 检查环境文件是否存在
  console.log('\n📁 检查环境文件...');
  const envFiles = ['.env.local', '.env.development', '.env.production'];
  envFiles.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} 存在`);
    } else {
      result.warnings.push(`${file} 不存在`);
      console.warn(`⚠️  ${file} 不存在`);
    }
  });

  // 4. 检查 env.example 文件
  const examplePath = path.join(process.cwd(), 'env.example');
  if (fs.existsSync(examplePath)) {
    console.log('✅ env.example 存在');
  } else {
    result.warnings.push('env.example 不存在');
    console.warn('⚠️  env.example 不存在');
  }

  // 5. 获取环境摘要
  console.log('\n📊 环境配置摘要:');
  result.summary = getEnvSummary();
  Object.entries(result.summary).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  // 6. 输出结果
  console.log('\n' + '='.repeat(50));
  if (result.success) {
    console.log('✅ 环境配置验证通过');
  } else {
    console.error('❌ 环境配置验证失败');
    console.error('\n错误详情:');
    result.errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  警告:');
    result.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
  }

  return result;
}

/**
 * 主函数
 */
function main() {
  try {
    const result = validateEnvironmentConfig();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ 验证过程发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { validateEnvironmentConfig };

