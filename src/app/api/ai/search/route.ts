import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const context = searchParams.get('context');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: '缺少必要参数：q (查询关键词)' },
        { status: 400 }
      );
    }

    // 生成智能搜索建议
    const suggestions = await generateSearchSuggestions(query, context, limit);

    return NextResponse.json({
      query,
      suggestions,
      context,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('搜索建议生成错误:', error);
    return NextResponse.json(
      { error: '搜索建议生成失败' },
      { status: 500 }
    );
  }
}

async function generateSearchSuggestions(query: string, context: string | null, limit: number): Promise<string[]> {
  const queryLower = query.toLowerCase();
  
  // 基础搜索建议
  const baseSuggestions = generateBaseSuggestions(queryLower);
  
  // 上下文相关建议
  const contextSuggestions = context ? generateContextSuggestions(queryLower, context) : [];
  
  // 热门搜索建议
  const trendingSuggestions = generateTrendingSuggestions(queryLower);
  
  // 自动完成建议
  const autocompleteSuggestions = generateAutocompleteSuggestions(queryLower);
  
  // 合并并去重
  const allSuggestions = [
    ...baseSuggestions,
    ...contextSuggestions,
    ...trendingSuggestions,
    ...autocompleteSuggestions
  ];
  
  const uniqueSuggestions = Array.from(new Set(allSuggestions));
  
  // 按相关性排序
  const scoredSuggestions = uniqueSuggestions.map(suggestion => ({
    text: suggestion,
    score: calculateRelevanceScore(suggestion, query, context)
  }));
  
  return scoredSuggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.text);
}

function generateBaseSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  
  // 编程语言相关
  const programmingLanguages = [
    'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'go', 'rust',
    'php', 'ruby', 'swift', 'kotlin', 'dart', 'scala', 'r', 'matlab'
  ];
  
  // 框架和库
  const frameworks = [
    'react', 'vue', 'angular', 'next.js', 'nuxt.js', 'svelte',
    'express', 'fastapi', 'django', 'flask', 'spring boot',
    'laravel', 'rails', 'asp.net'
  ];
  
  // 技术概念
  const concepts = [
    'algorithm', 'data structure', 'design pattern', 'api', 'database',
    'machine learning', 'artificial intelligence', 'blockchain',
    'microservices', 'devops', 'cloud computing', 'cybersecurity'
  ];
  
  // 检查查询是否匹配这些类别
  for (const lang of programmingLanguages) {
    if (lang.includes(query) || query.includes(lang)) {
      suggestions.push(`${lang} 教程`);
      suggestions.push(`${lang} 最佳实践`);
      suggestions.push(`${lang} 项目示例`);
    }
  }
  
  for (const framework of frameworks) {
    if (framework.includes(query) || query.includes(framework)) {
      suggestions.push(`${framework} 入门指南`);
      suggestions.push(`${framework} 高级技巧`);
      suggestions.push(`${framework} vs 其他框架`);
    }
  }
  
  for (const concept of concepts) {
    if (concept.includes(query) || query.includes(concept)) {
      suggestions.push(`${concept} 详解`);
      suggestions.push(`${concept} 实现原理`);
      suggestions.push(`${concept} 应用场景`);
    }
  }
  
  return suggestions;
}

function generateContextSuggestions(query: string, context: string): string[] {
  const suggestions: string[] = [];
  
  switch (context) {
    case 'tutorial':
      suggestions.push(`${query} 教程`);
      suggestions.push(`${query} 入门指南`);
      suggestions.push(`${query} 学习路径`);
      suggestions.push(`${query} 从零开始`);
      break;
      
    case 'project':
      suggestions.push(`${query} 项目示例`);
      suggestions.push(`${query} 实战项目`);
      suggestions.push(`${query} 开源项目`);
      suggestions.push(`${query} 项目模板`);
      break;
      
    case 'problem':
      suggestions.push(`${query} 常见问题`);
      suggestions.push(`${query} 解决方案`);
      suggestions.push(`${query} 故障排除`);
      suggestions.push(`${query} 调试技巧`);
      break;
      
    case 'comparison':
      suggestions.push(`${query} 对比`);
      suggestions.push(`${query} 优缺点`);
      suggestions.push(`${query} 选择指南`);
      suggestions.push(`${query} 性能比较`);
      break;
      
    case 'advanced':
      suggestions.push(`${query} 高级技巧`);
      suggestions.push(`${query} 深入理解`);
      suggestions.push(`${query} 源码分析`);
      suggestions.push(`${query} 性能优化`);
      break;
      
    default:
      suggestions.push(`${query} 概述`);
      suggestions.push(`${query} 应用`);
      break;
  }
  
  return suggestions;
}

function generateTrendingSuggestions(query: string): string[] {
  // 模拟热门搜索数据
  const trendingTopics = [
    'ChatGPT 编程应用',
    'Web3 开发入门',
    'Rust 语言学习',
    'Kubernetes 部署',
    'GraphQL API 设计',
    'Serverless 架构',
    'TypeScript 最佳实践',
    'React 18 新特性',
    'Python 数据分析',
    'Docker 容器化',
    'Vue 3 Composition API',
    'Next.js 13 App Router',
    'Tailwind CSS 技巧',
    'Node.js 性能优化',
    'MongoDB 数据建模'
  ];
  
  return trendingTopics.filter(topic => 
    topic.toLowerCase().includes(query) || 
    query.split(' ').some(word => topic.toLowerCase().includes(word))
  );
}

function generateAutocompleteSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  
  // 常见的搜索模式
  const patterns = [
    'how to',
    'what is',
    'best practices',
    'tutorial',
    'example',
    'vs',
    'comparison',
    'guide',
    'tips',
    'tricks',
    'advanced',
    'beginner',
    'intermediate',
    'performance',
    'optimization',
    'security',
    'testing',
    'debugging',
    'deployment',
    'configuration'
  ];
  
  // 为查询添加常见前缀和后缀
  for (const pattern of patterns) {
    if (!query.includes(pattern)) {
      suggestions.push(`${pattern} ${query}`);
      suggestions.push(`${query} ${pattern}`);
    }
  }
  
  // 添加相关技术栈建议
  const relatedTech = getRelatedTechnologies(query);
  for (const tech of relatedTech) {
    suggestions.push(`${query} ${tech}`);
    suggestions.push(`${tech} ${query}`);
  }
  
  return suggestions.slice(0, 10); // 限制数量
}

function getRelatedTechnologies(query: string): string[] {
  const techMap: Record<string, string[]> = {
    'react': ['hooks', 'redux', 'next.js', 'typescript', 'testing'],
    'vue': ['vuex', 'nuxt.js', 'composition api', 'typescript', 'testing'],
    'angular': ['rxjs', 'typescript', 'ngrx', 'testing', 'material'],
    'node': ['express', 'mongodb', 'postgresql', 'redis', 'docker'],
    'python': ['django', 'flask', 'pandas', 'numpy', 'machine learning'],
    'java': ['spring boot', 'hibernate', 'maven', 'gradle', 'junit'],
    'javascript': ['es6', 'async/await', 'promises', 'dom', 'api'],
    'typescript': ['interfaces', 'generics', 'decorators', 'modules', 'types'],
    'css': ['flexbox', 'grid', 'animations', 'responsive', 'sass'],
    'html': ['semantic', 'accessibility', 'forms', 'canvas', 'web components']
  };
  
  const queryLower = query.toLowerCase();
  for (const [key, values] of Object.entries(techMap)) {
    if (queryLower.includes(key)) {
      return values;
    }
  }
  
  return [];
}

function calculateRelevanceScore(suggestion: string, originalQuery: string, context: string | null): number {
  let score = 0;
  
  const suggestionLower = suggestion.toLowerCase();
  const queryLower = originalQuery.toLowerCase();
  
  // 精确匹配得分最高
  if (suggestionLower.includes(queryLower)) {
    score += 100;
  }
  
  // 单词匹配
  const queryWords = queryLower.split(' ');
  const suggestionWords = suggestionLower.split(' ');
  
  for (const queryWord of queryWords) {
    for (const suggestionWord of suggestionWords) {
      if (suggestionWord.includes(queryWord) || queryWord.includes(suggestionWord)) {
        score += 20;
      }
    }
  }
  
  // 上下文相关性
  if (context) {
    if (suggestionLower.includes(context.toLowerCase())) {
      score += 30;
    }
  }
  
  // 长度惩罚（避免过长的建议）
  if (suggestion.length > 50) {
    score -= 10;
  }
  
  // 常见搜索模式加分
  const commonPatterns = ['教程', '指南', '示例', '最佳实践', '入门'];
  for (const pattern of commonPatterns) {
    if (suggestionLower.includes(pattern)) {
      score += 15;
      break;
    }
  }
  
  return score;
}