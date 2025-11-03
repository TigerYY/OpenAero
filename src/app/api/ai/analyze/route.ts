import { NextRequest, NextResponse } from 'next/server';

import { CodeAnalysisResult, CodeIssue, CodeMetrics } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const { code, language } = await request.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: '缺少必要参数：code 和 language' },
        { status: 400 }
      );
    }

    // 执行代码分析
    const analysisResult = await analyzeCodeQuality(code, language);

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('代码分析错误:', error);
    return NextResponse.json(
      { error: '代码分析失败' },
      { status: 500 }
    );
  }
}

async function analyzeCodeQuality(code: string, language: string): Promise<CodeAnalysisResult> {
  // 基本代码指标计算
  const metrics = calculateCodeMetrics(code, language);
  
  // 代码质量评分
  const complexity = calculateComplexityScore(code, language);
  const quality = calculateQualityScore(code, language);
  const maintainability = calculateMaintainabilityScore(code, language);
  const performance = calculatePerformanceScore(code, language);
  const security = calculateSecurityScore(code, language);
  
  // 发现问题和建议
  const issues = findCodeIssues(code, language);
  const suggestions = generateSuggestions(code, language, metrics);

  return {
    complexity,
    quality,
    maintainability,
    performance,
    security,
    suggestions,
    issues,
    metrics
  };
}

function calculateCodeMetrics(code: string, language: string): CodeMetrics {
  const lines = code.split('\n');
  const linesOfCode = lines.filter(line => 
    line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('/*')
  ).length;

  // 计算圈复杂度（简化版）
  const cyclomaticComplexity = calculateCyclomaticComplexity(code, language);
  
  // 计算认知复杂度
  const cognitiveComplexity = calculateCognitiveComplexity(code, language);
  
  // 检测重复代码行
  const duplicatedLines = detectDuplicatedLines(lines);
  
  // 计算依赖数量
  const dependencies = countDependencies(code, language);
  
  // 估算技术债务
  const technicalDebt = estimateTechnicalDebt(cyclomaticComplexity, linesOfCode);

  return {
    linesOfCode,
    cyclomaticComplexity,
    cognitiveComplexity,
    duplicatedLines,
    dependencies,
    technicalDebt
  };
}

function calculateCyclomaticComplexity(code: string, language: string): number {
  let complexity = 1; // 基础复杂度
  
  // 根据语言特性计算复杂度
  const complexityPatterns = getComplexityPatterns(language);
  
  for (const pattern of complexityPatterns) {
    const matches = code.match(pattern.regex);
    if (matches) {
      complexity += matches.length * pattern.weight;
    }
  }
  
  return Math.min(complexity, 20); // 限制最大复杂度
}

function calculateCognitiveComplexity(code: string, language: string): number {
  let complexity = 0;
  let nestingLevel = 0;
  
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 检测嵌套结构
    if (isNestingStart(trimmedLine, language)) {
      nestingLevel++;
    } else if (isNestingEnd(trimmedLine, language)) {
      nestingLevel = Math.max(0, nestingLevel - 1);
    }
    
    // 检测复杂度增加的结构
    if (isComplexityIncreasing(trimmedLine, language)) {
      complexity += 1 + nestingLevel;
    }
  }
  
  return complexity;
}

function detectDuplicatedLines(lines: string[]): number {
  const lineMap = new Map<string, number>();
  let duplicatedCount = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && trimmedLine.length > 10) { // 忽略短行
      const count = lineMap.get(trimmedLine) || 0;
      lineMap.set(trimmedLine, count + 1);
      
      if (count === 1) { // 第二次出现时开始计算重复
        duplicatedCount += 2;
      } else if (count > 1) {
        duplicatedCount += 1;
      }
    }
  }
  
  return duplicatedCount;
}

function countDependencies(code: string, language: string): number {
  const importPatterns = getImportPatterns(language);
  let dependencies = 0;
  
  for (const pattern of importPatterns) {
    const matches = code.match(pattern);
    if (matches) {
      dependencies += matches.length;
    }
  }
  
  return dependencies;
}

function estimateTechnicalDebt(complexity: number, linesOfCode: number): string {
  const baseTime = Math.floor(complexity * 0.5 + linesOfCode * 0.01);
  
  if (baseTime < 1) return '30分钟';
  if (baseTime < 4) return `${baseTime}小时`;
  if (baseTime < 24) return `${Math.floor(baseTime / 4)}天`;
  return `${Math.floor(baseTime / 24)}周`;
}

function calculateComplexityScore(code: string, language: string): number {
  const metrics = calculateCodeMetrics(code, language);
  const normalizedComplexity = Math.min(metrics.cyclomaticComplexity / 10, 1);
  return Math.max(1, Math.floor((1 - normalizedComplexity) * 9) + 1);
}

function calculateQualityScore(code: string, language: string): number {
  let score = 10;
  
  // 检查命名规范
  if (!hasGoodNaming(code, language)) score -= 1;
  
  // 检查注释覆盖率
  if (!hasAdequateComments(code)) score -= 1;
  
  // 检查函数长度
  if (hasLongFunctions(code, language)) score -= 1;
  
  // 检查代码重复
  const duplicatedLines = detectDuplicatedLines(code.split('\n'));
  if (duplicatedLines > code.split('\n').length * 0.1) score -= 1;
  
  return Math.max(1, score);
}

function calculateMaintainabilityScore(code: string, language: string): number {
  const metrics = calculateCodeMetrics(code, language);
  let score = 10;
  
  // 基于复杂度调整
  if (metrics.cyclomaticComplexity > 10) score -= 2;
  else if (metrics.cyclomaticComplexity > 5) score -= 1;
  
  // 基于代码长度调整
  if (metrics.linesOfCode > 500) score -= 1;
  
  // 基于重复代码调整
  if (metrics.duplicatedLines > metrics.linesOfCode * 0.15) score -= 1;
  
  return Math.max(1, score);
}

function calculatePerformanceScore(code: string, language: string): number {
  let score = 10;
  
  // 检查性能反模式
  const performanceIssues = findPerformanceIssues(code, language);
  score -= performanceIssues.length;
  
  return Math.max(1, score);
}

function calculateSecurityScore(code: string, language: string): number {
  let score = 10;
  
  // 检查安全问题
  const securityIssues = findSecurityIssues(code, language);
  score -= securityIssues.length;
  
  return Math.max(1, score);
}

function findCodeIssues(code: string, language: string): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const lines = code.split('\n');
  
  // 检查长函数
  const longFunctions = findLongFunctions(code, language);
  for (const func of longFunctions) {
    issues.push({
      type: 'warning',
      severity: 'medium',
      line: func.line,
      message: `函数 '${func.name}' 过长 (${func.length} 行)`,
      rule: 'function-length',
      suggestion: '考虑将函数拆分为更小的函数'
    });
  }
  
  // 检查复杂的条件语句
  const complexConditions = findComplexConditions(lines, language);
  for (const condition of complexConditions) {
    issues.push({
      type: 'warning',
      severity: 'low',
      line: condition.line,
      message: '条件语句过于复杂',
      rule: 'complex-condition',
      suggestion: '考虑提取为单独的函数或使用更清晰的逻辑'
    });
  }
  
  return issues;
}

function generateSuggestions(code: string, language: string, metrics: CodeMetrics): string[] {
  const suggestions: string[] = [];
  
  if (metrics.cyclomaticComplexity > 10) {
    suggestions.push('考虑重构复杂的函数，将其拆分为更小的函数');
  }
  
  if (metrics.duplicatedLines > metrics.linesOfCode * 0.1) {
    suggestions.push('发现重复代码，考虑提取为公共函数或模块');
  }
  
  if (!hasAdequateComments(code)) {
    suggestions.push('添加更多注释来提高代码可读性');
  }
  
  if (metrics.dependencies > 10) {
    suggestions.push('依赖过多，考虑重新组织代码结构');
  }
  
  if (!hasGoodNaming(code, language)) {
    suggestions.push('使用更具描述性的变量和函数名');
  }
  
  return suggestions;
}

// 辅助函数
function getComplexityPatterns(language: string) {
  const basePatterns = [
    { regex: /\bif\b/g, weight: 1 },
    { regex: /\belse\b/g, weight: 1 },
    { regex: /\bwhile\b/g, weight: 1 },
    { regex: /\bfor\b/g, weight: 1 },
    { regex: /\bswitch\b/g, weight: 1 },
    { regex: /\bcase\b/g, weight: 1 },
    { regex: /\bcatch\b/g, weight: 1 },
    { regex: /\b&&\b/g, weight: 1 },
    { regex: /\b\|\|\b/g, weight: 1 }
  ];
  
  return basePatterns;
}

function getImportPatterns(language: string): RegExp[] {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
      return [
        /import\s+.*\s+from\s+['"][^'"]+['"]/g,
        /require\s*\(\s*['"][^'"]+['"]\s*\)/g
      ];
    case 'python':
      return [
        /import\s+\w+/g,
        /from\s+\w+\s+import/g
      ];
    case 'java':
      return [/import\s+[\w.]+;/g];
    default:
      return [/import|require|include/g];
  }
}

function isNestingStart(line: string, language: string): boolean {
  return /[{([]$/.test(line) || 
         /\b(if|for|while|function|class|try)\b/.test(line);
}

function isNestingEnd(line: string, language: string): boolean {
  return /^[})\]]/.test(line);
}

function isComplexityIncreasing(line: string, language: string): boolean {
  return /\b(if|else|while|for|switch|case|catch|&&|\|\|)\b/.test(line);
}

function hasGoodNaming(code: string, language: string): boolean {
  // 简化的命名检查
  const badNamingPatterns = [
    /\b[a-z]\b/g, // 单字母变量
    /\b(temp|tmp|data|info|obj)\b/g, // 通用名称
    /\b[a-z]+\d+\b/g // 数字结尾的变量
  ];
  
  for (const pattern of badNamingPatterns) {
    if (pattern.test(code)) {
      return false;
    }
  }
  
  return true;
}

function hasAdequateComments(code: string): boolean {
  const lines = code.split('\n');
  const codeLines = lines.filter(line => line.trim() && !line.trim().startsWith('//'));
  const commentLines = lines.filter(line => line.trim().startsWith('//') || line.includes('/*'));
  
  return commentLines.length / codeLines.length > 0.1; // 至少10%的注释率
}

function hasLongFunctions(code: string, language: string): boolean {
  const functions = findLongFunctions(code, language);
  return functions.some(func => func.length > 50);
}

function findLongFunctions(code: string, language: string): Array<{name: string, line: number, length: number}> {
  // 简化的函数检测
  const lines = code.split('\n');
  const functions: Array<{name: string, line: number, length: number}> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const functionMatch = line.match(/function\s+(\w+)|(\w+)\s*\(/);
    
    if (functionMatch) {
      const name = functionMatch[1] || functionMatch[2] || 'anonymous';
      let length = 1;
      let braceCount = 0;
      
      for (let j = i + 1; j < lines.length; j++) {
        const currentLine = lines[j];
        if (!currentLine) continue;
        
        braceCount += (currentLine.match(/{/g) || []).length;
        braceCount -= (currentLine.match(/}/g) || []).length;
        length++;
        
        if (braceCount === 0) break;
      }
      
      functions.push({ name, line: i + 1, length });
    }
  }
  
  return functions.filter(func => func.length > 30);
}

function findComplexConditions(lines: string[], language: string): Array<{line: number}> {
  const complexConditions: Array<{line: number}> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const conditionComplexity = (line.match(/&&|\|\|/g) || []).length;
    
    if (conditionComplexity > 2) {
      complexConditions.push({ line: i + 1 });
    }
  }
  
  return complexConditions;
}

function findPerformanceIssues(code: string, language: string): string[] {
  const issues: string[] = [];
  
  // 检查常见性能问题
  if (code.includes('document.getElementById') && code.match(/document\.getElementById/g)!.length > 3) {
    issues.push('频繁的 DOM 查询');
  }
  
  if (code.includes('for') && code.includes('for') && code.match(/for.*for/g)) {
    issues.push('嵌套循环可能影响性能');
  }
  
  return issues;
}

function findSecurityIssues(code: string, language: string): string[] {
  const issues: string[] = [];
  
  // 检查常见安全问题
  if (code.includes('eval(')) {
    issues.push('使用 eval() 存在安全风险');
  }
  
  if (code.includes('innerHTML') && !code.includes('sanitize')) {
    issues.push('直接使用 innerHTML 可能存在 XSS 风险');
  }
  
  return issues;
}