import { NextRequest, NextResponse } from 'next/server';

import { RecommendationResult } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      type = 'content', 
      context = {}, 
      limit = 10 
    } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '缺少必要参数：userId' },
        { status: 400 }
      );
    }

    // 生成个性化推荐
    const recommendations = await generateRecommendations(userId, type, context, limit);

    return NextResponse.json(recommendations);

  } catch (error) {
    console.error('推荐生成错误:', error);
    return NextResponse.json(
      { error: '推荐生成失败' },
      { status: 500 }
    );
  }
}

async function generateRecommendations(
  userId: string, 
  type: string, 
  context: any, 
  limit: number
): Promise<RecommendationResult> {
  
  // 获取用户画像
  const userProfile = await getUserProfile(userId);
  
  // 根据推荐类型生成不同的推荐
  let recommendations: any[] = [];
  
  switch (type) {
    case 'content':
      recommendations = await generateContentRecommendations(userProfile, context, limit);
      break;
    case 'learning':
      recommendations = await generateLearningRecommendations(userProfile, context, limit);
      break;
    case 'project':
      recommendations = await generateProjectRecommendations(userProfile, context, limit);
      break;
    case 'social':
      recommendations = await generateSocialRecommendations(userProfile, context, limit);
      break;
    default:
      recommendations = await generateContentRecommendations(userProfile, context, limit);
  }
  
  // 根据推荐类型转换为标准格式
  const result: RecommendationResult = {
    solutions: recommendations.map((rec, index) => ({
      id: rec.id || `rec_${index}`,
      title: rec.title || rec.username || `推荐 ${index + 1}`,
      description: rec.description || rec.reason || '基于您的个人资料推荐',
      relevanceScore: rec.confidence || 0.5,
      difficulty: rec.difficulty || rec.level || 'intermediate',
      tags: rec.tags || rec.skills || rec.expertise || [],
      estimatedTime: rec.estimatedTime || rec.duration || '未知',
      reason: rec.reason || '基于算法推荐'
    })),
    learningPath: [],
    relatedTopics: userProfile.interests || [],
    difficulty: userProfile.skillLevel || 'intermediate'
  };

  return {
    ...result,
    // 添加元数据作为额外属性
    _metadata: {
      algorithm: 'collaborative_filtering_with_content_based',
      confidence: calculateOverallConfidence(recommendations),
      generatedAt: new Date().toISOString(),
      context,
      userId,
      type
    }
  } as RecommendationResult & { _metadata: any };
}

async function getUserProfile(userId: string) {
  // 模拟用户画像数据
  const mockProfiles: Record<string, any> = {
    'user1': {
      interests: ['JavaScript', 'React', 'Node.js', 'Web开发'],
      skillLevel: 'intermediate',
      preferredTopics: ['前端开发', '全栈开发'],
      recentActivity: ['viewed_react_tutorial', 'completed_js_course'],
      learningGoals: ['掌握TypeScript', '学习Next.js'],
      interactionHistory: {
        likes: ['react', 'javascript', 'tutorial'],
        shares: ['best_practices', 'code_review'],
        bookmarks: ['advanced_patterns', 'performance_optimization']
      }
    },
    'user2': {
      interests: ['Python', 'Machine Learning', 'Data Science'],
      skillLevel: 'advanced',
      preferredTopics: ['人工智能', '数据分析'],
      recentActivity: ['completed_ml_project', 'viewed_ai_paper'],
      learningGoals: ['深度学习', 'MLOps'],
      interactionHistory: {
        likes: ['python', 'ml', 'data_science'],
        shares: ['research_papers', 'algorithms'],
        bookmarks: ['neural_networks', 'tensorflow']
      }
    }
  };
  
  return mockProfiles[userId] || {
    interests: ['编程', '技术'],
    skillLevel: 'beginner',
    preferredTopics: ['基础教程'],
    recentActivity: [],
    learningGoals: ['学习编程基础'],
    interactionHistory: { likes: [], shares: [], bookmarks: [] }
  };
}

async function generateContentRecommendations(userProfile: any, context: any, limit: number) {
  const mockContent = [
    {
      id: 'content1',
      title: 'React Hooks 深入解析',
      type: 'article',
      tags: ['React', 'JavaScript', 'Hooks'],
      difficulty: 'intermediate',
      rating: 4.8,
      views: 15420,
      author: 'TechExpert',
      publishedAt: '2024-01-15',
      description: '深入理解 React Hooks 的工作原理和最佳实践'
    },
    {
      id: 'content2',
      title: 'TypeScript 进阶技巧',
      type: 'tutorial',
      tags: ['TypeScript', 'JavaScript', '进阶'],
      difficulty: 'advanced',
      rating: 4.9,
      views: 8930,
      author: 'CodeMaster',
      publishedAt: '2024-01-20',
      description: 'TypeScript 高级特性和实用技巧分享'
    },
    {
      id: 'content3',
      title: 'Next.js 全栈开发指南',
      type: 'course',
      tags: ['Next.js', 'React', '全栈开发'],
      difficulty: 'intermediate',
      rating: 4.7,
      views: 12350,
      author: 'FullStackDev',
      publishedAt: '2024-01-10',
      description: '从零开始学习 Next.js 全栈开发'
    },
    {
      id: 'content4',
      title: 'Python 数据分析实战',
      type: 'project',
      tags: ['Python', '数据分析', 'Pandas'],
      difficulty: 'intermediate',
      rating: 4.6,
      views: 9870,
      author: 'DataScientist',
      publishedAt: '2024-01-25',
      description: '使用 Python 进行数据分析的实战项目'
    },
    {
      id: 'content5',
      title: '机器学习算法详解',
      type: 'article',
      tags: ['机器学习', 'Python', '算法'],
      difficulty: 'advanced',
      rating: 4.9,
      views: 18750,
      author: 'MLExpert',
      publishedAt: '2024-01-18',
      description: '常用机器学习算法的原理和实现'
    }
  ];
  
  // 基于用户兴趣和技能水平进行推荐
  const scored = mockContent.map(content => {
    let score = 0;
    
    // 兴趣匹配度
    const interestMatch = content.tags.filter(tag => 
      userProfile.interests.some((interest: string) => 
        interest.toLowerCase().includes(tag.toLowerCase()) || 
        tag.toLowerCase().includes(interest.toLowerCase())
      )
    ).length;
    score += interestMatch * 30;
    
    // 技能水平匹配
    const skillLevelScore = calculateSkillLevelScore(content.difficulty, userProfile.skillLevel);
    score += skillLevelScore;
    
    // 内容质量分数
    score += content.rating * 10;
    
    // 热度分数
    score += Math.log(content.views) * 2;
    
    // 新鲜度分数
    const daysSincePublished = Math.floor(
      (Date.now() - new Date(content.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.max(0, 30 - daysSincePublished);
    
    return {
      ...content,
      score,
      confidence: Math.min(0.95, score / 100),
      reason: generateRecommendationReason(content, userProfile, interestMatch)
    };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function generateLearningRecommendations(userProfile: any, context: any, limit: number) {
  const mockCourses = [
    {
      id: 'course1',
      title: 'JavaScript 基础到进阶',
      type: 'course',
      level: 'beginner_to_intermediate',
      duration: '40小时',
      modules: 12,
      rating: 4.8,
      students: 25000,
      instructor: 'JS专家',
      skills: ['JavaScript', 'ES6+', 'DOM操作', '异步编程'],
      prerequisites: ['HTML基础', 'CSS基础']
    },
    {
      id: 'course2',
      title: 'React 开发实战',
      type: 'course',
      level: 'intermediate',
      duration: '30小时',
      modules: 10,
      rating: 4.9,
      students: 18500,
      instructor: 'React大师',
      skills: ['React', 'Hooks', '状态管理', '组件设计'],
      prerequisites: ['JavaScript基础', 'ES6语法']
    },
    {
      id: 'course3',
      title: 'Python 数据科学入门',
      type: 'course',
      level: 'beginner',
      duration: '35小时',
      modules: 14,
      rating: 4.7,
      students: 32000,
      instructor: '数据科学家',
      skills: ['Python', 'NumPy', 'Pandas', '数据可视化'],
      prerequisites: ['编程基础']
    }
  ];
  
  const scored = mockCourses.map(course => {
    let score = 0;
    
    // 学习目标匹配
    const goalMatch = userProfile.learningGoals.filter((goal: string) =>
      course.skills.some(skill => 
        goal.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(goal.toLowerCase())
      )
    ).length;
    score += goalMatch * 40;
    
    // 技能水平匹配
    const levelScore = calculateCourseLevelScore(course.level, userProfile.skillLevel);
    score += levelScore;
    
    // 课程质量
    score += course.rating * 8;
    
    // 受欢迎程度
    score += Math.log(course.students) * 3;
    
    return {
      ...course,
      score,
      confidence: Math.min(0.9, score / 120),
      reason: `基于您的学习目标和技能水平推荐`
    };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function generateProjectRecommendations(userProfile: any, context: any, limit: number) {
  const mockProjects = [
    {
      id: 'project1',
      title: '个人博客系统',
      type: 'web_project',
      difficulty: 'intermediate',
      estimatedTime: '2-3周',
      technologies: ['React', 'Node.js', 'MongoDB'],
      skills: ['前端开发', '后端开发', '数据库设计'],
      description: '使用现代技术栈构建个人博客系统',
      features: ['用户认证', '文章管理', '评论系统', '搜索功能']
    },
    {
      id: 'project2',
      title: '数据可视化仪表板',
      type: 'data_project',
      difficulty: 'intermediate',
      estimatedTime: '1-2周',
      technologies: ['Python', 'Dash', 'Plotly', 'Pandas'],
      skills: ['数据分析', '数据可视化', 'Web开发'],
      description: '创建交互式数据可视化仪表板',
      features: ['实时数据更新', '多种图表类型', '数据过滤', '导出功能']
    },
    {
      id: 'project3',
      title: '移动端待办事项应用',
      type: 'mobile_project',
      difficulty: 'beginner',
      estimatedTime: '1周',
      technologies: ['React Native', 'AsyncStorage'],
      skills: ['移动开发', 'UI设计', '状态管理'],
      description: '开发跨平台的待办事项管理应用',
      features: ['任务管理', '分类标签', '提醒功能', '数据同步']
    }
  ];
  
  const scored = mockProjects.map(project => {
    let score = 0;
    
    // 技术栈匹配
    const techMatch = project.technologies.filter(tech =>
      userProfile.interests.some((interest: string) =>
        interest.toLowerCase().includes(tech.toLowerCase()) ||
        tech.toLowerCase().includes(interest.toLowerCase())
      )
    ).length;
    score += techMatch * 25;
    
    // 难度匹配
    const difficultyScore = calculateSkillLevelScore(project.difficulty, userProfile.skillLevel);
    score += difficultyScore;
    
    // 技能发展潜力
    const skillDevelopment = project.skills.filter(skill =>
      !userProfile.interests.includes(skill)
    ).length;
    score += skillDevelopment * 10;
    
    return {
      ...project,
      score,
      confidence: Math.min(0.85, score / 100),
      reason: `基于您的技术兴趣和技能水平推荐的实践项目`
    };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function generateSocialRecommendations(userProfile: any, context: any, limit: number) {
  const mockUsers = [
    {
      id: 'user_rec1',
      username: 'ReactMaster',
      type: 'expert',
      expertise: ['React', 'JavaScript', 'Frontend'],
      followers: 15000,
      posts: 250,
      engagement: 4.2,
      commonInterests: ['React', 'JavaScript'],
      reason: '在React领域的专家，分享高质量内容'
    },
    {
      id: 'user_rec2',
      username: 'FullStackDev',
      type: 'peer',
      expertise: ['Node.js', 'React', 'MongoDB'],
      followers: 3500,
      posts: 120,
      engagement: 3.8,
      commonInterests: ['Node.js', 'Web开发'],
      reason: '与您技能水平相近的全栈开发者'
    },
    {
      id: 'user_rec3',
      username: 'CodeNewbie',
      type: 'mentee',
      expertise: ['HTML', 'CSS', 'JavaScript'],
      followers: 500,
      posts: 45,
      engagement: 4.5,
      commonInterests: ['JavaScript'],
      reason: '可以通过指导获得成就感的新手开发者'
    }
  ];
  
  const scored = mockUsers.map(user => {
    let score = 0;
    
    // 共同兴趣
    score += user.commonInterests.length * 20;
    
    // 用户类型匹配
    if (user.type === 'expert' && userProfile.skillLevel !== 'advanced') {
      score += 30; // 学习机会
    } else if (user.type === 'peer') {
      score += 25; // 同伴交流
    } else if (user.type === 'mentee' && userProfile.skillLevel !== 'beginner') {
      score += 15; // 指导机会
    }
    
    // 活跃度
    score += user.engagement * 5;
    
    return {
      ...user,
      score,
      confidence: Math.min(0.8, score / 100)
    };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function calculateSkillLevelScore(contentDifficulty: string, userSkillLevel: string): number {
  const difficultyMap: Record<string, number> = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3
  };
  
  const contentLevel = difficultyMap[contentDifficulty] || 2;
  const userLevel = difficultyMap[userSkillLevel] || 1;
  
  // 最佳匹配是内容难度略高于用户水平
  const diff = contentLevel - userLevel;
  
  if (diff === 0) return 25; // 完全匹配
  if (diff === 1) return 30; // 略有挑战，最佳
  if (diff === -1) return 20; // 略简单
  if (diff === 2) return 10; // 太难
  if (diff === -2) return 5; // 太简单
  
  return 0;
}

function calculateCourseLevelScore(courseLevel: string, userSkillLevel: string): number {
  if (courseLevel.includes('beginner') && userSkillLevel === 'beginner') return 30;
  if (courseLevel.includes('intermediate') && userSkillLevel === 'intermediate') return 30;
  if (courseLevel.includes('advanced') && userSkillLevel === 'advanced') return 30;
  if (courseLevel.includes('beginner_to_intermediate')) return 25;
  
  return 15;
}

function generateRecommendationReason(content: any, userProfile: any, interestMatch: number): string {
  const reasons = [];
  
  if (interestMatch > 0) {
    reasons.push(`与您的兴趣 ${userProfile.interests.slice(0, 2).join('、')} 相关`);
  }
  
  if (content.rating >= 4.5) {
    reasons.push('高质量内容');
  }
  
  if (content.views > 10000) {
    reasons.push('热门内容');
  }
  
  return reasons.join('，') || '基于您的个人资料推荐';
}

function calculateOverallConfidence(recommendations: any[]): number {
  if (recommendations.length === 0) return 0;
  
  const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length;
  return Math.round(avgConfidence * 100) / 100;
}