import { NextRequest, NextResponse } from 'next/server';
import { TagSuggestion } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const { content, existingTags = [] } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: '缺少必要参数：content' },
        { status: 400 }
      );
    }

    // 生成智能标签建议
    const tagSuggestions = await generateSmartTags(content, existingTags);

    return NextResponse.json(tagSuggestions);

  } catch (error) {
    console.error('标签生成错误:', error);
    return NextResponse.json(
      { error: '标签生成失败' },
      { status: 500 }
    );
  }
}

async function generateSmartTags(content: string, existingTags: string[]): Promise<TagSuggestion[]> {
  const suggestions: TagSuggestion[] = [];
  const contentLower = content.toLowerCase();
  
  // 编程语言检测
  const languageTags = detectProgrammingLanguages(contentLower);
  suggestions.push(...languageTags);
  
  // 框架和库检测
  const frameworkTags = detectFrameworks(contentLower);
  suggestions.push(...frameworkTags);
  
  // 概念和技术检测
  const conceptTags = detectConcepts(contentLower);
  suggestions.push(...conceptTags);
  
  // 难度评估
  const difficultyTag = assessDifficulty(content);
  if (difficultyTag) {
    suggestions.push(difficultyTag);
  }
  
  // 领域分类
  const domainTags = detectDomain(contentLower);
  suggestions.push(...domainTags);
  
  // 过滤已存在的标签
  const filteredSuggestions = suggestions.filter(
    suggestion => !existingTags.includes(suggestion.tag)
  );
  
  // 按置信度排序并限制数量
  return filteredSuggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

function detectProgrammingLanguages(content: string): TagSuggestion[] {
  const suggestions: TagSuggestion[] = [];
  
  const languagePatterns = [
    {
      language: 'JavaScript',
      patterns: ['javascript', 'js', 'const ', 'let ', 'var ', 'function', '=>', 'console.log'],
      confidence: 0.9
    },
    {
      language: 'TypeScript',
      patterns: ['typescript', 'ts', 'interface', 'type ', ': string', ': number', 'generic'],
      confidence: 0.9
    },
    {
      language: 'Python',
      patterns: ['python', 'py', 'def ', 'import ', 'print(', '__init__', 'self.'],
      confidence: 0.9
    },
    {
      language: 'Java',
      patterns: ['java', 'public class', 'private ', 'public ', 'static ', 'void main'],
      confidence: 0.9
    },
    {
      language: 'C++',
      patterns: ['c++', 'cpp', '#include', 'std::', 'cout', 'cin', 'namespace'],
      confidence: 0.9
    },
    {
      language: 'C#',
      patterns: ['c#', 'csharp', 'using System', 'public class', 'Console.WriteLine'],
      confidence: 0.9
    },
    {
      language: 'Go',
      patterns: ['golang', 'go', 'package main', 'func main', 'fmt.Print'],
      confidence: 0.9
    },
    {
      language: 'Rust',
      patterns: ['rust', 'fn main', 'let mut', 'println!', 'cargo'],
      confidence: 0.9
    }
  ];
  
  for (const lang of languagePatterns) {
    const matchCount = lang.patterns.filter(pattern => content.includes(pattern)).length;
    if (matchCount > 0) {
      const confidence = Math.min(lang.confidence, matchCount / lang.patterns.length);
      suggestions.push({
        tag: lang.language,
        confidence,
        category: 'language',
        reason: `检测到 ${matchCount} 个 ${lang.language} 相关关键词`
      });
    }
  }
  
  return suggestions;
}

function detectFrameworks(content: string): TagSuggestion[] {
  const suggestions: TagSuggestion[] = [];
  
  const frameworkPatterns = [
    {
      framework: 'React',
      patterns: ['react', 'jsx', 'usestate', 'useeffect', 'component', 'props'],
      confidence: 0.85
    },
    {
      framework: 'Vue.js',
      patterns: ['vue', 'vuejs', 'v-if', 'v-for', 'computed', 'mounted'],
      confidence: 0.85
    },
    {
      framework: 'Angular',
      patterns: ['angular', '@component', '@injectable', 'ngfor', 'ngif'],
      confidence: 0.85
    },
    {
      framework: 'Next.js',
      patterns: ['nextjs', 'next.js', 'getstaticprops', 'getserversideprops', 'pages/'],
      confidence: 0.85
    },
    {
      framework: 'Express.js',
      patterns: ['express', 'app.get', 'app.post', 'middleware', 'req.body'],
      confidence: 0.85
    },
    {
      framework: 'Django',
      patterns: ['django', 'models.py', 'views.py', 'urls.py', 'render'],
      confidence: 0.85
    },
    {
      framework: 'Flask',
      patterns: ['flask', '@app.route', 'render_template', 'request.form'],
      confidence: 0.85
    },
    {
      framework: 'Spring Boot',
      patterns: ['spring boot', 'springboot', '@restcontroller', '@autowired'],
      confidence: 0.85
    }
  ];
  
  for (const fw of frameworkPatterns) {
    const matchCount = fw.patterns.filter(pattern => content.includes(pattern)).length;
    if (matchCount > 0) {
      const confidence = Math.min(fw.confidence, matchCount / fw.patterns.length);
      suggestions.push({
        tag: fw.framework,
        confidence,
        category: 'framework',
        reason: `检测到 ${matchCount} 个 ${fw.framework} 相关特征`
      });
    }
  }
  
  return suggestions;
}

function detectConcepts(content: string): TagSuggestion[] {
  const suggestions: TagSuggestion[] = [];
  
  const conceptPatterns = [
    {
      concept: 'API',
      patterns: ['api', 'rest', 'endpoint', 'http', 'get', 'post', 'put', 'delete'],
      confidence: 0.8
    },
    {
      concept: '数据库',
      patterns: ['database', 'sql', 'mysql', 'postgresql', 'mongodb', 'query'],
      confidence: 0.8
    },
    {
      concept: '算法',
      patterns: ['algorithm', '算法', 'sort', 'search', 'complexity', 'big o'],
      confidence: 0.8
    },
    {
      concept: '数据结构',
      patterns: ['data structure', 'array', 'list', 'tree', 'graph', 'hash'],
      confidence: 0.8
    },
    {
      concept: '前端开发',
      patterns: ['frontend', 'html', 'css', 'dom', 'browser', 'ui', 'ux'],
      confidence: 0.75
    },
    {
      concept: '后端开发',
      patterns: ['backend', 'server', 'database', 'api', 'microservice'],
      confidence: 0.75
    },
    {
      concept: '移动开发',
      patterns: ['mobile', 'ios', 'android', 'react native', 'flutter'],
      confidence: 0.75
    },
    {
      concept: '机器学习',
      patterns: ['machine learning', 'ml', 'ai', 'neural network', 'tensorflow'],
      confidence: 0.8
    },
    {
      concept: '安全',
      patterns: ['security', 'authentication', 'authorization', 'encryption', 'jwt'],
      confidence: 0.8
    },
    {
      concept: '测试',
      patterns: ['test', 'testing', 'unit test', 'integration test', 'jest', 'mocha'],
      confidence: 0.75
    }
  ];
  
  for (const concept of conceptPatterns) {
    const matchCount = concept.patterns.filter(pattern => content.includes(pattern)).length;
    if (matchCount > 0) {
      const confidence = Math.min(concept.confidence, matchCount / concept.patterns.length);
      suggestions.push({
        tag: concept.concept,
        confidence,
        category: 'concept',
        reason: `内容涉及 ${concept.concept} 相关概念`
      });
    }
  }
  
  return suggestions;
}

function assessDifficulty(content: string): TagSuggestion | null {
  const contentLength = content.length;
  const complexityIndicators = [
    'advanced', 'complex', 'optimization', 'performance', 'architecture',
    'design pattern', 'algorithm', 'data structure', 'concurrency', 'async'
  ];
  
  const basicIndicators = [
    'basic', 'introduction', 'getting started', 'hello world', 'tutorial'
  ];
  
  const complexityScore = complexityIndicators.filter(indicator => 
    content.toLowerCase().includes(indicator)
  ).length;
  
  const basicScore = basicIndicators.filter(indicator => 
    content.toLowerCase().includes(indicator)
  ).length;
  
  let difficulty: string;
  let confidence: number;
  let reason: string;
  
  if (basicScore > complexityScore && contentLength < 1000) {
    difficulty = '初级';
    confidence = 0.7;
    reason = '内容包含基础概念且相对简单';
  } else if (complexityScore > 2 || contentLength > 3000) {
    difficulty = '高级';
    confidence = 0.8;
    reason = '内容涉及复杂概念或篇幅较长';
  } else {
    difficulty = '中级';
    confidence = 0.6;
    reason = '基于内容复杂度和长度评估';
  }
  
  return {
    tag: difficulty,
    confidence,
    category: 'difficulty',
    reason
  };
}

function detectDomain(content: string): TagSuggestion[] {
  const suggestions: TagSuggestion[] = [];
  
  const domainPatterns = [
    {
      domain: 'Web开发',
      patterns: ['web', 'html', 'css', 'javascript', 'browser', 'http'],
      confidence: 0.75
    },
    {
      domain: '移动开发',
      patterns: ['mobile', 'app', 'ios', 'android', 'react native', 'flutter'],
      confidence: 0.75
    },
    {
      domain: '数据科学',
      patterns: ['data science', 'pandas', 'numpy', 'matplotlib', 'jupyter'],
      confidence: 0.8
    },
    {
      domain: '人工智能',
      patterns: ['ai', 'machine learning', 'deep learning', 'neural network'],
      confidence: 0.8
    },
    {
      domain: '游戏开发',
      patterns: ['game', 'unity', 'unreal', 'graphics', 'animation'],
      confidence: 0.8
    },
    {
      domain: '系统编程',
      patterns: ['system', 'kernel', 'operating system', 'memory', 'process'],
      confidence: 0.8
    },
    {
      domain: '网络编程',
      patterns: ['network', 'socket', 'tcp', 'udp', 'protocol'],
      confidence: 0.8
    }
  ];
  
  for (const domain of domainPatterns) {
    const matchCount = domain.patterns.filter(pattern => content.includes(pattern)).length;
    if (matchCount > 0) {
      const confidence = Math.min(domain.confidence, matchCount / domain.patterns.length);
      suggestions.push({
        tag: domain.domain,
        confidence,
        category: 'domain',
        reason: `内容属于 ${domain.domain} 领域`
      });
    }
  }
  
  return suggestions;
}