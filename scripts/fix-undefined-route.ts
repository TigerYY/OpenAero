#!/usr/bin/env tsx
/**
 * 自动修复"使用route()但未声明"的问题
 * 
 * 功能：
 * 1. 读取 deep-validation-report.json 中的 "Undefined Variable" 问题
 * 2. 检查每个文件是否有 const { route } = useRouting()
 * 3. 如果没有，添加该声明（在 'use client' 之后的第一个合适位置）
 */

import * as fs from 'fs'
import * as path from 'path'

interface Issue {
  file: string
  line: number
  category: string
  severity: string
  message: string
  code: string
}

interface Report {
  issues: Issue[]
}

const REPORT_FILE = 'deep-validation-report.json'

function fixFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    // 检查是否已经有 route 声明
    const hasRouteDeclaration = /const\s*{\s*route\s*}\s*=\s*useRouting\(\)/.test(content)
    if (hasRouteDeclaration) {
      console.log(`✅ ${filePath} - 已有声明，跳过`)
      return false
    }
    
    // 检查是否有 useRouting 导入
    const hasUseRoutingImport = content.includes("import { useRouting }")
    
    // 找到插入位置
    let insertIndex = -1
    let hasUseClient = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line === "'use client'" || line === '"use client"') {
        hasUseClient = true
        continue
      }
      
      // 找到导入语句结束的位置
      if (line.startsWith('import ') || line.startsWith('export ')) {
        insertIndex = i + 1
      }
      
      // 找到函数组件定义
      if (line.match(/^export (default )?function/) || 
          line.match(/^export const \w+ = /) ||
          line.match(/^function \w+/)) {
        if (insertIndex === -1) {
          insertIndex = i
        }
        break
      }
    }
    
    if (insertIndex === -1) {
      console.log(`⚠️  ${filePath} - 找不到合适的插入位置`)
      return false
    }
    
    // 构建新内容
    const newLines = [...lines]
    
    // 添加 useRouting 导入（如果没有）
    if (!hasUseRoutingImport) {
      // 找到最后一个导入语句
      let lastImportIndex = 0
      for (let i = 0; i < newLines.length; i++) {
        if (newLines[i].trim().startsWith('import ')) {
          lastImportIndex = i
        }
      }
      newLines.splice(lastImportIndex + 1, 0, "import { useRouting } from '@/lib/routing'")
      insertIndex++ // 调整插入索引
    }
    
    // 在函数组件内部第一行添加 route 声明
    // 找到函数体开始的位置
    for (let i = insertIndex; i < newLines.length; i++) {
      const line = newLines[i].trim()
      if (line.includes('{')) {
        // 找到函数体开始，插入声明
        newLines.splice(i + 1, 0, "  const { route } = useRouting()")
        break
      }
    }
    
    const newContent = newLines.join('\n')
    fs.writeFileSync(filePath, newContent, 'utf-8')
    
    console.log(`✅ ${filePath} - 已修复`)
    return true
    
  } catch (error) {
    console.error(`❌ ${filePath} - 修复失败:`, error)
    return false
  }
}

async function main() {
  console.log('🔧 开始修复"未声明route"问题...\n')
  
  // 读取报告
  const reportPath = path.join(process.cwd(), REPORT_FILE)
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ 报告文件不存在: ${REPORT_FILE}`)
    process.exit(1)
  }
  
  const report: Report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  
  // 筛选出 "Undefined Variable" 类型的问题
  const undefinedIssues = report.issues.filter(
    issue => issue.category === 'Undefined Variable'
  )
  
  console.log(`📋 发现 ${undefinedIssues.length} 个"未声明route"问题\n`)
  
  // 去重文件路径
  const uniqueFiles = [...new Set(undefinedIssues.map(issue => issue.file))]
  
  console.log(`📁 涉及 ${uniqueFiles.length} 个文件\n`)
  
  // 批量修复
  let fixedCount = 0
  let skippedCount = 0
  let failedCount = 0
  
  for (const file of uniqueFiles) {
    const fixed = fixFile(file)
    if (fixed) {
      fixedCount++
    } else {
      if (fs.readFileSync(file, 'utf-8').includes('const { route } = useRouting()')) {
        skippedCount++
      } else {
        failedCount++
      }
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 修复完成统计：')
  console.log(`✅ 成功修复: ${fixedCount}`)
  console.log(`⏭️  已有声明(跳过): ${skippedCount}`)
  console.log(`❌ 修复失败: ${failedCount}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // 重新运行验证
  console.log('🔄 重新运行验证...\n')
  const { execSync } = require('child_process')
  execSync('npx tsx scripts/deep-route-validation.ts', { stdio: 'inherit' })
}

main().catch(console.error)
