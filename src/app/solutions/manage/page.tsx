'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Solution, SolutionStatus, SolutionCategory } from '@/shared/types/solutions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getStatusText, getStatusColor } from '@/lib/solution-status-workflow';

interface SolutionStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  published: number;
  rejected: number;
  totalRevenue: number;
  totalViews: number;
}

interface FilterOptions {
  category: SolutionCategory | 'all';
  priceRange: 'all' | 'low' | 'medium' | 'high';
  dateRange: 'all' | 'week' | 'month' | 'quarter' | 'year';
  searchQuery: string;
}

interface SortOptions {
  field: 'title' | 'price' | 'createdAt' | 'updatedAt' | 'viewCount' | 'downloadCount';
  direction: 'asc' | 'desc';
}

export default function ManageSolutionsPage() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [stats, setStats] = useState<SolutionStats>({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    published: 0,
    rejected: 0,
    totalRevenue: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    priceRange: 'all',
    dateRange: 'all',
    searchQuery: '',
  });
  const [sort, setSort] = useState<SortOptions>({
    field: 'updatedAt',
    direction: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSolutions();
  }, []);

  const fetchSolutions = async () => {
    try {
      setLoading(true);
      // 模拟API调用
      const mockSolutions: Solution[] = [
        {
          id: '1',
          title: '农业植保无人机解决方案',
          description: '专为农业植保设计的高效无人机系统，支持精准喷洒和智能路径规划。',
          category: SolutionCategory.AGRICULTURE,
          price: 15000,
          version: 1,
          images: ['/images/solutions/agriculture-1.jpg'],
          tags: ['植保', '农业', '精准喷洒'],
          status: SolutionStatus.PUBLISHED,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          creatorId: 'user-1',
          creatorName: '张工程师',
          rating: 4.8,
          reviewCount: 25,
          viewCount: 1250,
          downloadCount: 85,
          specs: {
            '飞行时间': '30分钟',
            '载重': '10L',
            '喷洒宽度': '4米',
            '定位精度': '厘米级',
          },
          bom: [
            { name: '飞控系统', quantity: 1, unitPrice: 2000, supplier: 'DJI', partNumber: 'A3-PRO' },
            { name: '喷洒系统', quantity: 1, unitPrice: 3000, supplier: '大疆农业', partNumber: 'T30-SPRAY' },
          ],
        },
        {
          id: '2',
          title: '安防监控无人机方案',
          description: '适用于安防监控的多旋翼无人机，具备夜视功能和实时传输能力。',
          category: SolutionCategory.SURVEILLANCE,
          price: 8000,
          version: 1,
          images: ['/images/solutions/surveillance-1.jpg'],
          tags: ['安防', '监控', '夜视'],
          status: SolutionStatus.PENDING_REVIEW,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-12'),
          creatorId: 'user-1',
          creatorName: '张工程师',
          rating: 0,
          reviewCount: 0,
          viewCount: 320,
          downloadCount: 0,
          specs: {
            '飞行时间': '45分钟',
            '摄像头': '4K夜视',
            '传输距离': '5公里',
            '抗风等级': '6级',
          },
          bom: [
            { name: '飞控系统', quantity: 1, unitPrice: 1500, supplier: 'Pixhawk', partNumber: 'PX4-V5' },
            { name: '夜视摄像头', quantity: 1, unitPrice: 2500, supplier: 'FLIR', partNumber: 'VUE-PRO' },
          ],
        },
        {
          id: '3',
          title: '物流配送无人机',
          description: '城市物流配送专用无人机，支持自动起降和智能避障。',
          category: SolutionCategory.DELIVERY,
          price: 12000,
          version: 1,
          images: ['/images/solutions/delivery-1.jpg'],
          tags: ['物流', '配送', '自动化'],
          status: SolutionStatus.DRAFT,
          createdAt: new Date('2024-01-08'),
          updatedAt: new Date('2024-01-08'),
          creatorId: 'user-1',
          creatorName: '张工程师',
          rating: 0,
          reviewCount: 0,
          viewCount: 0,
          downloadCount: 0,
          specs: {
            '载重': '5kg',
            '飞行距离': '20公里',
            '定位精度': 'RTK厘米级',
            '避障系统': '全向避障',
          },
          bom: [
            { name: '飞控系统', quantity: 1, unitPrice: 1800, supplier: 'ArduPilot', partNumber: 'CUBE-ORANGE' },
            { name: '货舱系统', quantity: 1, unitPrice: 1200, supplier: '自制', partNumber: 'CARGO-BOX-V2' },
          ],
        },
        {
          id: '4',
          title: '测绘航拍无人机',
          description: '高精度测绘航拍无人机，支持RTK定位和倾斜摄影。',
          category: SolutionCategory.MAPPING,
          price: 25000,
          version: 1,
          images: ['/images/solutions/mapping-1.jpg'],
          tags: ['测绘', '航拍', 'RTK'],
          status: SolutionStatus.PUBLISHED,
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-18'),
          creatorId: 'user-1',
          creatorName: '张工程师',
          rating: 4.9,
          reviewCount: 15,
          viewCount: 890,
          downloadCount: 42,
          specs: {
            '飞行时间': '35分钟',
            '相机': '全画幅',
            '定位精度': 'RTK厘米级',
            '续航': '长续航',
          },
          bom: [
            { name: 'RTK模块', quantity: 1, unitPrice: 3000, supplier: 'u-blox', partNumber: 'ZED-F9P' },
            { name: '全画幅相机', quantity: 1, unitPrice: 8000, supplier: 'Sony', partNumber: 'A7R4' },
          ],
        },
        {
          id: '5',
          title: '巡检检测无人机',
          description: '电力线路巡检专用无人机，配备红外热成像和高清摄像头。',
          category: SolutionCategory.INSPECTION,
          price: 18000,
          version: 1,
          images: ['/images/solutions/inspection-1.jpg'],
          tags: ['巡检', '电力', '热成像'],
          status: SolutionStatus.APPROVED,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-15'),
          creatorId: 'user-1',
          creatorName: '张工程师',
          rating: 4.7,
          reviewCount: 8,
          viewCount: 560,
          downloadCount: 28,
          specs: {
            '飞行时间': '40分钟',
            '热成像': '640x512',
            '变焦': '30倍光学变焦',
            '抗风': '7级抗风',
          },
          bom: [
            { name: '热成像相机', quantity: 1, unitPrice: 5000, supplier: 'FLIR', partNumber: 'VUE-PRO-640' },
            { name: '变焦相机', quantity: 1, unitPrice: 4000, supplier: 'Sony', partNumber: 'FCB-EX1010' },
          ],
        },
      ];

      setSolutions(mockSolutions);

      // 计算统计数据
      const newStats: SolutionStats = {
        total: mockSolutions.length,
        draft: mockSolutions.filter(s => s.status === SolutionStatus.DRAFT).length,
        pending: mockSolutions.filter(s => s.status === SolutionStatus.PENDING_REVIEW).length,
        approved: mockSolutions.filter(s => s.status === SolutionStatus.APPROVED).length,
        published: mockSolutions.filter(s => s.status === SolutionStatus.PUBLISHED).length,
        rejected: mockSolutions.filter(s => s.status === SolutionStatus.REJECTED).length,
        totalRevenue: mockSolutions
          .filter(s => s.status === SolutionStatus.PUBLISHED)
          .reduce((sum, s) => sum + (s.downloadCount || 0) * s.price * 0.7, 0), // 70%分成
        totalViews: mockSolutions.reduce((sum, s) => sum + (s.viewCount || 0), 0),
      };
      setStats(newStats);
    } catch (error) {
      console.error('获取方案列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选和排序逻辑
  const applyFiltersAndSort = (solutions: Solution[]) => {
    let filtered = solutions;

    // 状态筛选
    if (activeTab !== 'all') {
      filtered = filtered.filter(solution => solution.status === activeTab);
    }

    // 分类筛选
    if (filters.category !== 'all') {
      filtered = filtered.filter(solution => solution.category === filters.category);
    }

    // 价格范围筛选
    if (filters.priceRange !== 'all') {
      switch (filters.priceRange) {
        case 'low':
          filtered = filtered.filter(solution => solution.price < 10000);
          break;
        case 'medium':
          filtered = filtered.filter(solution => solution.price >= 10000 && solution.price < 20000);
          break;
        case 'high':
          filtered = filtered.filter(solution => solution.price >= 20000);
          break;
      }
    }

    // 日期范围筛选
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(solution => new Date(solution.updatedAt) >= filterDate);
    }

    // 搜索筛选
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(solution =>
        solution.title.toLowerCase().includes(query) ||
        solution.description.toLowerCase().includes(query) ||
        solution.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any = a[sort.field];
      let bValue: any = b[sort.field];

      if (sort.field === 'createdAt' || sort.field === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filteredSolutions = applyFiltersAndSort(solutions);

  // 批量操作
  const handleSelectAll = () => {
    if (selectedSolutions.length === filteredSolutions.length) {
      setSelectedSolutions([]);
    } else {
      setSelectedSolutions(filteredSolutions.map(s => s.id));
    }
  };

  const handleSelectSolution = (id: string) => {
    setSelectedSolutions(prev =>
      prev.includes(id)
        ? prev.filter(sId => sId !== id)
        : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedSolutions.length === 0) return;
    
    if (confirm(`确定要删除选中的 ${selectedSolutions.length} 个方案吗？此操作不可恢复。`)) {
      try {
        // 模拟API调用
        setSolutions(prev => prev.filter(s => !selectedSolutions.includes(s.id)));
        setSelectedSolutions([]);
        alert('批量删除成功');
      } catch (error) {
        console.error('批量删除失败:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleBatchSubmitForReview = async () => {
    if (selectedSolutions.length === 0) return;
    
    const draftSolutions = selectedSolutions.filter(id => {
      const solution = solutions.find(s => s.id === id);
      return solution?.status === SolutionStatus.DRAFT;
    });

    if (draftSolutions.length === 0) {
      alert('只能提交草稿状态的方案进行审核');
      return;
    }

    try {
      // 模拟API调用
      setSolutions(prev => prev.map(s => 
        draftSolutions.includes(s.id) 
          ? { ...s, status: SolutionStatus.PENDING_REVIEW }
          : s
      ));
      setSelectedSolutions([]);
      alert(`已提交 ${draftSolutions.length} 个方案进行审核`);
    } catch (error) {
      console.error('批量提交审核失败:', error);
      alert('提交失败，请重试');
    }
  };

  const handleBatchArchive = async () => {
    if (selectedSolutions.length === 0) return;
    
    if (confirm(`确定要归档选中的 ${selectedSolutions.length} 个方案吗？`)) {
      try {
        // 模拟API调用
        setSolutions(prev => prev.map(s => 
          selectedSolutions.includes(s.id) 
            ? { ...s, status: SolutionStatus.ARCHIVED }
            : s
        ));
        setSelectedSolutions([]);
        alert('批量归档成功');
      } catch (error) {
        console.error('批量归档失败:', error);
        alert('归档失败，请重试');
      }
    }
  };



  const getCategoryName = (category: SolutionCategory) => {
    const categoryMap = {
      [SolutionCategory.AGRICULTURE]: '农业植保',
      [SolutionCategory.SURVEILLANCE]: '安防监控',
      [SolutionCategory.DELIVERY]: '物流配送',
      [SolutionCategory.MAPPING]: '测绘航拍',
      [SolutionCategory.INSPECTION]: '巡检检测',
      [SolutionCategory.ENTERTAINMENT]: '娱乐竞技',
      [SolutionCategory.RESEARCH]: '科研教育',
      [SolutionCategory.OTHER]: '其他应用',
    };
    return categoryMap[category] || '未知分类';
  };

  const handleDeleteSolution = async (id: string) => {
    if (confirm('确定要删除这个方案吗？此操作不可恢复。')) {
      try {
        // 模拟API调用
        setSolutions(prev => prev.filter(s => s.id !== id));
        alert('方案删除成功');
      } catch (error) {
        console.error('删除方案失败:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      // 模拟API调用
      setSolutions(prev => prev.map(s => 
        s.id === id ? { ...s, status: SolutionStatus.PENDING_REVIEW } : s
      ));
      alert('方案已提交审核');
    } catch (error) {
      console.error('提交审核失败:', error);
      alert('提交失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 面包屑导航 */}
      <div className="bg-white border-b">
        <div className="container py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-blue-600">首页</Link>
            <span>/</span>
            <Link href="/solutions" className="hover:text-blue-600">方案</Link>
            <span>/</span>
            <span className="text-gray-900">我的方案</span>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        {/* 页面标题和操作 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">我的方案</h1>
            <p className="text-gray-600">管理您发布的无人机解决方案</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              筛选
            </Button>
            <Link href="/solutions/create">
              <Button>创建新方案</Button>
            </Link>
          </div>
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 搜索 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">搜索</label>
                  <input
                    type="text"
                    placeholder="搜索方案标题、描述或标签..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 分类筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as SolutionCategory | 'all' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部分类</option>
                    <option value={SolutionCategory.AGRICULTURE}>农业植保</option>
                    <option value={SolutionCategory.SURVEILLANCE}>安防监控</option>
                    <option value={SolutionCategory.DELIVERY}>物流配送</option>
                    <option value={SolutionCategory.MAPPING}>测绘航拍</option>
                    <option value={SolutionCategory.INSPECTION}>巡检检测</option>
                    <option value={SolutionCategory.ENTERTAINMENT}>娱乐竞技</option>
                    <option value={SolutionCategory.RESEARCH}>科研教育</option>
                    <option value={SolutionCategory.OTHER}>其他应用</option>
                  </select>
                </div>

                {/* 价格范围 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">价格范围</label>
                  <select
                    value={filters.priceRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value as FilterOptions['priceRange'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部价格</option>
                    <option value="low">低价位 (&lt;1万)</option>
                    <option value="medium">中价位 (1-2万)</option>
                    <option value="high">高价位 (&gt;2万)</option>
                  </select>
                </div>

                {/* 时间范围 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">更新时间</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as FilterOptions['dateRange'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">全部时间</option>
                    <option value="week">最近一周</option>
                    <option value="month">最近一月</option>
                    <option value="quarter">最近三月</option>
                    <option value="year">最近一年</option>
                  </select>
                </div>
              </div>

              {/* 排序选项 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">排序方式:</label>
                  <select
                    value={sort.field}
                    onChange={(e) => setSort(prev => ({ ...prev, field: e.target.value as SortOptions['field'] }))}
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="updatedAt">更新时间</option>
                    <option value="createdAt">创建时间</option>
                    <option value="title">标题</option>
                    <option value="price">价格</option>
                    <option value="viewCount">浏览量</option>
                    <option value="downloadCount">下载量</option>
                  </select>
                  <select
                    value={sort.direction}
                    onChange={(e) => setSort(prev => ({ ...prev, direction: e.target.value as SortOptions['direction'] }))}
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">降序</option>
                    <option value="asc">升序</option>
                  </select>
                </div>
              </div>

              {/* 重置筛选 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      category: 'all',
                      priceRange: 'all',
                      dateRange: 'all',
                      searchQuery: '',
                    });
                    setSort({
                      field: 'updatedAt',
                      direction: 'desc',
                    });
                  }}
                >
                  重置筛选
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总方案数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总收益</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总浏览量</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">已发布</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 方案列表 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>方案列表 ({filteredSolutions.length})</CardTitle>
              
              {/* 批量操作 */}
              {selectedSolutions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    已选择 {selectedSolutions.length} 项
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchSubmitForReview}
                  >
                    批量提交审核
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchArchive}
                  >
                    批量归档
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    批量删除
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="all">全部 ({stats.total})</TabsTrigger>
                <TabsTrigger value={SolutionStatus.DRAFT}>草稿 ({stats.draft})</TabsTrigger>
                <TabsTrigger value={SolutionStatus.PENDING_REVIEW}>待审核 ({stats.pending})</TabsTrigger>
                <TabsTrigger value={SolutionStatus.APPROVED}>已通过 ({stats.approved})</TabsTrigger>
                <TabsTrigger value={SolutionStatus.PUBLISHED}>已发布 ({stats.published})</TabsTrigger>
                <TabsTrigger value={SolutionStatus.REJECTED}>已拒绝 ({stats.rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {filteredSolutions.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">暂无方案</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filters.searchQuery || filters.category !== 'all' || filters.priceRange !== 'all' || filters.dateRange !== 'all'
                        ? '没有找到符合条件的方案，请调整筛选条件'
                        : '开始创建您的第一个方案吧'
                      }
                    </p>
                    <div className="mt-6">
                      <Link href="/solutions/create">
                        <Button>创建方案</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 全选/取消全选 */}
                    {filteredSolutions.length > 0 && (
                      <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectedSolutions.length === filteredSolutions.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label className="text-sm text-gray-600">
                          全选 ({filteredSolutions.length} 项)
                        </label>
                      </div>
                    )}

                    {filteredSolutions.map(solution => (
                      <div key={solution.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            {/* 选择框 */}
                            <input
                              type="checkbox"
                              checked={selectedSolutions.includes(solution.id)}
                              onChange={() => handleSelectSolution(solution.id)}
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />

                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  <Link href={`/solutions/${solution.id}`} className="hover:text-blue-600">
                                    {solution.title}
                                  </Link>
                                </h3>
                                <Badge className={getStatusColor(solution.status)}>
                                  {getStatusText(solution.status)}
                                </Badge>
                                <Badge variant="outline">
                                  {getCategoryName(solution.category)}
                                </Badge>
                              </div>
                              
                              <p className="text-gray-600 mb-3 line-clamp-2">{solution.description}</p>
                              
                              <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                                <span>价格: {formatCurrency(solution.price)}</span>
                                <span>浏览: {solution.viewCount?.toLocaleString() || 0}</span>
                                <span>下载: {solution.downloadCount?.toLocaleString() || 0}</span>
                                <span>创建: {formatDate(solution.createdAt)}</span>
                                <span>更新: {formatDate(solution.updatedAt)}</span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {solution.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-6">
                            <Link href={`/solutions/${solution.id}/edit`}>
                              <Button variant="outline" size="sm">编辑</Button>
                            </Link>
                            
                            {solution.status === SolutionStatus.DRAFT && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSubmitForReview(solution.id)}
                              >
                                提交审核
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSolution(solution.id)}
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}