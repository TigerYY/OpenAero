import { NextRequest, NextResponse } from 'next/server';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'category' | 'tag' | 'author';
  count?: number;
}

// 模拟搜索建议数据
const mockSuggestions: SearchSuggestion[] = [
  // 查询建议
  { id: '1', text: 'React 组件库', type: 'query', count: 1250 },
  { id: '2', text: 'Vue.js 项目模板', type: 'query', count: 890 },
  { id: '3', text: 'Node.js API 开发', type: 'query', count: 756 },
  { id: '4', text: 'TypeScript 配置', type: 'query', count: 634 },
  { id: '5', text: 'Next.js 全栈应用', type: 'query', count: 523 },
  { id: '6', text: 'Python 数据分析', type: 'query', count: 445 },
  { id: '7', text: 'Docker 容器化', type: 'query', count: 389 },
  { id: '8', text: 'GraphQL API', type: 'query', count: 312 },
  { id: '9', text: 'MongoDB 数据库', type: 'query', count: 278 },
  { id: '10', text: 'AWS 云服务', type: 'query', count: 234 },

  // 分类建议
  { id: '11', text: 'React', type: 'category', count: 2340 },
  { id: '12', text: 'Vue.js', type: 'category', count: 1890 },
  { id: '13', text: 'Node.js', type: 'category', count: 1567 },
  { id: '14', text: 'Python', type: 'category', count: 1234 },
  { id: '15', text: 'UI 设计', type: 'category', count: 987 },
  { id: '16', text: '移动开发', type: 'category', count: 756 },
  { id: '17', text: '后端开发', type: 'category', count: 654 },
  { id: '18', text: 'DevOps', type: 'category', count: 432 },

  // 标签建议
  { id: '19', text: '开源', type: 'tag', count: 3456 },
  { id: '20', text: '商业', type: 'tag', count: 2345 },
  { id: '21', text: '教程', type: 'tag', count: 1987 },
  { id: '22', text: '工具', type: 'tag', count: 1654 },
  { id: '23', text: '框架', type: 'tag', count: 1432 },
  { id: '24', text: '库', type: 'tag', count: 1234 },
  { id: '25', text: '模板', type: 'tag', count: 987 },
  { id: '26', text: '插件', type: 'tag', count: 765 },

  // 作者建议
  { id: '27', text: 'TechMaster', type: 'author', count: 45 },
  { id: '28', text: 'CodeWizard', type: 'author', count: 38 },
  { id: '29', text: 'DevExpert', type: 'author', count: 32 },
  { id: '30', text: 'UIDesigner', type: 'author', count: 28 },
  { id: '31', text: 'FullStackDev', type: 'author', count: 25 },
  { id: '32', text: 'DataScientist', type: 'author', count: 22 },
  { id: '33', text: 'CloudArchitect', type: 'author', count: 19 },
  { id: '34', text: 'MobileExpert', type: 'author', count: 16 }
];

// 热门搜索关键词
const trendingQueries = [
  'React Hooks',
  'Vue 3 Composition API',
  'Next.js 13',
  'TypeScript 最佳实践',
  'Tailwind CSS',
  'GraphQL',
  'Docker',
  'Kubernetes',
  'AWS Lambda',
  '微服务架构'
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') as 'query' | 'category' | 'tag' | 'author' | undefined;

    if (!query) {
      // 如果没有查询词，返回热门搜索
      const trending = trendingQueries.slice(0, limit).map((text, index) => ({
        id: `trending-${index}`,
        text,
        type: 'query' as const,
        count: Math.floor(Math.random() * 1000) + 100
      }));

      return NextResponse.json({
        suggestions: trending,
        trending: true
      });
    }

    // 过滤建议
    let filteredSuggestions = mockSuggestions.filter(suggestion => {
      const matchesQuery = suggestion.text.toLowerCase().includes(query);
      const matchesType = !type || suggestion.type === type;
      return matchesQuery && matchesType;
    });

    // 按相关度和热度排序
    filteredSuggestions = filteredSuggestions.sort((a, b) => {
      // 优先显示完全匹配的结果
      const aExactMatch = a.text.toLowerCase() === query;
      const bExactMatch = b.text.toLowerCase() === query;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 然后按开头匹配排序
      const aStartsWithQuery = a.text.toLowerCase().startsWith(query);
      const bStartsWithQuery = b.text.toLowerCase().startsWith(query);
      
      if (aStartsWithQuery && !bStartsWithQuery) return -1;
      if (!aStartsWithQuery && bStartsWithQuery) return 1;

      // 最后按热度排序
      return (b.count || 0) - (a.count || 0);
    });

    // 限制结果数量
    filteredSuggestions = filteredSuggestions.slice(0, limit);

    // 添加一些智能建议
    const smartSuggestions: SearchSuggestion[] = [];
    
    // 如果查询包含技术栈名称，建议相关的组合
    const techStacks = ['react', 'vue', 'angular', 'node', 'python', 'java', 'go'];
    const matchedTech = techStacks.find(tech => query.includes(tech));
    
    if (matchedTech && filteredSuggestions.length < limit) {
      const combinations = [
        `${matchedTech} 最佳实践`,
        `${matchedTech} 项目模板`,
        `${matchedTech} 开发工具`,
        `${matchedTech} 性能优化`
      ];
      
      combinations.forEach((text, index) => {
        if (filteredSuggestions.length + smartSuggestions.length < limit) {
          smartSuggestions.push({
            id: `smart-${index}`,
            text,
            type: 'query',
            count: Math.floor(Math.random() * 500) + 50
          });
        }
      });
    }

    const allSuggestions = [...filteredSuggestions, ...smartSuggestions];

    return NextResponse.json({
      suggestions: allSuggestions,
      query,
      total: allSuggestions.length
    });

  } catch (error) {
    console.error('获取搜索建议失败:', error);
    return NextResponse.json(
      { error: '获取搜索建议失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, type = 'query' } = body;

    if (!query) {
      return NextResponse.json(
        { error: '查询词不能为空' },
        { status: 400 }
      );
    }

    // 记录搜索行为（实际应用中应该存储到数据库）
    console.log('记录搜索行为:', { query, type, timestamp: new Date() });

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: '搜索行为已记录'
    });

  } catch (error) {
    console.error('记录搜索行为失败:', error);
    return NextResponse.json(
      { error: '记录搜索行为失败' },
      { status: 500 }
    );
  }
}