// AI 服务库 - 提供代码分析、标签生成和推荐算法功能

export interface CodeAnalysisResult {
  complexity: number; // 复杂度评分 (1-10)
  quality: number; // 代码质量评分 (1-10)
  maintainability: number; // 可维护性评分 (1-10)
  performance: number; // 性能评分 (1-10)
  security: number; // 安全性评分 (1-10)
  suggestions: string[]; // 改进建议
  issues: CodeIssue[]; // 发现的问题
  metrics: CodeMetrics; // 代码指标
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  severity: 'high' | 'medium' | 'low';
  line?: number;
  column?: number;
  message: string;
  rule: string;
  suggestion?: string;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  duplicatedLines: number;
  testCoverage?: number;
  dependencies: number;
  technicalDebt: string; // 技术债务时间估算
}

export interface TagSuggestion {
  tag: string;
  confidence: number; // 置信度 (0-1)
  category: 'language' | 'framework' | 'concept' | 'difficulty' | 'domain';
  reason: string; // 推荐理由
}

export interface RecommendationResult {
  solutions: SolutionRecommendation[];
  learningPath: LearningPathItem[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface SolutionRecommendation {
  id: string;
  title: string;
  description: string;
  relevanceScore: number; // 相关性评分 (0-1)
  difficulty: string;
  tags: string[];
  estimatedTime: string;
  reason: string; // 推荐理由
}

export interface LearningPathItem {
  step: number;
  title: string;
  description: string;
  resources: string[];
  estimatedTime: string;
  prerequisites: string[];
}

class AIService {
  private apiKey: string | null = null;
  private baseUrl: string = '/api/ai';

  constructor() {
    // 在实际应用中，这里应该从环境变量或配置中获取 API 密钥
    this.apiKey = process.env.NEXT_PUBLIC_AI_API_KEY || null;
  }

  /**
   * 分析代码质量和复杂度
   */
  async analyzeCode(code: string, language: string): Promise<CodeAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({ code, language })
      });

      if (!response.ok) {
        throw new Error('代码分析失败');
      }

      return await response.json();
    } catch (error) {
      console.error('代码分析错误:', error);
      // 返回模拟数据作为后备
      return this.getMockAnalysisResult(code, language);
    }
  }

  /**
   * 生成智能标签建议
   */
  async generateTags(content: string, existingTags: string[] = []): Promise<TagSuggestion[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({ content, existingTags })
      });

      if (!response.ok) {
        throw new Error('标签生成失败');
      }

      return await response.json();
    } catch (error) {
      console.error('标签生成错误:', error);
      // 返回模拟数据作为后备
      return this.getMockTagSuggestions(content);
    }
  }

  /**
   * 获取个性化推荐
   */
  async getRecommendations(
    userProfile: any,
    currentSolution?: any,
    preferences?: any
  ): Promise<RecommendationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({ userProfile, currentSolution, preferences })
      });

      if (!response.ok) {
        throw new Error('推荐获取失败');
      }

      return await response.json();
    } catch (error) {
      console.error('推荐获取错误:', error);
      // 返回模拟数据作为后备
      return this.getMockRecommendations();
    }
  }

  /**
   * 智能搜索建议
   */
  async getSearchSuggestions(query: string, context?: any): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({ query, context })
      });

      if (!response.ok) {
        throw new Error('搜索建议获取失败');
      }

      return await response.json();
    } catch (error) {
      console.error('搜索建议错误:', error);
      // 返回模拟数据作为后备
      return this.getMockSearchSuggestions(query);
    }
  }

  /**
   * 代码优化建议
   */
  async getOptimizationSuggestions(code: string, language: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({ code, language })
      });

      if (!response.ok) {
        throw new Error('优化建议获取失败');
      }

      return await response.json();
    } catch (error) {
      console.error('优化建议错误:', error);
      return [
        '考虑使用更具描述性的变量名',
        '可以将重复的代码提取为函数',
        '添加错误处理机制',
        '考虑使用缓存来提高性能'
      ];
    }
  }

  // 模拟数据方法
  private getMockAnalysisResult(code: string, language: string): CodeAnalysisResult {
    const linesOfCode = code.split('\n').length;
    const complexity = Math.min(10, Math.max(1, Math.floor(linesOfCode / 10) + 2));
    
    return {
      complexity,
      quality: Math.max(1, 10 - complexity + 2),
      maintainability: Math.max(1, 9 - Math.floor(complexity / 2)),
      performance: Math.floor(Math.random() * 3) + 7,
      security: Math.floor(Math.random() * 2) + 8,
      suggestions: [
        '考虑将长函数拆分为更小的函数',
        '添加更多的注释来提高代码可读性',
        '使用更具描述性的变量名',
        '考虑添加错误处理'
      ],
      issues: [
        {
          type: 'warning',
          severity: 'medium',
          line: Math.floor(Math.random() * linesOfCode) + 1,
          message: '函数复杂度较高，建议重构',
          rule: 'complexity',
          suggestion: '将函数拆分为多个较小的函数'
        }
      ],
      metrics: {
        linesOfCode,
        cyclomaticComplexity: complexity,
        cognitiveComplexity: complexity + 1,
        duplicatedLines: Math.floor(linesOfCode * 0.1),
        dependencies: Math.floor(Math.random() * 5) + 1,
        technicalDebt: `${Math.floor(complexity * 0.5)}小时`
      }
    };
  }

  private getMockTagSuggestions(content: string): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    
    // 基于内容关键词生成标签建议
    const keywords = content.toLowerCase();
    
    if (keywords.includes('react') || keywords.includes('jsx')) {
      suggestions.push({
        tag: 'React',
        confidence: 0.9,
        category: 'framework',
        reason: '代码中包含 React 相关内容'
      });
    }
    
    if (keywords.includes('typescript') || keywords.includes('interface')) {
      suggestions.push({
        tag: 'TypeScript',
        confidence: 0.85,
        category: 'language',
        reason: '代码中包含 TypeScript 语法'
      });
    }
    
    if (keywords.includes('api') || keywords.includes('fetch')) {
      suggestions.push({
        tag: 'API',
        confidence: 0.8,
        category: 'concept',
        reason: '涉及 API 调用相关内容'
      });
    }

    // 添加一些通用标签
    suggestions.push(
      {
        tag: '前端开发',
        confidence: 0.7,
        category: 'domain',
        reason: '内容与前端开发相关'
      },
      {
        tag: '中级',
        confidence: 0.6,
        category: 'difficulty',
        reason: '基于内容复杂度评估'
      }
    );
    
    return suggestions;
  }

  private getMockRecommendations(): RecommendationResult {
    return {
      solutions: [
        {
          id: 'rec1',
          title: 'React Hooks 最佳实践',
          description: '学习如何正确使用 React Hooks 来管理组件状态',
          relevanceScore: 0.95,
          difficulty: '中级',
          tags: ['React', 'Hooks', '状态管理'],
          estimatedTime: '2小时',
          reason: '基于您当前的学习进度和兴趣推荐'
        },
        {
          id: 'rec2',
          title: 'TypeScript 进阶技巧',
          description: '掌握 TypeScript 的高级类型系统和泛型',
          relevanceScore: 0.88,
          difficulty: '高级',
          tags: ['TypeScript', '类型系统', '泛型'],
          estimatedTime: '3小时',
          reason: '与您正在学习的内容高度相关'
        }
      ],
      learningPath: [
        {
          step: 1,
          title: '基础概念理解',
          description: '掌握核心概念和基本语法',
          resources: ['官方文档', '入门教程'],
          estimatedTime: '1周',
          prerequisites: []
        },
        {
          step: 2,
          title: '实践项目',
          description: '通过实际项目加深理解',
          resources: ['项目模板', '代码示例'],
          estimatedTime: '2周',
          prerequisites: ['基础概念理解']
        }
      ],
      relatedTopics: ['状态管理', '组件设计', '性能优化', '测试'],
      difficulty: 'intermediate'
    };
  }

  private getMockSearchSuggestions(query: string): string[] {
    const suggestions = [
      `${query} 教程`,
      `${query} 最佳实践`,
      `${query} 示例代码`,
      `${query} 常见问题`,
      `${query} 性能优化`
    ];
    
    return suggestions.slice(0, 5);
  }
}

// 导出单例实例
export const aiService = new AIService();

// 工具函数
export function calculateDifficultyScore(metrics: CodeMetrics): number {
  const complexityWeight = 0.4;
  const sizeWeight = 0.3;
  const dependencyWeight = 0.3;
  
  const complexityScore = Math.min(10, metrics.cyclomaticComplexity) / 10;
  const sizeScore = Math.min(10, metrics.linesOfCode / 100) / 10;
  const dependencyScore = Math.min(10, metrics.dependencies) / 10;
  
  return complexityWeight * complexityScore + 
         sizeWeight * sizeScore + 
         dependencyWeight * dependencyScore;
}

export function formatAnalysisScore(score: number): string {
  if (score >= 8) return '优秀';
  if (score >= 6) return '良好';
  if (score >= 4) return '一般';
  return '需要改进';
}

export function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-blue-600';
  if (score >= 4) return 'text-yellow-600';
  return 'text-red-600';
}