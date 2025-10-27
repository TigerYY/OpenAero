import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, language, optimizationType = 'general' } = await request.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: '缺少必要参数：code 和 language' },
        { status: 400 }
      );
    }

    // 生成代码优化建议
    const optimizations = await generateOptimizationSuggestions(code, language, optimizationType);

    return NextResponse.json(optimizations);

  } catch (error) {
    console.error('代码优化建议生成错误:', error);
    return NextResponse.json(
      { error: '代码优化建议生成失败' },
      { status: 500 }
    );
  }
}

interface OptimizationSuggestion {
  id: string;
  type: 'performance' | 'readability' | 'security' | 'maintainability' | 'best_practice';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  before?: string;
  after?: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  line?: number;
  column?: number;
}

interface OptimizationResult {
  suggestions: OptimizationSuggestion[];
  summary: {
    totalSuggestions: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    categories: Record<string, number>;
  };
  overallScore: number;
  language: string;
  optimizationType: string;
  generatedAt: string;
}

async function generateOptimizationSuggestions(
  code: string, 
  language: string, 
  optimizationType: string
): Promise<OptimizationResult> {
  
  const suggestions: OptimizationSuggestion[] = [];
  
  // 根据语言和优化类型生成建议
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
      suggestions.push(...generateJavaScriptOptimizations(code, optimizationType));
      break;
    case 'python':
      suggestions.push(...generatePythonOptimizations(code, optimizationType));
      break;
    case 'java':
      suggestions.push(...generateJavaOptimizations(code, optimizationType));
      break;
    case 'react':
    case 'jsx':
    case 'tsx':
      suggestions.push(...generateReactOptimizations(code, optimizationType));
      break;
    default:
      suggestions.push(...generateGeneralOptimizations(code, optimizationType));
  }
  
  // 计算统计信息
  const summary = calculateSummary(suggestions);
  const overallScore = calculateOverallScore(suggestions);
  
  return {
    suggestions,
    summary,
    overallScore,
    language,
    optimizationType,
    generatedAt: new Date().toISOString()
  };
}

function generateJavaScriptOptimizations(code: string, type: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // 性能优化建议
    if (type === 'performance' || type === 'general') {
      // 检查 var 使用
      if (trimmedLine.includes('var ')) {
        suggestions.push({
          id: `js_var_${lineNumber}`,
          type: 'performance',
          priority: 'medium',
          title: '使用 let/const 替代 var',
          description: 'var 有函数作用域和变量提升问题，建议使用 let 或 const',
          before: trimmedLine,
          after: trimmedLine.replace(/var /g, 'const '),
          impact: '提高代码可读性和避免作用域问题',
          effort: 'low',
          line: lineNumber
        });
      }
      
      // 检查 == 使用
      if (trimmedLine.includes('==') && !trimmedLine.includes('===')) {
        suggestions.push({
          id: `js_equality_${lineNumber}`,
          type: 'best_practice',
          priority: 'high',
          title: '使用严格相等比较',
          description: '使用 === 和 !== 进行严格相等比较，避免类型转换问题',
          before: trimmedLine,
          after: trimmedLine.replace(/==/g, '===').replace(/!=/g, '!=='),
          impact: '避免意外的类型转换和潜在的 bug',
          effort: 'low',
          line: lineNumber
        });
      }
      
      // 检查 console.log
      if (trimmedLine.includes('console.log')) {
        suggestions.push({
          id: `js_console_${lineNumber}`,
          type: 'maintainability',
          priority: 'low',
          title: '移除调试代码',
          description: '生产环境中应该移除 console.log 语句',
          before: trimmedLine,
          after: '// ' + trimmedLine,
          impact: '减少生产环境的日志输出',
          effort: 'low',
          line: lineNumber
        });
      }
      
      // 检查 for...in 循环
      if (trimmedLine.includes('for') && trimmedLine.includes('in') && !trimmedLine.includes('hasOwnProperty')) {
        suggestions.push({
          id: `js_forin_${lineNumber}`,
          type: 'security',
          priority: 'medium',
          title: '在 for...in 循环中使用 hasOwnProperty',
          description: 'for...in 会遍历原型链上的属性，建议使用 hasOwnProperty 过滤',
          before: trimmedLine,
          after: trimmedLine + '\n  if (obj.hasOwnProperty(key)) {',
          impact: '避免遍历原型链上的属性',
          effort: 'medium',
          line: lineNumber
        });
      }
    }
    
    // 可读性优化
    if (type === 'readability' || type === 'general') {
      // 检查长行
      if (line.length > 120) {
        suggestions.push({
          id: `js_long_line_${lineNumber}`,
          type: 'readability',
          priority: 'low',
          title: '代码行过长',
          description: '建议将长行拆分为多行以提高可读性',
          before: trimmedLine,
          after: '// 建议拆分为多行',
          impact: '提高代码可读性',
          effort: 'low',
          line: lineNumber
        });
      }
      
      // 检查魔法数字
      const magicNumberRegex = /\b\d{2,}\b/g;
      const magicNumberMatch = trimmedLine.match(/\b\d{2,}\b/);
      if (magicNumberMatch && !trimmedLine.includes('const')) {
        const magicNumber = magicNumberMatch[0];
        suggestions.push({
          id: `js_magic_number_${lineNumber}`,
          type: 'readability',
          priority: 'medium',
          title: '避免使用魔法数字',
          description: '将数字常量提取为命名常量以提高代码可读性',
          before: trimmedLine,
          after: `const CONSTANT_NAME = ${magicNumber};`,
          impact: '提高代码可读性和可维护性',
          effort: 'medium',
          line: lineNumber
        });
      }
    }
  });
  
  return suggestions;
}

function generatePythonOptimizations(code: string, type: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // 性能优化
    if (type === 'performance' || type === 'general') {
      // 检查列表推导式机会
      if (trimmedLine.includes('for') && trimmedLine.includes('append')) {
        suggestions.push({
          id: `py_list_comp_${lineNumber}`,
          type: 'performance',
          priority: 'medium',
          title: '使用列表推导式',
          description: '列表推导式通常比传统的 for 循环 + append 更快',
          before: trimmedLine,
          after: '# 使用列表推导式: [expression for item in iterable]',
          impact: '提高执行效率',
          effort: 'medium',
          line: lineNumber
        });
      }
      
      // 检查字符串拼接
      if (trimmedLine.includes('+') && trimmedLine.includes('"')) {
        suggestions.push({
          id: `py_string_concat_${lineNumber}`,
          type: 'performance',
          priority: 'medium',
          title: '使用 f-string 或 join() 进行字符串拼接',
          description: 'f-string 或 join() 比 + 操作符更高效',
          before: trimmedLine,
          after: '# 使用 f-string: f"text {variable}"',
          impact: '提高字符串操作效率',
          effort: 'low',
          line: lineNumber
        });
      }
    }
    
    // 代码风格
    if (type === 'readability' || type === 'general') {
      // 检查 PEP 8 命名规范
      const variableMatch = trimmedLine.match(/(\w+)\s*=/);
      if (variableMatch && variableMatch[1] && /[A-Z]/.test(variableMatch[1]) && !variableMatch[1].match(/^[A-Z_]+$/)) {
        const variableName = variableMatch[1];
        suggestions.push({
          id: `py_naming_${lineNumber}`,
          type: 'best_practice',
          priority: 'low',
          title: '遵循 PEP 8 命名规范',
          description: '变量名应使用小写字母和下划线',
          before: trimmedLine,
          after: trimmedLine.replace(variableName, variableName.toLowerCase().replace(/([A-Z])/g, '_$1')),
          impact: '提高代码一致性',
          effort: 'low',
          line: lineNumber
        });
      }
    }
  });
  
  return suggestions;
}

function generateJavaOptimizations(code: string, type: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // 性能优化
    if (type === 'performance' || type === 'general') {
      // 检查 StringBuilder 使用
      if (trimmedLine.includes('String') && trimmedLine.includes('+')) {
        suggestions.push({
          id: `java_stringbuilder_${lineNumber}`,
          type: 'performance',
          priority: 'high',
          title: '使用 StringBuilder 进行字符串拼接',
          description: 'StringBuilder 比字符串拼接更高效',
          before: trimmedLine,
          after: 'StringBuilder sb = new StringBuilder();',
          impact: '显著提高字符串操作性能',
          effort: 'medium',
          line: lineNumber
        });
      }
      
      // 检查泛型使用
      if (trimmedLine.includes('ArrayList') && !trimmedLine.includes('<')) {
        suggestions.push({
          id: `java_generics_${lineNumber}`,
          type: 'best_practice',
          priority: 'medium',
          title: '使用泛型',
          description: '使用泛型提供类型安全',
          before: trimmedLine,
          after: trimmedLine.replace('ArrayList', 'ArrayList<Type>'),
          impact: '提高类型安全性',
          effort: 'low',
          line: lineNumber
        });
      }
    }
  });
  
  return suggestions;
}

function generateReactOptimizations(code: string, type: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // React 特定优化
    if (type === 'performance' || type === 'general') {
      // 检查 useCallback 使用
      if (trimmedLine.includes('const') && trimmedLine.includes('=>') && trimmedLine.includes('(')) {
        suggestions.push({
          id: `react_callback_${lineNumber}`,
          type: 'performance',
          priority: 'medium',
          title: '考虑使用 useCallback',
          description: '对于传递给子组件的函数，使用 useCallback 可以避免不必要的重渲染',
          before: trimmedLine,
          after: 'const memoizedCallback = useCallback(() => {}, [dependencies]);',
          impact: '减少子组件不必要的重渲染',
          effort: 'medium',
          line: lineNumber
        });
      }
      
      // 检查 key 属性
      if (trimmedLine.includes('.map(') && !trimmedLine.includes('key=')) {
        suggestions.push({
          id: `react_key_${lineNumber}`,
          type: 'best_practice',
          priority: 'high',
          title: '为列表项添加 key 属性',
          description: '列表渲染时应该为每个项目提供唯一的 key',
          before: trimmedLine,
          after: trimmedLine + ' // 添加 key={item.id}',
          impact: '提高列表渲染性能',
          effort: 'low',
          line: lineNumber
        });
      }
    }
  });
  
  return suggestions;
}

function generateGeneralOptimizations(code: string, type: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();
    
    // 通用优化建议
    if (trimmedLine.length === 0) return;
    
    // 检查注释
    if (!trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*') && !trimmedLine.startsWith('#')) {
      if (line.length > 100) {
        suggestions.push({
          id: `general_long_line_${lineNumber}`,
          type: 'readability',
          priority: 'low',
          title: '代码行过长',
          description: '建议将长行拆分以提高可读性',
          before: trimmedLine,
          after: '// 建议拆分为多行',
          impact: '提高代码可读性',
          effort: 'low',
          line: lineNumber
        });
      }
    }
  });
  
  return suggestions;
}

function calculateSummary(suggestions: OptimizationSuggestion[]) {
  const summary = {
    totalSuggestions: suggestions.length,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    categories: {} as Record<string, number>
  };
  
  suggestions.forEach(suggestion => {
    // 统计优先级
    switch (suggestion.priority) {
      case 'high':
        summary.highPriority++;
        break;
      case 'medium':
        summary.mediumPriority++;
        break;
      case 'low':
        summary.lowPriority++;
        break;
    }
    
    // 统计类别
    summary.categories[suggestion.type] = (summary.categories[suggestion.type] || 0) + 1;
  });
  
  return summary;
}

function calculateOverallScore(suggestions: OptimizationSuggestion[]): number {
  if (suggestions.length === 0) return 100;
  
  let totalDeduction = 0;
  
  suggestions.forEach(suggestion => {
    switch (suggestion.priority) {
      case 'high':
        totalDeduction += 15;
        break;
      case 'medium':
        totalDeduction += 8;
        break;
      case 'low':
        totalDeduction += 3;
        break;
    }
  });
  
  return Math.max(0, 100 - totalDeduction);
}